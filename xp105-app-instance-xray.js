#! /usr/bin/env node


console.log(`
  *************************************************************
  xp105-app-instance-xray.js
  every object with package_id
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

  const objects = await db.query(`
  select
    object_id, object_type, context_id, title
  from acs_objects
  where package_id = $(package_id)
  order by object_id
  `,{package_id}, {single:false})
  .then(objects =>{
    console.log(`> found ${objects.length} objects.`)
    return objects;
  });


  for (let o of objects) {
    const {object_id, object_type, context_id, title} = o;
    console.log(`[${object_id}:${context_id}] {${object_type}} ${title}`)
  }

  console.log(`> found ${objects.length} objects.`)
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
