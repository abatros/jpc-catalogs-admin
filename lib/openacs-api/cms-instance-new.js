const {_assert} =  require('./utils.js')

exports.cms_instance__new = async function(o) {

  o.instance_name = o.instance_name || o.name;
  _assert(o.instance_name, o, "Missing name/instance_name")


  const {
    instance_name, object_type, package_key,
    creation_date, creation_user, creation_ip, context_id
  } = o;

  // THE CALLER SHOULD CHECK IF PACKAGE EXISTS FIRST,

  _assert(!o.package_id, o, "Alert package_id NOT NULL")

  /*
      IMPOSSIBLE to have unique composite key...

      The only way is to check on app.instancename === app_folder.label

  */


  const app_folders = await db.query(`
    -- make sure the app does not exists:

    select f.folder_id, i.parent_id, i.name, f.label, f.package_id, p.instance_name
    from cr_folders f
    join apm_packages p on (p.package_id = f.package_id)
    join cr_items i on (i.item_id = f.folder_id)

    --  join acs_objects o on (o.object_id = f.folder_id)

    where (p.package_key = 'cms')
    and parent_id = -100
    and p.instance_name = $1
    `,[instance_name],{single:false});

  if (app_folders.length >0) {
    return {app_folders};
  }


  // here, we can create the instance.

  const package_id = null;

  await db.query(`
    select apm_package__new($1,$2,$3,$4,$5,$6,$7,$8) as package_id
    `,[
      package_id,               // null.
      instance_name,            // or name
      package_key || 'cms',              // 'cms'
      object_type || 'apm_package',
      creation_date || null,
      creation_user || null,
      creation_ip || null,
      context_id || null
    ], {single:true})
  .then(retv =>{
    package_id = retv.package_id; // => global variable
  });


  // THEN the app-folder.
  await db.query(`
    select content_folder__new($1,$2,$3,$4,$5);
    `, [
        'cms-'+package_id,    // name UNIQUE in parent_id:-100 !!!!!!
        instance_name,                         // label
        'CMS root folder for ' + instance_name,  // description
      	-100,                  // parent_id
      	package_id
      ], {single:true})
  .then(retv =>{
    return retv;
  })


} // cms_instance_new.
