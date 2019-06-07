#! /usr/bin/env node


console.log(`
  ******************************************************
  xp116-import-yaml.js
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
//const {scan_extlink, remove_unchanged} = require('./lib/scan-extlink.js');
const {retrofit_for_update} = require('./lib/scan-extlink.js');
const {commit_catalog, commit_section_pdf, commit_edition} = require('./lib/openacs-api/commit-revision-v2.js')

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

const yaml_data = yaml.safeLoad(fs.readFileSync(fn, 'utf8'));

/************************************************
  FIRST VALIDATION
*************************************************/

let v1_errors =0;

/*
specific to jpc-france:
Inheritance : {pic}
*/
let pic = null;
let fpath = null;

for (let it of yaml_data) {
  if (it.h1) {
    // we should validate the tree/path here
    pic = it.pic; // to be used in h2
    fpath = it.fpath; // must be reset at each H1.
    continue;
  }
  if (it.h2) {
    // we should validate the tree/path here
    it.pic = it.pic || pic;
    _assert(it.pic, it, "Missing pic")
    _assert(it.url, it, "Missing url")
    if (fpath) it.url = path.join(fpath,it.url);
    continue;
  }
  if (it.edition) {
    const {edition:name, lang, yp, publisher} = it;
    //we should set the lang....
    continue;
  }
  console.log(`found Invalid Object "${it}" in yaml-data o:`,it);
  v1_errors +=1;
}

if (v1_errors >0) {
  console.log(yaml_data)
  throw `FATAL found ${v1_errors} errors in first validation`;
} else {
  console.log(`validation V1 passed.`);
};

// process.exit(-1)

console.dir(`Connect database - switching async mode.`)

main()
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

  //await db.cms.create_test_query();


  await db.query(`
    select * from cms.app_instances where instance_name = $1;
    `, ['jpc-catalogs'], {single:false})
  .then(apps =>{
    if (apps.length == 1) {
      // GLOBAL VARIABLE with db
      app = apps[0]; // global.
      verbose && console.log(`found app:`,app)
      app.db = db;
    } else {
      console.log(`found ${apps.length} apps:`,apps)
      throw 'stop@100';
    }
  })

  /***********************************************
      HERE: app has {package_id, app-folder}
      Lets get a directory (snap-shot)
      to reduce access to db.
  ************************************************/

  // global.
  gdir = await db.query(`
  select
    item_id, revision_id, name, path
  from cms.extlinks
  where (parent_id = $1)
  `, [app.folder_id], {single:false});

  if (!gdir) {
    console.log(`
      Unable to access app data.
      `)
    process.exit(-1);
  }


  /************************************************


  *************************************************/
  for (let it of yaml_data) {
    if (it.h1) {
      await commit_catalog(it, {verbose,recurse:false}) // do not commit sections.
      .then(retv =>{
        console.log(`commit_catalog@118 =>retv:`,retv)
      })
      .catch(err =>{
        console.log(`commit_catalog@121 =>err`,err)
      })
      continue;
    }
    if (it.h2) {
      await commit_section_pdf(it, {verbose,recurse:false}) // do not commit sections.
      .then(retv =>{
        console.log(`commit_section_pdf@151 =>retv:`,retv)
      })
      .catch(err =>{
        console.log(`commit_section_pdf@154 =>err`,err)
      })
      continue;
    }
    if (it.edition) {
      //const {edition:name, lang, yp, publisher} = it;
      //we should set the lang....
      await commit_edition(it, {verbose,recurse:false}) // do not commit sections.
      .then(retv =>{
        console.log(`commit_edition@151 =>retv:`,retv)
      })
      .catch(err =>{
        console.log(`commit_edition@154 =>err`,err)
      })
      continue;
    }

    console.log(`NOT-READY: it:`,it)
  }


  /****************************************************

    Compare actual with new-data from yaml-input.

  *****************************************************/


  // -------------------------------------------------------------------------

  async function commit_extlink(o) {
    const {
      item_id, publisher, lang, path, h1, h2, name,
      pic, fpath, url
    } = o;
    if (item_id) {
      console.log(`-- commit/update extlink(pdf): ${name} @${path} [${lang}] -h2: "${h2}"`)
      return;
    }
    console.log(`-- commit extlink(pdf) new: ${name} @${path} [${lang}] -h2: "${h2}"`)
    await commit_extlink_sql(o)
    .then(retv =>{
      console.log(`commit_extlink_sql =>`,retv)
      return retv;
    })
    .catch(err =>{
      console.log(`commit_extlink_sql =>err:`,err)
    });
  }

  // -------------------------------------------------------------------------

  async function commit_extlink_sql(o) {
    console.log(`-- commit_extlink_sql:`)
    await db.cms.test_query()
    .then(retv =>{
      console.log(`db.test_query =>`,retv)
      return retv;
    })
    .catch(err =>{
      console.log(`db.test_query =>err:`,err)
    });
  }



  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}

// -------------------------------------------------------------------------



/**

_assert(item_id, extlink, "Missing item_id => create-new-extlink. TODO")
**/

// -------------------------------------------------------------------------

function find_path(path) {
  gdir.forEach(it =>{
    if (it.path == path) return it;
  })
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

// ===========================================================================

async function commit_catalog__(cat, options) {
  const {
    publisher, lang:clang, path:cpath, h1, name:cname,
    sections,
    pic, // jpc-catalogs : to be replicated in each section
    fpath // to be used for url - but we don't check yet.
  } = cat;
  _assert(clang, cat, "catalog -- Missing lang")
  _assert(cpath, cat, "catalog -- Missing path")

  console.log(`catalog: ${cname} @${cpath}  [${clang}]`)




  for (let it of sections) {
    //console.log(`let=>:`,it)
    let {item_id, path, lang, name, h2, url} = it;
    console.log(`-- section(pdf): ${name} @${path} [${lang}] -h2: "${h2}"`)
    lang = lang || clang;
    if (clang && (lang != clang)) {
      console.log(`ALERT lang does not match`)
    }
    if (!path.startsWith(cpath)) {
      console.log(`ALERT path does not match`)
    }


continue;


    /*************************************************
      STEP 2 : check with snap-shot (gdir)
    **************************************************/

    const section = find_path(path)

    if (section) {
      console.log(`@(${path}) already exists update or do-nothing.`);
    } else {
      console.log(`@(${path}) create`);
      await commit_extlink(Object.assign(cat,it))
      .then(retv =>{
        console.log(`commit_extlink =>`,retv)
        return retv;
      })
      .catch(err =>{
        console.log(`commit_extlink =>err:`,err)
      });
    }
  } // for
}
