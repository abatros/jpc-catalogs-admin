#! /usr/bin/env node


console.log(`
  ******************************************************
  xp115-update-extlink.js
  ******************************************************
  `)

const fs = require('fs-extra');
//const path = require('path');
const assert = require('assert');
const yaml = require('js-yaml');
const jsonfile = require('jsonfile');

//var find = require('find');
//var find = require('find-promise');
//const pdfjsLib = require('pdfjs-dist');

const api = require('./lib/openacs-api')
const {_assert} = require('./lib/openacs-api');
//const {scan_extlink, remove_unchanged} = require('./lib/scan-extlink.js');
const {retrofit_for_update} = require('./lib/scan-extlink.js');

const argv = require('yargs')
  .alias('v','verbose').count('verbose')
//  .alias('i','item_id')
//  .alias('o','output')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:false},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
//    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);

const fn = argv._[0];

if (!fs.existsSync(fn)) {
  console.log(`
    Missing input file <${fn}>
    `);
  process.exit(-1);
}

const extlink = yaml.safeLoad(fs.readFileSync(fn, 'utf8'));

const {
  publisher, lang, path,
  h2, // h1 cannot be changed! it's catalog name - not a section.
  pic, url, label, xdescription,
  item_id, revision_id, parent_id,
  name
} = extlink;

_assert(item_id, extlink, "Missing item_id => create-new-extlink. TODO")

console.dir(`Connect database - switching async mode.`)


main(item_id)
.then(async ()=>{
})
.catch((err)=>{
  console.log('fatal error in main - err:',err);
  api.close_connection()
  console.dir('Closing connection - Exit: AFTER FAIL.');
})


async function main(_item_id) {
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

  const ax = await db.query(`
  select *
  from cms.extlinks
  where (item_id = $1)
  `, [_item_id], {single:true});

  if (!ax) {
    console.log(`
      This item (${_item_id}) does not exist.
      EXIT.
      `)
    process.exit(-1);
  }

//  const x = scan_extlink(ax); // reformat

//  console.log('ACTUAL EXTLINK:',x);

//  const new_xlink = {cr_item:{}, acs_object:{}, cr_revision:{data:{}}};

  if (!ax.item_id) {
    console.log(`We are doing a new extlink`)
    throw `We are doing a new extlink@132`
  } else {
    console.log(`This is an update`)
    console.log(`ax.data:`,ax.data); // from db.

    const new_xlink = retrofit_for_update(extlink, ax, {verbose});
    console.log(`\n\nnew_xlink:`,new_xlink)
    await update_xlink(db, ax, new_xlink);
//    console.log(`\n\ndelta:`,delta)

  }


//  make_diff()

  /****************************************************

    Compare actual with new-data from yaml-input.

  *****************************************************/

  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------

function mk_partial_update_query(o) {
  const q=[], argv=[];
  Object.keys(o).forEach(key =>{
    argv.push(o[key]);
    q.push(`${key} = $${argv.length}`)
  })
  return {query:q.join(',\n'), argv};
}

async function update_xlink(db, ax, o) {
  console.log(`\n\nupdate_xlink delta:`,o)
  _assert(ax.item_id, ax, "Missing item_id")

  if (o.acs_object && Object.keys(o.acs_object).length >0) {
    const {query:_query, argv:_argv} = mk_partial_update_query(o.acs_object);
    await db.query(`
      update acs_objects
      set ${_query}
      where object_id = ${ax.item_id}
      `,_argv, {single:true});
  }

  if (o.cr_item && Object.keys(o.cr_item).length >0) {
    const {query:_query, argv:_argv} = mk_partial_update_query(o.cr_item);
    await db.query(`
      update cr_items
      set ${_query}
      where item_id = ${ax.item_id}
      `,_argv, {single:true});
  }


  if (o.cr_revision && Object.keys(o.cr_revision).length >0) {
    _assert(ax.revision_id, ax, "Missing revision_id")

    const {query:_query, argv:_argv} = mk_partial_update_query(o.cr_revision);
    await db.query(`
      update cr_revisions
      set ${_query}
      where revision_id = ${ax.revision_id}
      `,_argv, {single:true});
  }


};
