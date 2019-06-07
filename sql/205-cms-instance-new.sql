/*
    - get package_key metadata.
    - create package
    - create the root-folder
*/

drop function if exists cms.package_instance__new;
drop function if exists cms.instance__new;

/*

    MINIMAL:

    select cms.instance__new(`{"name":"jpc-catalogs"}`);
    select cms_package_instance__new($1)",[{name:'museum-test'}])
    select cms_package_instance__new($1)",[{name:'museum-test', verbose:1}])

*/

create or replace function cms.instance__new(o jsonb)
  returns jsonb as
$$
// check if package_key exists (in package_types)
o.package_key = o.package_key || 'cms';
o.object_type = o.object_type || 'apm_package';
o.instance_name = o.instance_name || o.name;

if (!o.instance_name) {
  plv8.elog(INFO, `FATAL::cms.instance_new => instance_name is missing.`)
  throw 'fatal@28'
}

/*
    step-1 verify the package-key exists.
*/

const package_md = (plv8.execute('select * from apm_package_types where package_key = $1',[o.package_key])[0]);

if (!package_md) {
  if (o.verbose >0) plv8.elog(INFO, `FATAL::cms.instance_new => package_key {{o.package_key}} not found.`)
//    plv8.find_function('cms_package_type__create')(o);
  throw 'fatal-22'
}

if (o.verbose >0)
  plv8.elog(INFO, `package_key {{o.package_key}} found :`,JSON.stringify(package_md))

/*
    Step-2 check instance already exists.
*/





// here, we can create the instance.

 var package_id = null;

//select apm_package__new(null,'museum','museum','apm_package',null,null,null,null)
const query = 'select apm_package__new($1,$2,$3,$4,$5,$6,$7,$8) as package_id';

const retv = plv8.execute(query,[
 o.package_id || null,
 o.instance_name,   // name
 o.package_key,     // 'cms'
 o.object_type,     // 'apm_package'
 o.creation_date || null,
 o.creation_user || null,
 o.creation_ip || null,
 o.context_id || null,
])[0];

package_id = retv.package_id;

if (o.verbose >0) {
  plv8.elog(INFO, 'apm_package__new package_id=>', retv.package_id);
}

/*
    create root folder for this package instance.
*/

const app_folder = plv8.execute("select content_folder__new($1,$2,$3,$4,$5)",
  [
  o.instance_name || 'cms-'+package_id,    // name UNIQUE in parent_id
  o.instance_name,                         // label
  'CMS root folder for '+o.instance_name,  // description
	-100,                           // parent_id
	package_id
  ]
)[0].content_folder__new;


return {
  package_id,
  app_folder,
}
$$
LANGUAGE plv8;


--select cms_instance__new('{"name":"museum-test"}');

--select * from cms_folders;


/*
\if :iname
do $$ begin end $$;
\endif
*/
