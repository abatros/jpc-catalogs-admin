#! /usr/bin/env node


console.log(`
  ******************************************************
  xp112-drop-a-section.js
  - i.path ~~ section ~~ pdf-file (jpc-catalogs)
    ex: -p 2.3 => delete a section
    ex: -p 2   => delete a catalog.
  - for each TXT
    - if i.path match, delete TXT
  ******************************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
//var find = require('find');
//var find = require('find-promise');
//const pdfjsLib = require('pdfjs-dist');

const api = require('./lib/openacs-api')
const {_assert} = require('./lib/openacs-api');

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('p','ipath')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:false},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);
const {ipath} = argv;

if (!ipath) {
  console.log(`
    FATAL Missing ipath
    Must specify a path : -p 2.3 or --ipath 2.3
    `)
    process.exit(-1)
}

console.dir(`Connect database - switching async mode.`)

main()
.then(async ()=>{
})
.catch((err)=>{
  console.log('fatal error in main - err:',err);
  api.close_connection()
  console.dir('Closing connection - Exit: AFTER FAIL.');
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
      //verbose &&
      console.log(`found app:`,app)
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })

  /***********************************************
      HERE: app has {package_id, app-folder}
  ************************************************/

  /*****************************************************
  The following remove the TXT records NOT the section

  await db.query(`
    with deleted as
    (delete
    from txt
    using cms.extlinks i
    where (txt.object_id = i.item_id)
    and (i.parent_id = $1)
    and (i.path = $2)
    returning *)
    select count(*) from selected;
    `,[app.folder_id, ''+ipath],{single:true})
  .then(retv =>{
    console.log(`delete from txt =>`,retv)
  })

  ******************************************************/

  await db.query(`
    with deleted as (
      delete
      from acs_objects o
      using cms.extlinks i
      where (i.item_id = o.object_id)
      and (i.parent_id = $1)
      and (i.path = $2)
      returning object_id
    )
    select count(*) from deleted;
    `, [app.folder_id, ''+ipath], {single:true})
  .then(retv =>{
    console.log(`delete from cr_items =>`,retv)
  })




  const pages = await db.query(`
    select
      i.item_id,
      i.parent_id,
      i.package_id,
      i.path,
      i.content_type,
      i.object_type,
      --txt.fti,
      --txt.data->>'raw_text' as raw_text,
      (txt.data->>'pageno')::integer as pageno,
      txt.lang,
      txt.data->>'url' as url
    from txt
    join cms.extlinks i on (i.item_id = txt.object_id)
--    where (i.package_id = $1)
    where (i.parent_id = $1)
    and (i.path = $2)
    order by item_id, pageno;
  `, [app.folder_id, ''+ipath], {single:false})
  .then(pages =>{
    console.log(`> found ${pages.length} pages.`)
    return pages;
  });


  let not_found =0, txt_count =0;
  for (let ix=0; ix<pages.length; ix++) {
    const page = pages[ix];
    const {item_id, parent_id, package_id, pageno, url, path, fti, raw_text, lang, content_type, object_type} = pages[ix];
    console.log(`[${item_id}:${parent_id}:${package_id}] [${lang}]::(${path}) <${url}>::${pageno}`)
    if (verbose>2) {
      console.log(`--fti:${fti}`)
      console.log(`--raw-text:${raw_text}`)
    }
  } // each catalog.

  console.log(`> found ${pages.length} pdf-pages.`)
  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
