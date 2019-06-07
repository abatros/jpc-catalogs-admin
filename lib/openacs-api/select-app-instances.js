const {_assert} =  require('./utils.js')

const get_app_instance2 = async function (instance_name) {
  if (!db) throw 'DB-NOT-READY'

  // this can be used everywhere
  const museum_instances = `
    select * from museum.folders_directory
    where parent_id = -100
    and instance_name = $1
  `;

  const apps = await db.query(museum_instances,
    [instance_name], {single:false})
  console.log('apps:',apps)
}


const new_select = `
-- look for app-instance with app-folder : (parent_id:-100, i.name) unique.

    select f.folder_id, i.parent_id, i.name, f.label, f.package_id, p.instance_name
    from cr_folders f
    join apm_packages p on (p.package_id = f.package_id)
    join cr_items i on (i.item_id = f.folder_id)

    --  join acs_objects o on (o.object_id = f.folder_id)

    where (p.package_key = 'cms')
    and parent_id = -100
--    and instance_name = 'jpc'
`;


exports.select_app_instance = async function (instance_name) {
  if (!db) throw 'get_app_instance::DB-NOT-READY@64'

  const museum_instances = `
    select f.folder_id, i.parent_id, i.name, f.label, f.package_id, p.instance_name
    from cr_folders f
    join apm_packages p on (p.package_id = f.package_id)
    join cr_items i on (i.item_id = f.folder_id)

    --  join acs_objects o on (o.object_id = f.folder_id)

    where ((p.package_key = 'cms') or (p.package_key = 'museum'))
    and parent_id = -100
    and instance_name = $1
  `;

  return db.query(museum_instances,[instance_name], {single:false})
  .then(apps =>{
    if (apps.length <=0) {
      //throw 'CMS app-instance not found'
      return [];
    }
    if (apps.length != 1) {
      console.log(apps)
      throw 'CMS app-instance not unique'
    }
    package_id = apps[0].package_id
    app_folder = apps[0].folder_id
    _assert(package_id, apps, 'UNABLE to get app')
    return apps[0]
  })
  .catch(err =>{
    throw err;
  })
}



exports.select_app_folders = async function(instance_name) {
  const app_folders = `
    select f.folder_id,
      i.parent_id, i.name, i.content_type,
      f.label, f.package_id, p.instance_name
    from cr_folders f
    join apm_packages p on (p.package_id = f.package_id)
    join cr_items i on (i.item_id = f.folder_id)

    --  join acs_objects o on (o.object_id = f.folder_id)

    where ((p.package_key = 'cms') or (p.package_key = 'museum'))
--    and parent_id = -100
    and instance_name = $1
  `;

  const folders = await db.query(app_folders,
    [instance_name], {single:false})
//  console.log('folders:', folders)
  folders.forEach(folder=>{
    switch(folder.name) {
      case 'publishers': pfolder_id = folder.folder_id; break;
      case 'auteurs': afolder_id = folder.folder_id; break;
      default: root_folder_id = folder.folder_id;
    }
  })
  return folders;
}
