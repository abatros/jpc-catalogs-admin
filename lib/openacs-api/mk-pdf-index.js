const {_assert} = require('./utils.js')
const {commit_pdf} =  require('./commit-pdf.js');
const fs = require('fs');
const find = require('find-promise');
const path = require('path');

const {content_item__relate, content_item__relate2, content_item__unrelate} = require('./content-item-relate.js');

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

exports.mk_pdf_index = async function(){

  const ac_revisions = `
  select
    r.revision_id,
    i.item_id,
    i.name,
    r.data->'links' as xlinks,
    o.package_id
  from cr_revisions as r
  join cr_items as i on (i.item_id = r.item_id)
  join acs_objects as o on (o.object_id = i.item_id)
  where (o.package_id = $1)
  and (o.object_type = 'cms-article')
  order by revision_id;
  `;

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
