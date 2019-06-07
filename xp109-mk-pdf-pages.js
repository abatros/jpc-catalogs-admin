#! /usr/bin/env node


console.log(`
  ******************************************************
  xp-109-mk-pdf-pages.js
  using pdfjsLib, extract pages and commit each of them.
  ATTENTION: nls_language => conversion txt.lang mydatabase=# \dF
  ******************************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
//var find = require('find');
var find = require('find-promise');
const pdfjsLib = require('pdfjs-dist');

const api = require('./lib/openacs-api')
const {_assert, xnor_name} = require('./lib/openacs-api');

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('p','ipath')
  .alias('f','force_refresh')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    force_refresh: {
      default:false,
      type:'boolean'
    }
  })
  .options({
    'pg-monitor': {default:false},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);
const {ipath, force_refresh} = argv;
const e_path = argv._[0];

if (!e_path) {
  console.log(`
    *********************************
    FATAL: You must specify
    an edition ex: "u2018_fr"
    a volume ex: "u2018_en.7"
    or a section ex; "u2018_en.7.3"
    *********************************
    `);
  process.exit(-1)
}

console.dir(`Connect database - switching async mode.`)

main()
.then(async ()=>{
})
.catch((err)=>{
  console.log('fatal error in main - err:',err);
  api.close_connection()
  console.dir('Closing connection - Exit: FAILED.');
})


async function main() {
  const {db} = await api.connect({pg_monitor});
  //await api.select_app_instance('jpc-catalogs');

  await db.query(`
    select * from cms.app_instances where instance_name = $1;
    `, ['jpc-catalogs'], {single:false})
  .then(apps =>{
    if (apps.length == 1) {
      app = apps[0]; // global.
      verbose && console.log(`found app:`,app)
      app.db = db;
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })


  /***********************************************
      HERE: app has {package_id, app-folder}
  ************************************************/

  const sections_pdf = await db.query(`
    select
      revision_id,
      object_type,
      nls_language, path, name,
      item_id, parent_id, latest_revision,
      title, package_id, context_id, content_type,
      data
    from cms.sections_pdf
    where (package_id = $(package_id))
    and (path <@ $(e_path))
    --order by item_id desc limit 3000
    ;
  `, {package_id:app.package_id, e_path}, {single:false})
  .then(cats =>{
    console.log(`> found ${cats.length} extlinks in app:`,app.instance_name)
    return cats;
  });


  let not_found =0, txt_count =0;
  for (let s of sections_pdf) {
    const {revision_id, item_id, path, data, nls_language} = s;
    const {url, fsize, timeStamp} = data;
    _assert(url, s, "Missing url");

    if ((ipath) && (path != ipath)) continue;
    const fn = await locate_pdf_file(url);
    if (!fn) {
      verbose && console.log(`ALERT - Unable to locate file url:${url}`)
      continue;
    }

    /***************************************************
    DETECT {lang,...}
    split fn
    ****************************************************/

    /*
      DO NOT ADD TXT if fsize and timeStamp are unchanged.
      BUT WHO and when {fsize,timeStamp} updated ?
      -> after pdf-scan pages.
    */
    //console.log(fn)

    const {size, mtime} = fs.lstatSync(fn);

//    console.log(`files[0]:`,files[0]);
//    console.log(`fsize: (${fsize})=>(${size})`);
//    console.log(`mtime: (${mtime})=>(${mtime.getTime()})`);
//    console.log(`timeStamp: (${timeStamp})=>(${mtime}) ~~ ${new Date(mtime)}~~${new Date(timeStamp)}`);



    if (
      (!force_refresh) && (+fsize == +size) && (+timeStamp == mtime.getTime())
    ) {
      console.log(`-- section-pdf ${path} is UPTODATE  {fsize:${fsize},timeStamp:${timeStamp}} <${fn}>`);
      continue;
    } else {
      if (verbose >0) {
        console.log(`CHANGED fsize: ${fsize} <> ${size}`);
        console.log(`CHANGED timeStamp: ${timeStamp} <> ${mtime.getTime()}`);
      }
    }


    /*********************************************************

    FIRST: remove old TXT for this pdf-file.

    **********************************************************/

    await db.query(`
      delete from txt
      where object_id = $1
      `, [item_id], {single:true});



    /******************************************************

        NEXT: scan the pdf, and insert TXT/pdf-pages.

    *******************************************************/

    const doc = await pdfjsLib.getDocument(fn);
    verbose && console.log(`found ${doc.numPages} pages for <${fn}>`);

    //if (ix >=0) break;


    _assert(item_id, s, "Missing section-pdf::item_id@155")

    for (let pageno=1; pageno <=doc.numPages; pageno++) {
      const page = await doc.getPage(pageno);
      const textContent = await page.getTextContent();
      const raw_text = textContent.items
        .map(it => it.str).join(' ')
        .replace(/\s+/g,' ')
        .replace(/\.\.+/g,'.');

      if (!raw_text || raw_text.length <=0) continue;
      verbose && console.log(`---- pageno:${pageno}`)

      /****************************************************************
          Create a TXT record => cr_revision = cr_item.latest_revision
       ****************************************************************/
//continue; // dry-run

      await db.query(`
      insert into txt (object_id, lang, data) values ($1,$2,$3) returning object_id;
      `,[
        item_id,
        to_pg_lang(nls_language),
        {url, pageno, raw_text}
        ],{single:true})
       .then((retv)=>{
         verbose && console.log('insert into txt =>retv:',retv)
         return retv
       }) // then

    } // each pdf-page


    /***********************************************************
        When everything deleted, update {fsize,timeStamp}
        We are updating a revision....!!! bizarre.
        We should never update a revision!
    ***********************************************************/

    //console.log('data1>', data)

    Object.assign(data, {
      fsize: +size,
      timeStamp: +mtime.getTime()
    })

    //console.log('data2>', data)

    await db.query(`
      update cr_revisions
      set data = $1
      where revision_id = $2
      returning revision_id;
      `, [data, revision_id], {single:true})
    .then(retv =>{
      console.log(`section-pdf ${path} UPDATED {fsize,timeStamp} retv:`,retv);
    })

    /************************************************
    ALSO: update cr_item.path if needed.
    *************************************************/


  } // each section-pdf.

  console.log(`files-not-found : ${not_found}:${sections_pdf.length}`)
  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------

//"developing and deploying a LIFF App is no magic. But using DDP in a LIFF App,

async function locate_pdf_file(url) {
  if (fs.existsSync(url)) return url;
  if (fs.existsSync(url+'.pdf')) return url+'.pdf';

  url = url+'.pdf';
  const regex = new RegExp(url)
//    const files = await find.file(regex,'/media/dkz/Seagate/2019-museum-assets');
  const files = await find.file(regex,'/home/dkz/2019/jpc-catalogs-admin/pdf-20190517');

  if (files.length <=0) {
    console.log(`ALERT: no files match for:`,url)
    //console.log(`ALERT:`,extlink)
    return null
  }
  if (files.length >1) {
    console.log('ALERT: multiple matches for:',url)
    console.log(files)
    throw 'ALERT: multiple matches for:'+url
    return null;
  }

return files[0];
}

// ---------------------------------------------------------------------------

function to_pg_lang(nls_language) {
  switch(nls_language) {
    case 'fr': return 'french';
    case 'en': return 'english';
    default:
      throw 'INVALID PG-LANGUAGE'
  }
}
