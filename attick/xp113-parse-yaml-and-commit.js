#! /usr/bin/env node


console.log(`
  ********************************************
  xp113-parse-yaml-and-commit.js
  create extlinks for each catalog (pdf-file)
  ********************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const yaml = require('js-yaml');
const jsonfile = require('jsonfile');
const find = require('find-promise');
const pdfjsLib = require('pdfjs-dist');

const api = require('./lib/openacs-api')
//console.log('api:',api)


const {_assert, fatal_error} = require('./lib/openacs-api');
//const xlsx_fn = '1 Ultimheat commercial test 2019.xlsx';
const yaml_fn = 'jpc-commercial.yaml';


const argv = require('yargs')
  .alias('v','verbose').count('verbose')
  .boolean('pg-monitor')
  .boolean('commit')
  .options({
    'pg-monitor': {default:true},
    'limit': {default:99999}, // stop when error, if --no-stop, show error.
    'zero-auteurs': {default:false}, //
  }).argv;

const verbose = argv.verbose;
const pg_monitor = (verbose>1);

const yaml_data = yaml.safeLoad(fs.readFileSync(yaml_fn, 'utf8'));

console.log(`yaml contains ${yaml_data.length} catalogs`)

async function file_lookup(fo) {
  const root_folder = '/media/dkz/Seagate/git-u7/Catalog/'+fo;
  const head = root_folder+'/'+fo;
  const files = await find.file(/\.pdf$/,root_folder)
  .then(files =>{
    //console.log(`files:`,files)
    files = files.filter(fn =>(fn.startsWith(head)))
/*
    files = files.map(fn =>(fn.replace('/media/dkz/Seagate/git-u7/Catalog/'+fo+'/','')))
    .filter(fn =>(fn.startsWith(fo)))
    .map(fn => (fn.replace(fo,'')))
//    .filter(fn =>(!fn.startsWith('/Alphabet')))
//    .filter(fn =>(!fn.startsWith('/Reference')))

const fn = files[j].fn;
const {lang, h2} = scan_fileName(files[j].secName);


*/

    return files.map(fn => {
      const tail = fn.replace(head,'').split('201')[0];

      return {
        fn,
        h1: fo,
        h2: tail.slice(2).toLowerCase(),
        lang: tail.slice(0,2).toLowerCase()
      }
    });
  });
  return files;
}

console.log(`yaml contains ${yaml_data.length} catalogs`)

//process.exit(-1);

/*
    Create GRAPH (indexes)
    constructeurs =>[catalogues]*
    s3publisher => [articles/s3]* (with s4 also)
*/


console.log(`4. Connect database - switching async mode.`)


main()
.then(async ()=>{
})
.catch((err)=>{
  console.log('fatal error in main - err:',err);
  api.close_connection()
  console.dir('Closing connection - Exit: FAILED.')
})

function scan_fileName(s) {
  return {
    lang: s.slice(0,2).toLowerCase(),
    h2: s.slice(2).toLowerCase()
  };
}


async function main() {

    const {db} = await api.connect({pg_monitor});
    if (!db) throw "Unable to connect."
    else {
      console.log(`5. Connected to openacs.`)
    }


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


    for (let ix=0; ix<yaml_data.length; ix++) {
      const cat = yaml_data[ix];
//      const {fo, path, h1, h2, co} = cat;
      const {fo, path, co} = cat;
      console.log(`path:${path} fo:${fo}`);
      /*****************************************
      file lookup : each file will be a extlink
      ******************************************/
      const files = await file_lookup(fo);


      let iSec =0;
      for (let j=0; j<files.length; j++) {
        const {fn, h1, h2, lang} = files[j];
        const {size, mtime} = fs.lstatSync(fn);
//      console.log(`${file} size:${size} ts:${mtime}`);
        const doc = await pdfjsLib.getDocument(fn);
//        console.log(`size:${size} =>(${doc.numPages}) ${h2}`);

        if (!h2) {
          console.log(`
            This is a catalog - NOT a section
            ${fn}
            `)
          iSec =0; // ATTENTION IT WORKS BUT...
          continue;
        }

        iSec +=1;

        const xlink = {
          path:`${path}.${iSec}`,
          name: `U::${path}.${iSec}::${lang}::${h2}`,
          title: `${path}.${iSec}::${files[j].secName}`,
          url:fn,
          lang,
          h1,h2,
        }

//        console.log(`xlink:`,xlink)
//        continue;
        console.log(`U::[${xlink.path}.${lang}] ${xlink.h1}/${xlink.h2} npages:${doc.numPages}`);


        Object.assign(xlink, {
          parent_id: app.folder_id,
          package_id: app.package_id,
          content_type: 'content_revision',
          item_subtype: 'cms-article',
          json_data: {
            pic:fo,
            h1, h2,
            fsize: size,
            timeStamp: mtime,
            co: co || 'Ultimheat'
          }
        });

//        console.log(`xlink:`,xlink)
//        continue;

        const retv = await api.commit_extlink(xlink, {verbose})
        .then(async retv =>{
          const {error, item_id, retCode} = retv;
          // if committed, (item_id !=0)
          if (!item_id) {
            console.log(`alert -- extlink not committed error:`,error);
          } else {
            if (retCode) {
              console.log(` -- api.commit_extlink.retCode: `,retCode)
            }
          }
          return retv;
        })
        .catch(err =>{
          // this is really an error.
          console.log(`err@198 : `,err);
          throw 'FATAL@192'
        })
      } // each file
    continue;
    } // each folder (section)

  await api.close_connection(db)
  console.dir('Closing connection - Exit: Ok.')
}



// -------------------------------------------------------------------------
