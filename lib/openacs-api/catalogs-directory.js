const {_assert} = require('./utils.js')

exports.catalogs_directory_all = async function(){
  const query = `
  select
    r.revision_id,
    r.title as revision_title,
    i.item_id,
    i.name,
    i.latest_revision,
    i.parent_id as constructeur_id,
    i.publish_status, -- production-ready-live-expired
    i.content_type,   -- ?= object_type ?= 'cms-article' Obviously NOT ! it's always 'content_revision'
    r.description,
    r.data,
    o.package_id,
    o.object_type,
    o.title,
    -- ico.name -- encoded
    p.title as constructeur_title
  from cr_revisions as r
  join cr_items as i on (i.item_id = r.item_id)
  join acs_objects as o on (o.object_id = i.item_id)
  -- join cr_items as ico on (ico.item_id = i.parent_id)
  join acs_objects as p on (p.object_id = i.parent_id) -- publisher/constructeur
  where (o.package_id = $1)
  and (o.object_type = 'cms-article')
  order by revision_title;
  `;


  return db.query(query, [package_id], {single:false})
  .then(cats =>{
    return cats.map(cat => {
      const xid = cat.data && cat.data.xid
      return Object.assign(cat, {checksum:cat.description, xid})
    })
  });

};

// ---------------------------------------------------------------------------

exports.catalogs_directory = async function(){
  const query_2 = `
    select
      i.item_id,
      i.name,
      i.parent_id,
      i.content_type,
      i.latest_revision,
      o.object_type,
      o.title,
      o.package_id
    from cr_items i
    join acs_objects o on (o.object_id = i.item_id)
    where (i.parent_id = $1)
    order by i.item_id;
  `;

  const query_3 = `
  select
    i.item_id,
    i.name,
    i.latest_revision,
    i.parent_id,
    i.publish_status, -- production-ready-live-expired
    i.content_type,   -- ?= object_type ?= 'cms-article' Obviously NOT ! it's always 'content_revision'
    r.revision_id,
    r.title as revision_title,
    r.checksum,
    r.data,
    o.package_id,
    o.object_type,
    o.title as item_title,
    io.title as revision_object_title,
    io.object_type as revision_object_type
  from cr_items as i
  join cr_revisions as r on (r.revision_id = i.latest_revision)
  join acs_objects as io on (io.object_id = i.item_id)
  join acs_objects as o on (o.object_id = r.revision_id)
  where (io.package_id = $1)
  and (io.object_type = 'cms-article');
  `;

  const query = `
  select
    r.revision_id,
    r.title as revision_title,
    i.item_id,
    i.name,
    i.latest_revision,
    i.parent_id as constructeur_id,
    i.publish_status, -- production-ready-live-expired
    i.content_type,   -- ?= object_type ?= 'cms-article' Obviously NOT ! it's always 'content_revision'
    r.description,
    r.data,
    o.package_id,
    o.object_type,
    o.title,
    -- ico.name -- encoded
    p.title as constructeur_title
  from cr_revisions as r
  join cr_items as i on (r.revision_id = i.latest_revision)
  join acs_objects as o on (o.object_id = i.item_id)
  -- join cr_items as ico on (ico.item_id = i.parent_id)
  join acs_objects as p on (p.object_id = i.parent_id)
  where (o.package_id = $1)
  and (o.object_type = 'cms-article')
  order by revision_title;
  `;


  return db.query(query, [package_id], {single:false})
  .then(cats =>{
    return cats.map(cat => {
      const xid = cat.data && cat.data.xid
      return Object.assign(cat, {checksum:cat.description, xid})
    })
  });
}
