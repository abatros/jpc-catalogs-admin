#! /usr/bin/env node


console.log(`
  ******************************************************
  xp114-export-extlink.js
  ******************************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const yaml = require('js-yaml');
const jsonfile = require('jsonfile');

//var find = require('find');
//var find = require('find-promise');
//const pdfjsLib = require('pdfjs-dist');

const api = require('./lib/openacs-api')
const {_assert} = require('./lib/openacs-api');

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .alias('i','item_id')
  .alias('o','output')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:false},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);

const {item_id:_item_id, output} = argv;

if (!_item_id) {
  console.log(`
    Missing item_id
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

  const extlink = await db.query(`
  select *
  from cms.extlinks
  where (item_id = $1)
  `, [_item_id], {single:true})
  .then(xlink =>{
    return xlink;
  });

  console.log(extlink);

  const {
    parent_id=0, item_id=0, revision_id=0, package_id=0,
    path, url, label, name, xdescription='', object_title,
    content_type, nls_language,
    revision_title, description='',
    data
  } = extlink;



  const yaml_txt = yaml.safeDump({
    item_id,
    publisher: data.co || 'Ultimheat',
    lang:data.lang || 'fr',
    path,
    h1: data.h1 || '*undefined*',
    h2: data.h2,
    pic: data.pic,
    url, label, xdescription,     // cr_extlink
    object_title,
    revision_title,
    description,
    nls_language,
    infos: {
      url: data.url || '*missing*',
      fsize: data.fsize ||0,
      timeStamp: data.timeStamp ||0,
      parent_id,
      revision_id,
      content_type,
      name
    },
    dob: '16-10-48'
  },{skipInvalid:false});

  if (output) {
    fs.writeFileSync(output, yaml_txt)
  } else {
    console.log(`\n\n`+yaml_txt)
  }


  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------
