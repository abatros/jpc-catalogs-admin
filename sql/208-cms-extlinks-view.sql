drop view if exists cms.extlinks;
create or replace view cms.extlinks as

select
  x.url, x.label, x.description as xdescription,
  i.content_type, i.parent_id, i.name, i.path, i.item_id,
  o.object_type, o.package_id, o.title, o.object_id, o.context_id,
  r.revision_id, r.title as revision_title, r.description, r.nls_language as lang, r.data
from cr_extlinks x
join cr_items i on (i.item_id = x.extlink_id)
join acs_objects o on (o.object_id = x.extlink_id)
left join cr_revisions as r on (r.revision_id = i.latest_revision)
--where parent_id = -100
;
