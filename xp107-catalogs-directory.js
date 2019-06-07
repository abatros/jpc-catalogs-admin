#! /usr/bin/env node


console.log(`
  *************************************************************
  xp107-catalogs-directory.js
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

check_password()

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:false},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);

const {pg_iname:instance_name} = process.env;
_assert(instance_name, process.env, "Missing Instance Name (export pg_iname)")

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
      //verbose &&
      console.log(`found app:`,app)
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })

  const {package_id, folder_id:app_folder} = app; // global variable.

  /***********************************************
      HERE: app has {package_id, app-folder}
  ************************************************/

  const catalogs = await db.query(`
    -- catalogs lookup.
  select
    item_id,
    revision_id,
    object_type,
    path,
    name,
    data->>'h1' as h1, data
  from cms.revisions_latest
  where
      (parent_id = $(app_folder))
      -- (package_id = $(package_id))
  and (object_type = 'volume-cat')
  order by path, name
  `,{app_folder,package_id}, {single:false})
  .then(cats =>{
    console.log(`> found ${cats.length} catalogs.`)
    return cats;
  });


  /********************************************
    Catalogs are direct children in app_folder
  *********************************************/
  for (let cat of catalogs) {
    const {item_id, revision_id, name, path:ipath, h1, data, object_type} = cat;
    console.log(`${object_type}[${item_id}:${revision_id}] @(${ipath}) ${name} (${h1})`)
  }


/*
  let not_found =0, txt_count =0;
  for (let ix=0; ix<catalogs.length; ix++) {
    const a = catalogs[ix];
    if (verbose) {
      console.log(a)
    } else {
      const {item_id, revision_id, name, path:ipath, h1, h2 } = catalogs[ix];
      _assert(h2, catalogs[ix], "Missing h2")
      console.log(`[${item_id}:${revision_id}] @(${ipath}) ${name} (${h1}/${h2})`)
    }
//    const {url, fsize, timeStamp} = data;
//    const {revision_id} = pdf;

  } // each catalog.
*/
  console.log(`> found ${catalogs.length} catalogs.`)
  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------

function check_password() {
  if (!process.env.PGPASSWORD) {
    console.log(`
      *********************
      PGPASSWORD IS MISSING
      *********************
      `);
    process.exit(-1);
  }
}
