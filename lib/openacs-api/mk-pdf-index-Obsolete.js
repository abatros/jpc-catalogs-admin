const {_assert} = require('./utils.js')
const {commit_pdf} =  require('./commit-pdf.js');
const fs = require('fs');
const find = require('find-promise');
const path = require('path');

const {content_item__relate2, content_item__unrelate} = require('./content-item-relate.js');

/*
    for each cr_item in package_id
    extract links.

    pull catalogs directory : (cms-article | package_id)
    - for each catalog, list pdf files
      - for each pdf
        - find in folder => fsize, timeStamp
        - commit_pdf (fileName, fsize, timeStamp)


*/

exports.mk_pdf_index = async function(){
  const query = `
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

  const _pdf ={};

  return db.query(query, [package_id], {single:false})
  .then(articles =>{
    articles.forEach(a =>{
      // console.log(`${a.revision_id} (${a.name}) =>`, a.xlinks);
      a.xlinks.forEach(pdf =>{
        _pdf[pdf.fn] = _pdf[pdf.fn] || [];
        _pdf[pdf.fn].push(a.revision_id); // to be used in content_item__relate()
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
      const revisions = _pdf[fn] ||[];

      for (let j=0; j<revisions.length; j++) {
        const revision_id = revisions[j];
        const cmd = {
          item_id,
          object_id: revision_id,
          relation_tag: 'article-pdf',
          order_n: revision_id,
          relation_type: ''
        }
        console.log(`api.content_item__relate : `,cmd)
        await content_item__relate2(cmd)
        .then(rel_id =>{
          console.log(`api.content_item__relate => ret_id:`,rel_id);
        })
      }
    }
  });
};


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
