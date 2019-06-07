drop view if exists cms.pdf_files;
drop view if exists cms.sections_pdf;

create or replace view cms.sections_pdf as
select
  revision_id,
  o.object_type,
  nls_language, i.path, i.name,
  ro.last_modified, -- this is object for cr_item not cr_revision...
  i.item_id, i.parent_id, latest_revision,
  o.title, o.package_id, o.context_id, i.content_type,
  data
from cr_revisions r, acs_objects o, cr_items i, acs_objects ro
where (o.object_id = i.item_id) and (r.item_id = i.item_id) and (ro.object_id = r.revision_id) and (r.revision_id = i.latest_revision)
--and (o.package_id = 393360)
and (o.object_type = 'section-pdf')
--and (path <@ 'U')
--order by i.item_id desc limit 3000
;
