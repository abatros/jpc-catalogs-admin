#! /usr/bin/env node


console.log(`
  *********************************************************
  xp101-create-new-instance.js  'jpc-catalog'
  JPC Catalogs : create a new instance if not exists.
  *********************************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

const api = require('./lib/openacs-api')
//console.log('api:',api)
const {_assert} = require('./lib/openacs-api');
_assert(api.cms_instance__new, api, "Missing cms_instance__new")

if (!process.env.PGPASSWORD) {
  console.log(`
    *********************
    PGPASSWORD IS MISSING
    *********************
    `);
  process.exit(-1);
}

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
const pg_monitor = (verbose>0);
const e_path = argv._[0];

if (!e_path) {
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
  console.dir('Closing connection - Exit: Ok.');
})


async function main() {
  const {db} = await api.connect({pg_monitor});
  /*
  await api.select_app_instance('jpc-catalogs')
//  await api.select_app_folders('museum-monday-291')
  .then(retv =>{
    if (retv.length !=0) {
      console.log(`ALERT already-exists select_app_instance =>`,retv)
      throw 'fatal@53'
    }
  });
  */


  await api.cms_instance__new({name:e_path})
  .then(retv =>{
    if (retv.app_folders) {
      console.log(`
        ALREADY EXISTS api.cms_instance__new =>

        \n`,retv)
    } else {
      console.log(`api.cms_instance__new =>`,retv)
    }
  })


  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
