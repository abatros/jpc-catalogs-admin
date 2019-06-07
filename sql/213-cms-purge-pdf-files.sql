create or replace function cms.purge_pdf_files(_package_id integer)
returns integer as
$$
declare
count integer;
begin
  delete
  from cr_revisions r
  using acs_objects o, cr_items i
  where (object_id = revision_id) and (i.item_id = r.item_id)
  and (revision_id != i.latest_revision)
  and (package_id = _package_id)
  and (o.object_type = 'pdf-file')
  and (path <@ 'U');

  GET DIAGNOSTICS count = ROW_COUNT;
  return count;
end;
$$ language plpgsql;
