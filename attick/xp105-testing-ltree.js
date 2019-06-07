#! /usr/bin/env node


console.log(`
  ***********************
  xp105-testing-ltree.js
  ***********************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

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
  console.dir('Closing connection - Exit: AFTER FAILURE.');
})


async function main() {
  const {db} = await api.connect({pg_monitor});

  /*****************************************************
      locale an instance => {package_id, app_folder}
  ******************************************************/

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


  /*****************************************************
      create TOC table
  ******************************************************/

  await db.query(`
    --drop table cms.TOC;
    create table if not exists cms.TOC (
      lang varchar(10) not null,
      path ltree,
      title varchar(1000),
      package_id integer not null,
      item_id integer references cr_items(item_id),
      unique (lang, path, package_id)
    );
    `,[],{single:true})
  .then(() =>{
    console.log('> cms.TOC created.')
  })


  /*****************************************************
      erase data
  ******************************************************/

  await db.query(`
    delete from cms.toc where package_id = 3141617280;
    `,[],{single:true})
  .then(() =>{
    console.log('> cms.TOC erased.')
  })



  /*****************************************************
      populate table
  ******************************************************/

  for (let i=1; i<=4; i++) {

    const err = await db.query(`
      insert into cms.TOC (lang, path, title, package_id)
      values ('en', $1, $2, 314161728)
      `, [`T${i}`, `Thermostats cat-${i}`], {single:true})
    .then(() =>{
      //verbose && console.log();
      return null
    })
    .catch(err =>{
      console.log(`err:`,err.detail);
      return err;
    })
//    if (err) continue;


    for (let j=1; j<10; j++) {
      await db.query(`
        insert into cms.TOC (lang, path, title, package_id)
        values ('en', $1, $2, 314161728)
        `, [`T${i}.${j}`, `Thermostats sec-${j}`], {single:true})
      .catch(err =>{
        console.log(`err:`,err.detail);
      })
    }
  }

  /*****************************************************
      add a funny path
  ******************************************************/

  await db.query(`
    insert into cms.TOC (lang, path, title, package_id)
    values ('en', $1, $2, 314161728)
    `, [`T3.2.3.7_5`, `Thermostats T3:2.3.7:5 funny`], {single:true})



  /*****************************************************
      search children
  ******************************************************/


  await db.query(`
    select * from cms.toc
    where (path <@ 'T1')
    and (package_id = 314161728);
    `,[],{single:false})
  .then(v =>{
    console.log(`children -- found ${v.length} entries: `,v)
  })


  /*****************************************************
      search ancestors
  ******************************************************/


  await db.query(`
    select * from cms.toc
    where (path @> 'T1.5.6')
    and (package_id = 314161728);
    `,[],{single:false})
  .then(v =>{
    console.log(`Parents (T1.5.6)-- found ${v.length} entries: `,v)
  })


  /*****************************************************
      removing a parent-entry
  ******************************************************/

  await db.query(`
    delete from cms.toc
    where (path = 'T1')
    and (package_id = 314161728);
    `,[],{single:false})
  .then(retv =>{
    console.log(`removed T1`);
  })


  /*****************************************************
      search ancestors AGAIN
  ******************************************************/


  await db.query(`
    select * from cms.toc
    where (path @> 'T1.5.6')
    and (package_id = 314161728);
    `,[],{single:false})
  .then(v =>{
    console.log(`After removing T1 Parents (T1.5.6)-- found ${v.length} entries: `,v)
  })




  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
