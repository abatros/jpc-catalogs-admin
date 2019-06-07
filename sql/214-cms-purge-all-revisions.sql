drop function if exists cms.purge_all_revisions(integer);
drop function if exists cms.purge_all_revisions(integer, ltree);

create or replace function cms.purge_all_revisions(_package_id integer, root ltree)
returns integer as
$$
declare
count integer;
begin
  delete
  from acs_objects o
  using cr_revisions r, cr_items i
  where (object_id = revision_id) and (i.item_id = r.item_id)
  and (revision_id != i.latest_revision)
  and (package_id = _package_id)
  and (path <@ root)
  ;

  GET DIAGNOSTICS count = ROW_COUNT;
  return count;
end;
$$ language plpgsql;
