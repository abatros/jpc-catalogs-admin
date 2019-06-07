drop view if exists cms.pages;

create or replace view cms.pages as
select txt.object_id, txt.lang, txt.fti,
  (txt.data->>'pageno')::integer as pageno,
  i.path, i.parent_id, i.latest_revision, i.content_type,
  o.package_id, o.context_id, o.object_type, o.title
from txt, cr_items i, acs_objects o
where (txt.object_id = i.item_id) and (o.object_id = i.item_id);

-- here no need for revisions.
-- this view is used by search engine.
