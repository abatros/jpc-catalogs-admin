#! /usr/bin/env node


console.log(`
  *************************************************************
  xp118-purge-revisions.js
  keeps the latest : on all {editions, volumes, sections-pdf}
  for jpc-catalogs.
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

console.dir(`Connecting to database - switching async mode.`)


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
  console.dir(`Connected to database Ok.`)

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
  ************************************************/

  await db.query(`
    select cms.purge_all_revisions($1,$2) as rowCount
  `,[app.package_id, ''+(ipath||'')], {single:false})
  .then(retv =>{
    console.log(`> deleted:`,retv)
    //console.log(`> deleted rowcount:`,db.pgp)
  });


  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
