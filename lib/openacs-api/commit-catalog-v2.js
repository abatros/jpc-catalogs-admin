const {_assert, xnor_name} =  require('./utils.js')

exports.commit_catalog = async function(o, options) {
  const verbose = options.verbose;
  const {db, package_id, folder_id} = app;
  const {h1, pic} = o;
  let {path:_path, lang, title} = o;
  let {item_id} = o;
  _assert(app, app, "Missing global var app.")
  _assert(_path, o, "Missing catalog.path.")
  _assert(lang, o, "Missing catalog.lang.")

  _assert(pic, o, "Missing cr_revision.data.pic")
  _assert(h1, o, "Missing cr_revision.data.h1")
  // console.log(`Entering commit_catalog package_id:${package_id} o:`,o)

  // specific to jpc-catalogs => must be unique with parent_id.
  const path = `U.${lang}.${_path}`;
  const name = o.name || `U::${lang}::${_path}`
  title = title || `catalog-${path} (${h1})`

  if (item_id) {
    return commit_update_catalog(o, options);
  }

  /************************************************
    check first if (parent_id,name) is unique.
    don't start if not and GO in update mode.
  *************************************************/

  // second chance:
  item_id = await db.query(`
    select item_id from cr_items
    where (parent_id = $1)
    and (name = $2);
    `, [folder_id, name],{single:true})
  .then(retv =>{
    verbose &&
    console.log(`lookup cr_item(parent_id:${folder_id}, name:${name}) => retv:`,retv);
    if (retv) {
      return retv.item_id;
    }
  })

  if (item_id) {
    return commit_update_catalog(Object.assign(o,{item_id}),{verbose});
  }


  console.log(`commit_catalog@47 item_id:${item_id}`)
  _assert(!item_id, o, "Corrupted.")

  /************************************************
    insert acs_object, for cr_item
  *************************************************/

  await db.query(`
    insert into acs_objects
    (object_id, package_id, context_id, object_type, title)
    select
      nextval('t_acs_object_id_seq'),
      $1,$2,$3,$4
    returning object_id as item_id;
    `,[package_id, folder_id, 'pdf_file', title],{single:true})
  .then(async ({item_id}) =>{
    console.log(`item_id@35:${item_id}`)
    /************************************************
      insert second acs_object for (cr_revision)
    *************************************************/
    return await db.query(`
      insert into acs_objects
      (object_id, package_id, context_id, object_type, title)
      select
        nextval('t_acs_object_id_seq'),
        $1,$2,$3,$4
      returning object_id as revision_id;
      `,[package_id, folder_id, 'jpc-catalog', title],{single:true})
    .then(({revision_id}) =>{
      console.log(`revision_id:${revision_id}`)
      return {item_id,revision_id}
    })
  })
  .then(async (retv) =>{
    console.log(`retv@53:`,retv)
    _assert(retv.item_id, retv, "Missing item_id")
    const {item_id,revision_id} = retv;
    /************************************************
      insert cr_item
    *************************************************/
    return await db.query(`
      insert into cr_items
      (item_id, parent_id, content_type, path, name)
      values ($1,$2,$3,$4,$5)
      `, [item_id, folder_id, 'jpc-catalog', ''+path, name], {single:true})
    .then(() =>{
      return retv;
    });
  })
  .then((retv) =>{
    const {item_id,revision_id} = retv;
    /************************************************
      insert cr_revision
    *************************************************/
    const data = {pic, h1}
    return db.query(`
      insert into cr_revisions
      (revision_id, item_id, title, description, nls_language, data)
      values ($1,$2,$3,$4,$5,$6);

      update cr_items
      set latest_revision = $1
      where item_id = $2;

      update acs_objects
      set last_modified = $7
      where object_id = $2;
      `, [revision_id, item_id, null, null, lang, data, new Date()], {single:true})
  })

  .catch(err =>{
    console.log(`err=>:`,err)
  })
}

// ---------------------------------------------------------------------------

/***************************************************
  UPDATE will create a new revision
  IF we have a timeStamp, pass-it with the data ? for what ? non-sense.
  IF we request an update (a revision) it's because data changed.
  WE SEND ALL DATA for cr_revision ONLY
  cr_item will NOT be updated.
  WE could implement a validation-check on cr_item: nothing can change!!!

  A CATALOG UPDATE create a new revision. with {lang,pic,h1}
  IT IS NOT ALLOWED TO CHANGE parent_id, or path. USE move_catalog() instead.

  1. create a {acs_object}
  2. create a {cr_revision}
  3. update last_revision
****************************************************/

async function commit_update_catalog(o, options) {
  const {db, package_id, folder_id} = app;
//  const {item_id, path, lang, title, h1, pic} = o;
  const {item_id, lang, title, h1, pic} = o;
  _assert(item_id, o, "Missing item_id")
  console.log(`commit_catalog (UPDATE) package_id:${package_id} o:`,o)

  await db.query(`
    insert into acs_objects
    (object_id, package_id, context_id, object_type, title)
    select
      nextval('t_acs_object_id_seq'),
      $1,$2,$3,$4
    returning object_id as revision_id;
    `,[package_id, folder_id, 'content_revision', title],{single:true})
  .then(async ({revision_id}) =>{
    console.log(`revision_id@132:${revision_id}`)
    /************************************************
      insert cr_revision
    *************************************************/
    const data = {pic, h1}
    await db.query(`
      insert into cr_revisions
      (revision_id, item_id, title, description, nls_language, data)
      values ($1,$2,$3,$4,$5,$6)
      `, [revision_id, item_id, null, null, lang, data], {single:true});
    return {revision_id}
  })
  .then(({revision_id}) =>{
    /************************************************
      update cr_item set last_revision
    *************************************************/
    return db.query(`
      update cr_items
      set latest_revision = $1
      where item_id = $2;
      update acs_objects
      set last_modified = $3
      where object_id = $2;
      `, [revision_id, item_id, new Date()], {single:true})
  })
  .catch(err =>{
    console.log(`err=>:`,err)
  })
}
