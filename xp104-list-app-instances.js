#! /usr/bin/env node


console.log(`
  *********************************************************
  xp104-list-app-instance.js
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
  .alias('v','verbose').count('verbose')
  .boolean('pg-monitor')
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
  console.dir('Closing connection - Exit: Ok.');
})


async function main() {
  const {db} = await api.connect({pg_monitor});

  await db.query(`
    -- make sure the app does not exists:

    select f.folder_id, i.parent_id, i.name, f.label, f.package_id, p.instance_name, p.package_key
    from cr_folders f
    join apm_packages p on (p.package_id = f.package_id)
    join cr_items i on (i.item_id = f.folder_id)
    where ((p.package_key = 'cms')or(p.package_key = 'museum'))
    and parent_id = -100
    `,[],{single:false})
  .then(apps =>{
    if (verbose) {
      console.log(apps)
    } else {
      apps.forEach(app =>{
        const {package_id, folder_id, name, label, instance_name} = app;
        console.log(`[${package_id},${folder_id}] "${instance_name}"`)
      })
    }
  });




  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
