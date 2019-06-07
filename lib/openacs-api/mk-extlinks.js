const {_assert} = require('./utils.js')
const {commit_pdf} =  require('./commit-pdf.js');
const fs = require('fs');
const find = require('find-promise');
const path = require('path');

//const {content_item__relate, content_item__relate2, content_item__unrelate} = require('./content-item-relate.js');
const {commit_extlink} = require('./commit-extlink.js');
_assert(commit_extlink,commit_extlink,"FATAL")
/*

  IN THIS VERSION:
    for each pdf, we build a list of catalog.item_id
    NOT catalog.revision_id !!!!!

    for each cr_item in package_id
    extract links.

    pull catalogs directory : (cms-article | package_id)
    - for each catalog, list pdf files
      - for each pdf
        - find in folder => fsize, timeStamp
        - commit_pdf (fileName, fsize, timeStamp)


*/

/*
    All cr_revisions in package_id
*/

const ac_revisions = `
select
  r.revision_id,
  i.item_id,
  i.name,
  r.data->>'sec' as sec,
  i.content_type, o.object_type,
  r.data->'links' as xlinks,
  o.package_id
from cr_revisions as r
join cr_items as i on (i.item_id = r.item_id)
join acs_objects as o on (o.object_id = i.item_id)
where (o.package_id = $1)
and ((r.data->>'sec')::integer = $2)
and (o.object_type = 'cms-article')
order by revision_id;
`;

const query_extlinks = `
select
  i.item_id,
  array_agg(x)
from cr_extlinks x
join cr_items i on (i.item_id = x.extlink_id)
join acs_objects o on (o.object_id = x.extlink_id)
where (o.package_id = $1)
group by i.item_id
order by i.item_id
limit 10;
`;



exports.mk_extlinks = async function(){

  const extlinks = await db.query(query_extlinks, [package_id], {single:false})
  console.log(`found ${extlinks.length} extlinks for package:${package_id}`);


  const section = 4;
  const revisions = await db.query(ac_revisions, [package_id, section], {single:false})
  console.log(`found ${revisions.length} revisions for package:${package_id}`);



  /**********************************************************************

  1. aggregate extlinks by (item_id == extlink_id) extlinks = fn(item_id)
  2. aggregate all pdf found in a cr_item (from all revisions)
  3. for each cr_item:
    2.1. for each pdf, create extlink if not exist.
  4. for each cr_item in (1)
    for each extlink, delete - if not exists in (2)

  ***********************************************************************/

  /**********************************************
  for each fileName in i1, we set a score of (-1) "to be deleted".
  for each fileName in i2, we increment the score by1 @[item_id]

  ***********************************************/


  const ii = {}

  // (reference) => PLUS
  revisions.forEach(it =>{
    const {item_id, xlinks} = it;
    xlinks && xlinks.forEach(pdf =>{
      const {fn:url} = pdf;
      ii[item_id] = ii[item_id] || {};
      ii[item_id][url] = ii[item_id][url] || 0;
      ii[item_id][url] +=1;
    }) // links
  }) // revisions


  // the existing-stuff (already attached url) MINUS
  extlinks.forEach(it =>{
    const {item_id, url} = it;
    ii[item_id] = ii[item_id] || {};
    ii[item_id][url] = ii[item_id][url] || 0;
    ii[item_id][url] -=1;
  })


  console.log('ii:',ii)
  console.log(`found ${extlinks.length} extlinks for package:${package_id}`);
  console.log(`found ${revisions.length} revisions for package:${package_id}`);

  /***************************
   - for each cr_item (article)
    - for each fileName
      - (1) create an extlink
      - (2) remove an extlink
      - (3) do nothing - because the extlink already exists.
  ****************************/

//  Object.keys(ii).forEach(item_id =>{
  let stop_count =99999;
  for await (let item_id of Object.keys(ii)) {
    let added=0, removed=0, do_nothing=0;
//    Object.keys(ii[item_id]).forEach(fn =>{
    for await (let url of Object.keys(ii[item_id])) {
      if (ii[item_id][url] >0) {
        console.log(`add <${url}> to (cr_item):${item_id}`)
        await commit_extlink({
          parent_id:item_id,
          url,
          label: url, // goes into acs_object.title
          description: JSON.stringify({fsize:0, timeStamp:null}),
          package_id
        })
        added +=1;
      } else if (ii[item_id][url] <0) {
        console.log(`remove <${url}> from (cr_item):${item_id}`)
        removed +=1;
      } else {
        console.log(`do-nothig <${url}> already in (cr_item):${item_id}`)
        do_nothing +=1;
      }
    } // each fn
    console.log(`>>> added:${added} removed:${removed} do-nothing:${do_nothing}`)
    if (--stop_count <=0) break;
  } // each cr_item
}


exports.mk_extlinks_Obsolete = async function(){


  /*
      We need revisions because pdf fileName are only found in cr_revision.data.
  */

  const _pdf ={};

  return db.query(ac_revisions, [package_id], {single:false})
  .then(catalogs =>{
    catalogs.forEach(cat =>{
      console.log(`${cat.revision_id} (${cat.name}) =>`, cat.xlinks);
      cat.xlinks.forEach(pdf =>{
        _pdf[pdf.fn] = _pdf[pdf.fn] || new Set();
        _pdf[pdf.fn].add(cat.item_id); // to be used in content_item__relate()
      })
    })
//    return _pdf;
  })
  .then(()=>{
    db.query('select * from cr_type_relations')
    .then(x =>{
      console.log(`cr_type_relations:`,x)
    })
  })
  .then(async () =>{
    /*****************************
    rewind and replay :
    for each pdf (content-item), commit - then link to latest catalog revision,
    using content_item__relate(), content_item__unrelate()
    ATTN: a catalog can have multiple pdf as attachments.

    HERE: each pdf has refs to catalogs (INVERTED)
    ******************************/
    const pIndex = Object.keys(_pdf);
    console.log(`pIndex.length:${pIndex.length}`)

//console.log(`_pdf:`,_pdf); process.exit();

    for (let ix=0; ix<pIndex.length; ix++) {
      const fn = pIndex[ix];
      // console.log(`(${fn}) : ${_pdf[fn].length}`)
      const {fsize, timeStamp} = await pdf_lookup(fn+'.pdf')
      const o = await commit_pdf({title:fn+'.pdf', json_data:{fsize, timeStamp}}) // with links to articles. (cr_item_rels) AND fsize, timeStamp,...
      if (o.retCode) {
        console.log(`commit_pdf retCode:${o.retCode.retCode} detail:${o.retCode.detail}`)
      }
      console.log(`pdf-committed revision_id:${o.revision_id} fsize:${o.data.fsize} title(fn):<${o.title}>`)
      _assert(o.revision_id, o, 'missing revision-id');

      /*********************************************
      HERE: each pdf has refs to catalogs (INVERTED) !!!!!!!!!!!!!!!!!!
      **********************************************/
      const {item_id} = o;
      const cats = Array.from(_pdf[fn]);

      console.log(` -- this pdf is referenced from ${cats.length} catalogs `, cats);

      for (let j=0; j<cats.length; j++) {
        const cat_id = cats[j];

        const cmd_Obsolete = {
          item_id,            // a pdf-file item_id
          object_id: cat_id,  // a catalog item_id
          relation_tag: 'pdf-article',
          order_n: cat_id,
          relation_type: ''
        }

        const cmd = {
          item_id: cat_id,            // a pdf-file item_id
          object_id: item_id,  // a catalog item_id
          relation_tag: 'pdf-article',
          order_n: cat_id,
          relation_type: ''
        }

        console.log(`api.content_item__relate : `,cmd)

        await content_item__relate(cmd) // here item->item
        .then(rel_id =>{
          console.log(`api.content_item__relate => ret_id:`,rel_id);
        })
      }
    }
  });
};

// ----------------------------------------------------------------------------

async function pdf_lookup(fn) {
  const regex = new RegExp(fn)
  const files = await find.file(regex,'/media/dkz/Seagate/2019-museum-assets');
  if (files.length !=1) {
    console.log(`ALERT: unable to find <${fn}> files:`,files)
    throw 'pdf-file-not-found';
  }
  const {size:fsize, mtime:timeStamp} = fs.lstatSync(files[0]);
  // console.log({fsize,timeStamp})
  return {fsize,timeStamp};
}
