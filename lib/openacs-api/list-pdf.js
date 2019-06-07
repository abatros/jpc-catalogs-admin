const {_assert} =  require('./utils.js')

exports.list_pdf = async function(o) {
  _assert(o.package_id, o, 'Missing package_id')

  return db.query(`
    select
      revision_id,
      name, cr_revisions.title,
      data->'fsize' as fsize,
      data->'timeStamp' as timeStamp
    from cr_items
    join acs_objects on (object_id = item_id)
    join cr_revisions on (revision_id = latest_revision) -- data
    where (package_id = $1) and (object_type = 'pdf_file')`,
    [o.package_id], {single:false})
  .then(plist =>{
    // console.log(`list_pdf:`,plist);
    return plist;
  })
//  .catch(err =>{});
}

exports.pdf_latest_revisions = async function(o) {
  _assert(o.package_id, o, 'Missing package_id')

  return db.query(`
    select
      revision_id, cr_items.item_id,
      name, cr_revisions.title,
      data->'fsize' as fsize,
      data->'timeStamp' as timeStamp
    from cr_items
    join acs_objects on (object_id = item_id)
    join cr_revisions on (revision_id = latest_revision) -- data
    where (package_id = $1) and (object_type = 'pdf_file');
    `, [o.package_id], {single:false})
  .then(plist =>{
    // console.log(`list_pdf:`,plist);
    return plist;
  })
//  .catch(err =>{});
}
