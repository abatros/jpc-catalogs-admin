const {_assert, xnor_name} =  require('./utils.js')
const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');
const {select_cr_item} = require('./select-cr-item.js')
const hash = require('object-hash');


function extract_data(o) { // and clean

  const {
    xid, sec, yp, circa, pic, h2, fr, en, zh, mk, links,
    restricted, transcription, rev, comm, ori,
    co, h1, yf, root, ci, sa} =o;

  const o2 = {
    xid, sec, yp, circa, pic, h2, fr, en, zh, mk, links,
    restricted, transcription, rev, comm, ori,
    co, h1, yf, root, ci, sa // <= thoses are candidates for construsteur props.
  }

  //  Object.keys(o2).forEach(key => (!o2[key]) && delete o2[key])
  Object.keys(o2).forEach(key => (o2[key] === undefined) && delete o2[key])
  return o2;
};


exports.commit_article = async function(o, options) {
  options = options || {};
  _assert(o.xid, o, 'Missing article.xid (unique)')
  _assert(o.parent_id, o, 'Missing article.parent_id (the constructeur)')
  _assert(Number.isInteger(o.parent_id), o, 'Invalid parent_id')

  o.name = o.title = o.title || `article-${o.xid}`;

  //console.log(`commit_article o:`,o)
//  throw 'stop@239- testing commit_article'

  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'cms-article';
  o.package_id = o.package_id || package_id;

  o.json_data = extract_data(o);

  _assert(o.package_id, o, 'Missing article.package_id @23')
  _assert(o.path, o, 'Missing article.path @47')

  return commit_revision(o, options)
  .then(async o2 =>{
    _assert(o2.revision_id, o2, 'missing latest_revision')
    // console.log(`[commit-article] o2:`,o2)
    if (o2.warning && options.verbose) {
      //console.log(`commit-article warning`,o2.warning)
    }

    const {item_id} = o2;
    console.log(`update path::ltree for ${item_id}`)
    await db.query("update cr_items set path = 'M.4' where item_id = $1",[item_id],{single:true})


//    console.log('extracted-data:', o2.data) // should not have undefined.
    return o2;
  })
}
