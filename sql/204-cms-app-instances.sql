drop view if exists cms.app_instances;
create or replace view cms.app_instances as

select
  p.package_id, p.package_key, p.instance_name,
  f.folder_id, f.label,
  i.parent_id, i.name
from cr_folders f
join apm_packages p on (p.package_id = f.package_id)
join cr_items i on (i.item_id = f.folder_id)
where parent_id = -100
and ((p.package_key = 'cms') or (p.package_key = 'museum'))
;
