#! /usr/bin/env node


console.log(`
  *************************************************************
  xp117-pdf-files-directory.js
  for jpc-catalogs => catalog is a set of sections (pdf-files)
  *************************************************************
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
const instance_name = argv._[0];

if (!instance_name) {
  console.log(`
    *****************************************
    FATAL: You must specify an instance-name
    ex: "u2018_fr", "giga_en", etc...
    *****************************************
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
  console.dir('Closing connection - Exit: AFTER FAIL.');
})


async function main() {
  const {db} = await api.connect({pg_monitor});
  //await api.select_app_instance('jpc-catalogs');

  await db.query(`
    select * from cms.app_instances where instance_name = $1;
    `, [instance_name], {single:false})
  .then(apps =>{
    if (apps.length == 1) {
      app = apps[0]; // global.
      verbose && console.log(`found app:`,app)
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })

  /***********************************************
      HERE: app has {package_id, app-folder}
      ATTENTION TO: path:''+(ipath||'')
  ************************************************/

  const pdf_files = await db.query(`
    select
      revision_id,
      object_type,
      nls_language, path, name,
      item_id, parent_id, latest_revision,
      title, package_id, context_id, content_type,
      data
    from cms.sections_pdf
    where (package_id = $(package_id))
    and (path <@ $(path)::ltree)
    order by path;
  `,
  {package_id:app.package_id, path:''+(ipath||'')}, {single:false})
  .then(files =>{
    console.log(`> found ${files.length} sections-pdf w/path:${ipath}`)
    return files;
  });


  for (let it of pdf_files) {
    const {revision_id, item_id, path, name, h2, url, object_type, data} = it;
//    console.log(`${object_type}[${revision_id}:${item_id}] ${path} (${data.h2})`)
    console.log(`[${revision_id}:${item_id}] ${path} (${data.h2})`)
  } // each catalog.

  console.log(`> found ${pdf_files.length} sections-pdf.`)
  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
