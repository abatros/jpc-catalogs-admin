const {_assert, xnor_name} =  require('./utils.js')

exports.commit_edition = async function(o, options) {
  const verbose = options.verbose;
  const {db, package_id, folder_id} = app;
  const {edition:name, lang, yp, publisher, path} = o;
  _assert(app, app, "Missing global var app.")
  _assert(name, o, "Missing edition.name.")
  _assert(lang, o, "Missing edition.lang.")
  _assert(path, o, "Missing edition.path.")

  Object.assign(o, {
    object_type: 'edition',
    content_type: 'content_revision',
    title: 'edition-' +name, // revision-title
    object_title: 'edition-' +name, // object-title
    name,
    path
  });

  return commit_revision(o, options)

}


exports.commit_catalog = async function(o, options) {
  const verbose = options.verbose;
  const {db, package_id, folder_id} = app;
  const {h1, pic} = o;
  let {path, lang, title, name} = o;
  let {item_id} = o;
  _assert(app, app, "Missing global var app.")
  _assert(path, o, "Missing catalog.path.")
  _assert(lang, o, "Missing catalog.lang.")

  _assert(pic, o, "Missing cr_revision.data.pic")
  _assert(h1, o, "Missing cr_revision.data.h1")
  // console.log(`Entering commit_catalog package_id:${package_id} o:`,o)

  // specific to jpc-catalogs => must be unique with parent_id.
  //const path = `U.${lang}.${_path}`;
  name = name || path
  title = title || `volume-${path} (${h1})`

  Object.assign(o, {
    object_type: 'volume-cat',
    content_type: 'content_revision',
    title, // revision-title
    object_title: title, // object-title
    name,
    path
  });

  return commit_revision(o, options)
}

exports.commit_section_pdf = async function(o, options) {
  const {db, package_id, folder_id} = app;
  const verbose = options.verbose;
  const {h2, pic, url} = o;
  let {path, lang, title, name} = o;
  let {item_id} = o;
  _assert(app, app, "Missing global var app.")
  _assert(path, o, "Missing section.path.")
  _assert(lang, o, "Missing section.lang.")

  _assert(pic, o, "Missing cr_revision.data.pic")
  _assert(h2, o, "Missing cr_revision.data.h1")
  _assert(url, o, "Missing revision.data.url.")

//  const path = `U.${lang}.${_path}`;
  name = name || path;
  title = title || `section-${path} (${h2})`

  o.context_id = o.context_id || folder_id;
  o.package_id = o.package_id || package_id;

  const data = {
    h2,pic,url
  };

  Object.assign(o, {
    object_type: 'section-pdf',
    content_type: 'content_revision',
    title, // revision-title
    object_title: title, // object-title
    name,
    path,
    data
  });

  return commit_revision(o, options)

}

/***************************************************

  Commit revision: create a new revision {acs_object, cr_revision}
  possibly with new {acs_object, cr_item}

  The client knows if first_revision or new_revision
  and need to specify cr_items when needed.

  commit_revision({item_id}) => new revision
  commit_revision({parent_id, name}) => maybe new revision
  else {
    => first revision
  }


****************************************************/


async function commit_revision(o, options) {
  const verbose = options.verbose;
  const {db, package_id, folder_id} = app;
  const {path, lang, title, object_title, name} = o;
  let {item_id, nls_language, content_type, object_type} = o;

  /**************************************************

    object_type => cr_item.object_type
    content_type => cr_revision.object_type
    no content_type => no cr_revision

    if content_type undefined, lookup into cr_item.

    cr_revision.object_type := cr_item._content_type

  ***************************************************/

  _assert(app, app, "Missing global var app.")
  _assert(path, o, "Missing item.path.")

  nls_language = nls_language || lang; // alias
  _assert(nls_language, o, "Missing revision.nsl_language.")

  // console.log(`Entering commit_section package_id:${package_id} o:`,o)

  // specific to jpc-sections => must be unique with parent_id.

  if (item_id) {
    // this should be bypassed if o.content_type defined..............................
    if (!content_type) {
      content_type = await db.query(`
        select content_type
        from cr_items
        where (item_id = ${item_id})
        `, {item_id},{single:true})
      .then(({content_type}) =>{
        _assert(content_type == 'content_revision', null, "Invalid content_type")
        // about conflict with o.content_type ?
        return content_type;
      })
      Object.assign(o,{
        object_type: content_type,
        content_type: undefined
      })
    }
    _assert(o.object_type == 'content_revision', o, "Invalid cr_revision.object.object_type")
    return add_revision(o, options);
  }

  /************************************************
    check first if (parent_id,name) is unique.
    don't start if not and GO in update mode.
  *************************************************/

  // second chance:
  _assert(name, o, "Missing item.name.")
  item_id = await db.query(`
    select item_id, content_type
    from cr_items
    where (parent_id = ${folder_id})
    and (name = '${name}');
    `, {folder_id, name},{single:true})
  .then(retv =>{
    verbose &&
    console.log(`lookup cr_item(parent_id:${folder_id}, name:${name}) => retv:`,retv);
    if (retv) {
      content_type = retv.content_type;
      return retv.item_id;
    }
  })

  if (item_id) {
    _assert(content_type, o, "Missing object.content_type")
    Object.assign(o,{
      item_id,
      object_type:content_type,
      content_type: undefined
    })
    _assert(o.object_type == 'content_revision', o, "Invalid cr_revision.object.object_type")
    return add_revision(o,{verbose});
  }
  _assert(!item_id, o, "Corrupted.")



  /************************************************
    insert acs_object, for cr_item
    HERE WE NEED MORE VALIDATION
  *************************************************/

  let {parent_id, context_id} = o;
  context_id = context_id || folder_id; // defaults to app.folder
  parent_id = parent_id || folder_id; // defaults to app.folder


  //console.log(`commit_revision@47 item_id:${item_id}`)

  _assert(context_id, o, "Missing object.context_id")
  _assert(package_id, package_id, "Missing package_id")
  _assert(context_id, context_id, "Missing context_id")
  _assert(parent_id, o, "Missing parent_id")
  _assert(object_type, o, "Missing object_type")
  _assert(object_title, o, "Missing object.title")
  _assert(content_type, o, "Missing content_type")
  _assert(path, o, "Missing item.path")
  _assert(name, o, "Missing item.name")

  await db.query(`
    -- this is cr_item.object
    insert into acs_objects
    (object_id, package_id, context_id, object_type, title)
    select
      nextval('t_acs_object_id_seq'),
      ${package_id},${context_id},'${object_type}','${object_title}'
    returning object_id as item_id;
    `, {package_id, context_id, object_type, object_title},{single:true})
  .then(async (retv) =>{
    console.log(`retv@125:`,retv)
    _assert(retv.item_id, retv, "Missing item_id")
    const {item_id} = retv;
    /************************************************
      insert cr_item
    *************************************************/
    return await db.query(`
      insert into cr_items
      (item_id, parent_id, content_type, path, name)
      values
      (${item_id},${parent_id},'${content_type}','${path}','${name}')
      `, {item_id, parent_id, content_type, path, name}, {single:true})
    .then(() =>{
      return {item_id};
    });
  })
  .then((retv) =>{
    const {item_id} = retv;
    /************************************************
      insert cr_revision
    *************************************************/
    Object.assign(o,{
      item_id,
      object_type: content_type
    });
    return add_revision(o,options)
  })

  .catch(err =>{
    console.log(`err=>:`,err)
  })
}

exports.commit_revision = commit_revision;
// ---------------------------------------------------------------------------

/***************************************************
  UPDATE will create a new revision
  IF we have a timeStamp, pass-it with the data ? for what ? non-sense.
  IF we request an update (a revision) it's because data changed.
  WE SEND ALL DATA for cr_revision ONLY
  cr_item will NOT be updated.
  WE could implement a validation-check on cr_item: nothing can change!!!

  A section UPDATE create a new revision. with {lang,pic,h1}
  IT IS NOT ALLOWED TO CHANGE parent_id, or path. USE move_section() instead.

  1. create a {acs_object}
  2. create a {cr_revision}
  3. update last_revision
****************************************************/

async function add_revision(o, options) {
  const {db, package_id, folder_id} = app;
//  const {item_id, path, lang, title, h1, pic} = o;
  const {item_id, lang, title, description, object_title, object_type, data} = o;
  let {nls_language, context_id} = o;
  context_id = context_id || folder_id; // defaults to app.folder
  nls_language = nls_language || lang; // alias

  _assert(item_id, o, "Missing revision.item_id")
  _assert(package_id, package_id, "Missing package_id")
  _assert(folder_id, folder_id, "Missing folder_id")
  _assert(context_id, context_id, "Missing object.context_id")
  _assert(object_type, o, "Missing object.object_type")
  _assert(object_type == 'content_revision', o, "Invalid cr_revision.object.object_type")
  _assert(object_title, o, "Missing object.title")
  _assert(title, o, "Missing revision.title")
//  _assert(description, o, "Missing revision.description")
  _assert(nls_language, o, "Missing revision.nls_language")


  console.log(`adding revision package_id:${package_id} o:`,o)

  /************************************************
    FIRST acs_object
  *************************************************/

  await db.query(`
    -- this is cr_revision.object
    insert into acs_objects
    (object_id, package_id, context_id, object_type, title)
    select
      nextval('t_acs_object_id_seq'),
      ${package_id},${context_id},'${object_type}','${object_title}'
    returning object_id as revision_id;
    `, {package_id, context_id, object_type, object_title},{single:true})
  .then(({revision_id}) =>{
    console.log(`add_revision@224 revision_id:${revision_id}`)
    return {revision_id}
  })
  .then(async ({revision_id}) =>{
    console.log(`revision_id@132:${revision_id}`)
    /************************************************
      insert cr_revision
    *************************************************/
    const mtime = new Date(); // now
    await db.query(`
      insert into cr_revisions
      (revision_id, item_id, title, description, nls_language)
      values
      (${revision_id},${item_id},'${title||""}','${description||""}','${nls_language}');

      -- if live:=latest ???
      update cr_items
      set latest_revision = ${revision_id}
      where item_id = ${item_id};
      `, {revision_id, item_id, title, description, nls_language, data, mtime}, {single:true});
    return {revision_id}
  })
  .then(async ({revision_id}) =>{
    if (data) {
      await db.query(`
        update cr_revisions
        set data = $1
        where revision_id = $2;

        -- for cr_items
        update acs_objects
        set last_modified = $3
        where object_id = $4;

        -- for cr_revisions
        update acs_objects
        set last_modified = $3
        where object_id = $2;

        `,[data, revision_id, new Date(), item_id])
    }
  })
  .catch(err =>{
    console.log(`err=>:`,err)
  })
}
