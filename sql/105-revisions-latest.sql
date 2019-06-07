drop view if exists cms.revisions_latest;

/*
    9 parameters
*/

create or replace view cms.revisions_latest as
  select
    i.item_id, i.parent_id, i.name, i.path,
    r.revision_id, r.title, r.description, r.data,
    o.package_id, o.object_type, o.title as object_title
  from cr_items i
  join acs_objects o on (o.object_id = i.item_id)
  left join cr_revisions r on (r.revision_id = i.latest_revision);




/*
CREATE OR REPLACE VIEW museum.items AS
 SELECT
    i.item_id,
    i.parent_id,
    i.name,
    i.locale,
    i.live_revision,
    i.latest_revision,
    i.publish_status,
    i.content_type,
    i.storage_type,
    i.storage_area_key,
    i.tree_sortkey,
    i.max_child_sortkey,
    o.title,
    o.package_id,
    o.object_type
   FROM cr_items i
     JOIN acs_objects o ON o.object_id = i.item_id;


drop view if exists museum.articles_latest_revision;
drop view if exists museum.articles_latest_revisions;

create or replace view museum.articles_latest_revision as
select
  r.*,
  --i.item_id,
  i.parent_id,
  i.name,
  i.locale,
  i.live_revision,
  i.latest_revision,
  i.publish_status,
  i.content_type,
  i.storage_type,
  i.storage_area_key,
  i.path,
  o.title as object_title,
  o.package_id,
  o.object_type

from cr_revisions r
join cr_items i on (i.item_id = r.item_id) and (i.latest_revision = r.revision_id)
join acs_objects o on (o.object_id = r.item_id)
--where ()
;
*/
