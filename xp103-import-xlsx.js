#! /usr/bin/env node


console.log(`
  **********************************************
  xp103-import-xlsx.js
  - convert to yaml/sequential.
  - create extlinks for each catalog (pdf-file)
  **********************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

const api = require('./lib/openacs-api')
//console.log('api:',api)


const {_assert, fatal_error} = require('./lib/openacs-api');
const xlsx_fn = '1 Ultimheat commercial test 2019.xlsx';


const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:true},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);

const xlsx = require('./lib/xlsx2json.js')(xlsx_fn); // an array.
console.log(`1. xlsx file contains ${xlsx.length} rows (catalogs)`);


const {alerts} = require('./lib/reformat.js')(xlsx);
console.log(`2. reformat reporting ${alerts.length} errors:`);
alerts.forEach(it=>console.log(it))

/*

    VALIDATION:
    Extract publisher: only 1.
    "icat",             // A
    "isec",             // B
    "publisherName",    // C
    "pic",              // D - jpeg
    "lang",             // E
    "h1",               // F
    'h2',               // G
    "pages",           // H
    'yp',               // I - date d'edition
    'pdf',              // J - fileName
    'npages'            // K


*/

let edition =null;
let _icat =null;
let _isec =null;
let err_Count =0;
const yaml = [`#xp103-import ${xlsx_fn}\n---`];

xlsx.forEach((it,ix) =>{
  const {icat, isec, publisherName:publisher} = it;
  let {yp, lang} = it;
  yp = 2000-100+yp.getYear();
  lang = lang.replace('French','fr')
  //console.log(`ix:${ix} @${icat}.${isec} yp:${_yp} =>`,yp)
  if (!edition) {
    edition = {publisher, yp, lang, name:`u${yp}-${lang}`}
    yaml.push(`- edition: ${edition.name}\n  lang: ${lang}\n  yp: ${yp}\n  publisher: ${edition.publisher}\n`);
  }
  else {
    if (edition.publisher != it.publisherName) {
      err_Count +=1;
      console.log(`ALERT row:${ix} Invalid publisherNamme:(${it.publisherName})`)
    }
    /**
    if (edition.lang != it.lang) {
      err_Count +=1;
      console.log(`ALERT row:${ix} Invalid lang:(${it.lang})`)
    }
    if (edition.yp != it.yp) {
      err_Count +=1;
      console.log(`ALERT row:${ix} Invalid lang:(${it.yp})`)
    }
    **/
  }
  if (icat != _icat) {
    _icat = icat;
    _isec = null;
    const {pic, h1} = it;
    yaml.push(`- h1: ${h1}\n  path: ${icat} \n  lang: ${lang}\n  pic: ${pic}\n`);
  }

  if (_isec != isec) {
    _isec = isec;
    const {pic, h2, pdf:url} = it;
    yaml.push(`- h2: ${h2}\n  path: ${icat}.${isec}\n  lang: ${lang}\n  pic: ${pic}\n  url: ${url}\n`)
  }

})

if (err_Count >0) {
  console.log(`found ${err_Count} EXIT.`)
  process.exit(-1);
}

//console.log(yaml.join('\n'))

fs.writeFileSync(xlsx_fn.replace('.xlsx','.yaml'), yaml.join('\n'));

//const publishers = Object.keys(_hp)

//console.log(`3. found ${publishers.length} publishers.`)

process.exit(-1)


/*
    Create GRAPH (indexes)
    constructeurs =>[catalogues]*
    s3publisher => [articles/s3]* (with s4 also)
*/


console.log(`4. Connect database - switching async mode.`)


main()
.then(async ()=>{
})
.catch((err)=>{
  console.log('fatal error in main - err:',err);
  api.close_connection()
  console.dir('Closing connection - Exit: FAILED.')
})


async function main() {
  const {db} = await api.connect({pg_monitor});
  if (!db) throw "Unable to connect."
  else {
    console.log(`5. Connected to openacs.`)
  }


  await db.query(`
    select * from cms.app_instances where instance_name = $1;
    `, ['jpc-catalogs'], {single:false})
  .then(apps =>{
    if (apps.length == 1) {
      app = apps[0]; // global.
      verbose && console.log(`found app:`,app)
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })


  /****************************************
      Get all publishers and populate _hp
  *****************************************/

  await db.query(`
    select *
    from cms.revisions_latest
    where parent_id = $1
    and object_type = 'cms-publisher'
    `, [
      app.folder_id
    ], {single:false})
  .then(publishers =>{
    console.log(`from DATABASE publishers =>`, publishers);
    publishers.forEach(p =>{
      if (_hp[p.name] === 0) {
        // this publisher was found in xlsx
        _hp[p.name] = p.item_id;
      }
    })
  })

  /******************************************
    Report existing publishers
  *******************************************/


  for (let ix=0; ix<publishers.length; ix++) {
    const pName = publishers[ix];
    if (_hp[pName] === 0) {
      verbose && console.log(`this publisher (${pName}) is not yet in the database.`);
//      throw 'insert-publisher@137'
      await api.commit_revision({
        package_id: app.package_id,
        parent_id: app.folder_id,
        name: pName,
        item_subtype: 'cms-publisher',
        path: 'p'
      }).then(retv =>{
        console.log('commit_revision =>',retv)
      })
    } else {
      verbose && console.log(`this publisher (${pName}) is already in the database.`);
      continue;
    }
  }


  /*************************
  loop on articles/catalogs
  *************************/

  verbose && console.log(`loop on articles/catalogs found in new xlsx => create extlinks with DATA`);

  _assert(app.folder_id, app,"Missing app_folder => article.parent_id");
  _assert(app.package_id, app,"Missing package_id => article.package_id");
  _assert(Number.isInteger(app.folder_id), app, 'Invalid parent_id')

  const ixMax = xlsx.length;
  for (let ix=0; ix < ixMax; ix++) {
    const a = xlsx[ix];
    const {path, pic, lang, h1, h2, pdf:url, npages, publisherName, yp} = xlsx[ix];

    _assert(path, a, 'Missing article.path @166')

//    console.log('a1>',a);

    Object.assign(a, {
      parent_id: app.folder_id,
      package_id: app.package_id,
      name: `cat-${path}`,
      title: `cat-${path}`,
      url,
      content_type: 'content_revision',
      item_subtype: 'cms-article',
      json_data: {
        pic, h1, h2, url, npages, publisherName, yp
      }
    });

    _assert(a.path, a, 'Missing article.path @166')

    verbose && console.log('a2>',a);

    const retv = await api.commit_extlink(a, {verbose})
    .then(async retv =>{
      const {error, item_id, retCode} = retv;
      // if committed, (item_id !=0)
      if (!item_id) {
        console.log(`alert -- extlink not committed error:`,error);
      } else {
        if (retCode) {
          console.log(`api.commit_extlink(item_id:${item_id}, path:${path}).retCode: `,retCode)
        }
      }
      return retv;
    })
    .catch(err =>{
      // this is really an error.
      console.log(`err@198 : `,err);
      throw 'FATAL@192'
    })


  } // each article in _xlsx


  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}



// -------------------------------------------------------------------------
