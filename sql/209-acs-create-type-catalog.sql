do $$


//plv8.execute('select acs_object_type__drop_type($1,$2)',['scooru_team',true]);
//plv8.execute('select acs_object_type__drop_type($1,$2)',['scooru_game',true]);


const o1 = {
  object_type: 'jpc-catalog',
  pretty_name: 'JPC Catalog',
  pretty_plural: 'JPC Catalog',
  supertype: 'content_revision',
  table_name: null,
  id_column: null,
  package_name: null,
  abstract_p: false,
  type_extension_table: null,
  name_method: null
}

const query = 'select acs_object_type__create_type($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as iret';

const retv = plv8.execute(query,[
  o1.object_type,
  o1.pretty_name,
  o1.pretty_plural,
  o1.supertype,
  o1.table_name,
  o1.id_column,
  o1.package_name,
  o1.abstract_p,
  o1.type_extension_table,
  o1.name_method
  ]);

plv8.elog(NOTICE, `Create jpc-catalog retv:`,retv);

$$ language plv8;
