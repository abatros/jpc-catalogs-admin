const {_assert, xnor_name} =  require('./utils.js')
const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');
const {select_cr_item} = require('./select-cr-item.js')
const hash = require('object-hash');


function extract_data(o) {
  const o2 = Object.assign({},(({
      xid, sec, yp, circa, pic, h2, fr, en, zh, mk, links,
      restricted, transcription, rev, comm, ori,
      co, h1, yf, root, ci, sa // <= thoses are candidates for construsteur props.
    })=>({
      xid, sec, yp, circa, pic, h2, fr, en, zh, mk, links,
      restricted, transcription, rev, comm, ori,
      co, h1, yf, root, ci, sa
    }))(o));

  //  Object.keys(o2).forEach(key => (!o2[key]) && delete o2[key])
  Object.keys(o2).forEach(key => (o2[key] === undefined) && delete o2[key])
  return o2;
}

exports.commit_catalog = async function(o, options) {
  options = options || {};
  _assert(o.xid, o, 'Missing catalog.xid (unique)')
  _assert(o.parent_id, o, 'Missing catalog.parent_id (the constructeur)')
  _assert(Number.isInteger(o.parent_id), o, 'Invalid parent_id')

  o.name = o.title = o.title || `catalog-${o.xid}`;

  //console.log(`commit_catalog o:`,o)
//  throw 'stop@239- testing commit_catalog'

  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'cms-article';
  o.with_child_rels = o.with_child_rels || true;
  o.relation_tag = o.relation_tag || 'section-4';
  o.package_id = o.package_id || package_id;

  o.json_data = extract_data(o);

  _assert(o.package_id, o, 'Missing catalog.package_id @23')

  return commit_revision(o, options)
  .then(o2 =>{
    _assert(o2.revision_id, o2, 'missing latest_revision')
    // console.log(`[commit-catalog] o2:`,o2)
    if (o2.warning && options.verbose) {
      //console.log(`commit-catalog warning`,o2.warning)
    }

//    console.log('extracted-data:', o2.data) // should not have undefined.
    return o2;
  })
}

exports.commit_catalog_Obsolete = async function(o) {
  //console.log(`commit_catalog o:`, o);


  if (o.item_id) {
    throw 'NOT-READY@8'
    return commit_update_cr_item(o)
  }
  /*

      Normal path for new catalog

  */

  _assert(o.xid, o, 'Missing catalog.xid (unique)')
  _assert(o.parent_id, o, 'Missing catalog.parent_id (the constructeur)')
  _assert(Number.isInteger(o.parent_id), o, 'Invalid parent_id')

  o.name = o.title = o.title || `catalog-${o.xid}`;

  //console.log(`commit_catalog o:`,o)
//  throw 'stop@239- testing commit_catalog'

  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'cms-article';
  o.package_id = o.package_id || package_id;

  _assert(o.package_id, o, 'Missing catalog.package_id')
  /*
      Create a cr_item without revision => content_type:null.
  */

  const data = Object.assign({},(({
    xid, sec, yp, circa, pic, h2, fr, en, zh, mk, links,
    restricted, transcription, rev, comm, ori,
    co, h1, yf, root, ci, sa // <= thoses are candidates for construsteur props.
  })=>({
    xid, sec, yp, circa, pic, h2, fr, en, zh, mk, links,
    restricted, transcription, rev, comm, ori,
    co, h1, yf, root, ci, sa
  }))(o));
  console.log('data:',data)

  o.description = hash(data, {algorithm: 'md5', encoding: 'base64' });

  const o2 = await commit_item(o)
  .then(cr_item =>{
    Object.assign(o, cr_item);
    return o;
  })
  .catch(async (err) =>{
    switch (+err.code) {
      case 23505: // already exists (parent_id, name)
        const o2 = await select_cr_item(o);
        return Object.assign(o2, {err}) // goto UPDATE phase
        break;
      }
    throw err
  })

  /********************************************
  here we have a revision slot but no-data yet.
  Update cr_revision.data
  *********************************************/
  const latest_checksum = o2.checksum;

  if (latest_checksum) {
    console.log(`commit-catalog latest-revision checksum:${o2.description}`)
    // remove props already in o2
    throw 'stop@70'
  } else {
    // here it's a new catalog Not a new revision.
    //await commit_revision_data(data)
    return o2;
  }


} // commit_catalog
