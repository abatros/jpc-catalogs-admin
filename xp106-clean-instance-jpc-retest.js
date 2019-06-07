#! /usr/bin/env node


console.log(`
  ******************************************************
  xp106-clean-instance-jpc.js
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
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:false},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);

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
      verbose && console.log(`found app:`,app)
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })

  /***********************************************
      HERE: app has {package_id, app-folder}
  ************************************************/

  const catalogs = await db.query(`
  select *
  from cms.revisions_latest
  where (package_id = $1)
  and object_type = 'cms-article'
  `, [app.package_id], {single:false})
  .then(cats =>{
    console.log(`> found ${cats.length} catalogs.`)
    return cats;
  });

  //process.exit(-1)

  /***********************************************
      drop all catalogs
  ************************************************/


  let not_found =0, txt_count =0;
  for (let ix=0; ix<catalogs.length; ix++) {
    const a = catalogs[ix];
    //console.log(extlinks[ix])
    const {item_id, revision_id, path, data } = catalogs[ix];
    const {pdf, fsize, timeStamp} = data;
//    const {revision_id} = pdf;

    await db.query(`
      delete from acs_objects
      where object_id = $1
      and package_id = $2 -- safer.
      ;
      `, [item_id, app.package_id], {single:true})
    .then(retv =>{
      console.log(`delete retv:`,retv);
    })

  } // each catalog.

  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
