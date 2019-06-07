#! /usr/bin/env node


console.log(`
  *********************************************************
  xp102-drop-app-instance.js
  *********************************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

const api = require('./lib/openacs-api')
//console.log('api:',api)
const {_assert} = require('./lib/openacs-api');
_assert(api.cms_instance__new, api, "Missing cms_instance__new")

const argv = require('yargs')
  .alias('i','package_id')
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
if (!argv.package_id) {
  console.log(`
    Missing package_id - EXIT-
    ex: -i 123456
  `);
  process.exit(-1);
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
  await api.cms_instance__drop(argv.package_id)
//  await api.select_app_folders('museum-monday-291')
  .then(retv =>{
    console.log(`drop_app_instance =>`,retv)
  });


  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
