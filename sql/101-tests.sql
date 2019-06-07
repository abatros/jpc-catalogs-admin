select * from cms.revisions_latest
where package_id = 377459
and object_type = 'cms-publisher';

select * from cms.app_instances;
/*
    select f.folder_id, i.parent_id, i.name, f.label, f.package_id, p.instance_name, p.package_key
    from cr_folders f
    join apm_packages p on (p.package_id = f.package_id)
    join cr_items i on (i.item_id = f.folder_id)
    where ((p.package_key = 'cms')or(p.package_key = 'museum'))
    and parent_id = -100
*/

select
  parent_id, object_type, item_id, path,
  revision_id, title, data->>'pdf' as fn, object_title, data
from cms.revisions_latest
where package_id = 393360
order by path
;
// 18:E2:9F:F0:A2:77

delete from acs_objects where object_id = 393387;

select
  x.data->>'url' as url, (x.data->>'pageno')::integer as pageno, x.fti,
  i.*
from txt x
join cms.revisions_latest i on (i.item_id = x.object_id)
--where i.parent_id = 393362
order by item_id desc, pageno limit 50;

// -------------------------------------------------------------------------

WITH prod AS (select m_product_id, upc from m_product where upc='7094')
DELETE FROM m_productprice B
USING prod C
WHERE B.m_product_id = C.m_product_id
AND B.m_pricelist_version_id = '1000020';

// --------------------------------------------------------------------------

DELETE
FROM m_productprice B
     USING m_product C
WHERE B.m_product_id = C.m_product_id AND
      C.upc = '7094' AND
      B.m_pricelist_version_id='1000020';

/*
  ----------------------------------------------------------------------------

  drop all catalogs.

*/
select *
from acs_objects, cr_items
where (object_id = item_id)
and (parent_id = 393361);

// transform into a delete

delete
from acs_objects
using cr_items
where (object_id = item_id)
and (parent_id = 393361);
and (object_type = 'cms-article') -- option
;

// --------------------------------------------------------------------------
