const {_assert} =  require('./utils.js')


/*

    -----------------------------------------------------------------

    ex: get all publishers

    api.revisions_latest({
      parent_id: app_folder,
      object_type: 'cms-publisher',
      path: 'constructeur'
    })

    -----------------------------------------------------------------

    Get all articles for publisher: 654789

    api.revisions_latest ({
      parent_id: 654789,
      object_type: 'cms-article',
      path: 'A.FRANCE.PARIS'
    })

    -----------------------------------------------------------------

    Get all authors for app

    api.revisions_latest ({
      parent_id: app_folder,
      object_type: 'cms-article',
      path: 'A.FRENCH'
    })

    -----------------------------------------------------------------

*/


exports.revisions_latest = async function(o) {

  // SHOULD BE A VIEW

  _assert(o.parent_id, o, "Missing parent_id")

  return db.query(`
    select
      i.item_id, i.name, i.parent_id,
      r.revision_id, r.title, r.description -- checksum
      o.object_id, o.package_id, o.object_type
    from cr_items i
    join acs_objects o on (o.object_id = i.item_id)
    left join cr_revisions r on (r.revision_id = i.latest_revision)
    where (i.parent_id = $1)
    `, [parent_id], {single:false})
}
