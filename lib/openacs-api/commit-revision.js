const {_assert} =  require('./utils.js')
const {content_item__new} = require('./content-item-new.js');
const {content_revision__new} = require('./content-revision-new.js');
const hash = require('object-hash');
const {select_cr_item} = require('./select-cr-item.js')

/*
  CR_ITEM          CR_REVISION
==============================================================
name,                               // character varying,
parent_id,                          // integer,
locale,                             // character varying,
context_id,                         // integer,
item_subtype,                       // character varying,
content_type,                       // character varying,
relation_tag,                       // character varying,
is_live,                            // boolean,  DO NOT SET TO TRUE!
storage_type,                       // cr_item_storage_type_enum : text,file,lob
with_child_rels                     // boolean DEFAULT true
path                                // ltree classification 'M.4'

(item_id)          item_id          // integer,
creation_date,     creation_date    // timestamp with time zone,
creation_user,     creation_user    // integer,
creation_ip,       creation_ip      // character varying,
title,             title            // character varying,
description,       description      // text,
mime_type,         mime_type        // character varying,
nls_language,      ns_language      // character varying,
text,              text             // character varying, NEVER USED in Museum
data,              data             // text, NEVER USED.
package_id,        package_id       // integer DEFAULT NULL::integer,

                  publish_date,     // 3: timestamp w/tz
                  (revision_id)     // 8: integer,
                  content_length,   // 12: integer

*/

async function latest_revision1(item_id) {
  return db.query(`
    select
      cr_items.item_id, name, parent_id, title,
      revision_id,
--      latest_revision,
      description -- checksum
    from cr_items
    join cr_revisions on (revision_id = latest_revision)
    where cr_items.item_id = $1
    `, [item_id], {single:true})
};

/*

  return cr_item with it's latest revision
  ATTN: need left join for the case no cr_revision

*/

async function latest_revision2(parent_id, name) {
  return db.query(`
    select
      cr_items.item_id, name, parent_id, title, path,
      revision_id,
--      latest_revision,
      description -- checksum
    from cr_items
    left join cr_revisions on (revision_id = latest_revision)
    where (parent_id = $1) and (name = $2)
    `, [parent_id, name], {single:true})
//  .then(retv =>{
//    return Object.assign(retv, {checksum:retv.description});
//  });

}

async function revision_data(revision_id) {
  return db.query(`
    select data from cr_revisions where revision_id = $1
    `, [revision_id], {single:true})
}



// ----------------------------------------------------------------------------

function create_first_revision(o, options) {
  options = options || {};
  const verbose = options.verbose;

  _assert(!o.item_id, o, '[create_first_revision] item_id should not be defined here.')
  _assert(o.parent_id, o, '[create_first_revision] Missing parent_id')
  _assert(o.name, o, '[create_first_revision] Missing name')
  _assert(o.path, o, '[create_first_revision] Missing ltree:path')
  verbose && console.log(`Entering create_first_revision.`)

  /*
    INSERT CR_ITEM WITH CR_REVISION.
    IF IT FAILS (already exists)
  */

  // PREP THE checksum into => o.description

  _assert(o.path, o, "Missing o.path")

  return content_item__new(o)
  .then(async item_id =>{
    const o2 = await latest_revision1(item_id);
    const {revision_id} = o2;
    const new_checksum = o.json_data && hash(o.json_data, {algorithm: 'md5', encoding: 'base64' });

    if (o.json_data) {
      // there is no previous cr_revision =>
      await db.query(`
        update cr_revisions set data = $1, description = $2 where revision_id = $3
        `,[o.json_data, new_checksum, revision_id],{single:true})
    }

    Object.assign(o2, {description: new_checksum})

    if (options.return_data) {
      await revision_data(revision_id)
      .then(o3 =>{
        //console.log(`assigning data o3:`,o3)
        Object.assign(o2, o3);
      });
    }



    return o2;
  })
  .catch(async err =>{
    switch (+err.code) {
      case 23505: // already exists (parent_id, name)
        if (verbose) {
          console.log(`add-revision WARNING -already-exists- in commit_revision`)
        }
        /*
            cr_item already exists. (parent_id, name)
            The caller was not aware of this existing cr_item.
            from here we could switch to add_revision()....
            but we choose not for now ...
        */

        const latest = await latest_revision2(o.parent_id, o.name);
        verbose && console.log(`latest:`,latest)


        /**************************************************
          UPDATE cr_item if one of {path,name,...} changed
        **************************************************/

        if (latest.path != o.path) {
          await db.query(`
            update cr_items set path = $1 where item_id = $2;
            `, [o.path, latest.item_id], {single:true})
          .then(retv =>{
            verbose && console.log(`cr_item.path UPDATED retv:`,retv);
          })
        }




        return {
          error: 'cr_item already exists',
          original_object: o
        }

        throw 'we should not be here...'

        _assert(!o.revision_id, o, "revision_id should be null")
        return latest_revision2(o.parent_id, o.name)
        .then(rev =>{
          console.log(`latest_revision2 rev:`,rev)
          console.log(`latest_revision2(parent_id:${rev.parent_id}, name:${rev.name})`)
          const o3 = Object.assign(o, rev, {warning:err.detail, revision_id:null});
          _assert(o3.item_id, o3, 'Missing item_id');
          return add_revision(o3, options);
        });
        break;
      }
    console.log('[commit-revision] err:',err)
    throw "TODO @95"
  })
} // commit_revision_no_item

// ----------------------------------------------------------------------------

async function add_revision(o, options) {
  options = options || {};
  const verbose = options.verbose;

  verbose &&
  console.log(`Entering add_revision (item_id:${o.item_id} description(checksum):${o.description}) with-data:${!!(o.json_data)}`)

  _assert(!o.revision_id, o, "revision_id should be null")
  _assert(o.item_id, o, "Missing item_id")
  _assert(o.path, o, '[add_revision] Missing ltree:path')


  //if (!o.json_data) throw "MISSING DATA"

  const latest_revision = await latest_revision1(o.item_id)
  _assert(latest_revision, o, "Missing latest revision")
  _assert(latest_revision.revision_id, o, "Missing latest revision")


  /**************************************************
    UPDATE cr_item if one of {path,name,...} changed
  **************************************************/

  if (latest_revision.path != o.path) {
    await db.query(`
      update cr_items set path = $1 where item_id = $2;
      `, [o.path, o.item_id], {single:true})
    .then(retv =>{
      verbose && console.log(`cr_item.path UPDATED retv:`,retv);
    })
  }

  const latest_checksum = latest_revision.checksum || latest_revision.description;
  const new_checksum = o.json_data && hash(o.json_data, {algorithm: 'md5', encoding: 'base64' });

  if (verbose) {
    console.log(`-- latest_revision:`,latest_revision.revision_id)
    console.log(`-- checksum (${new_checksum}) => (${latest_checksum})`);
  }

  /*
      Quit if same checksum. OR NO DATA ?
  */


  if (new_checksum == latest_checksum) {
    if (verbose) {
      console.log(`-- exit with no-update`)
    }
    if (options.return_data) {
      await revision_data(latest_revision.revision_id)
      .then(odata =>{
        // console.log(`data@188:`,data)
        // odata == { data: { fsize: 7400075, timeStamp: '2017-07-23T20:53:19.111Z' } }
        Object.assign(latest_revision, odata);
      })
    }

    return Object.assign(latest_revision, {warning:'no-change-in-checksum'})
  }

  // o.checksum = new_checksum; // will be the new "latest checksum"
  o.description = new_checksum; // will be the new "latest checksum"
  const revision_id = await content_revision__new(o); // never fails.
  _assert(revision_id, o, "missing revision_id")

  if (verbose) {
    console.log(`
      -- revision_id latest:${latest_revision.revision_id} => new:${revision_id}
      `)
  };

  // no need to update checksum... already there
  await db.query(`
    update cr_revisions set data = $1 where revision_id = $2
    `,[o.json_data, revision_id],{single:true})

  Object.assign(o, {revision_id});

//  const x = await latest_revision1(o.item_id)
//  console.log('xcheck:',x);
  if (options.return_data) {
    await revison_data(revision_id)
    then(o2 =>{
      Object.assign(o, o2);
    });
  }


  return o;
}

// ----------------------------------------------------------------------------

exports.commit_revision = async function(o, options) {
  options = options || {};

  if (!o.item_id) {
    return create_first_revision(o, options)
  }

  if (o.item_id) {
    return add_revision(o, options)
  }
throw 'we should not be here....'

  if (o.item_id) {
    /*
        IT MUST BE A NEW REVISION
    */
    const latest_revision = await select_latest_revision(o.item_id)
    const latest_checksum = latest_revision.checksum;
    const revision_id = o.revision_id = await content_revision__new(o); // never fails.

    if (o.data) {
      const new_checksum = hash(o.data, {algorithm: 'md5', encoding: 'base64' });
      if (new_checksum != latest_checksum) {
        // update cr_item
        await db.query(`
          update cr_revisions set data = $1, description = $2 where revision_id = $3
          `,[o.json_data, new_checksum, revision_id],{single:true})
      } // if != checksum
    } // if o.data
  } else {

throw 'WE SHOULD NOT BE HERE'
    /*
        IT MUST BE A FIRST REVISION
    */

    o.item_id = await content_item__new(o)
    .then(item_id =>{
      return item_id;
    })
    .catch(async err =>{
      switch (+err.code) {
        case 23505: // already exists (parent_id, name)
          if (options.verbose) {
            //console.log(`WARNING -already-exists- in commit_revision`)
          }
          /*
              we have collision, what is the
          */
          const {item_id} = await select_cr_item(o);
          Object.assign(o, {item_id, warning:err})
          break;
        }
      throw "TODO @81"
    });

    const latest_revision = await select_latest_revision(item_id);
    if (o.data) {
      const new_checksum = hash(o.data, {algorithm: 'md5', encoding: 'base64' });
      await db.query(`
        update cr_revisions set data = $1, description = $2 where revision_id = $3
        `,[o.data, new_checksum, revision_id],{single:true})
    }
    new_revision_id = latest_revision.revision_id;
  }

  if (options.full_data) {
    return db.query(`
      select cr_revisions.*, cr_items.*, o.package_id
      from cr_revisions
      join cr_items on (revision_id = latest_revision)
      join acs_objects o on (object_id = revision_id)
      where revision_id = $1
      `, [new_revision_id], {single:true})
    .then(o2 =>{
      return Object.assign(o2, {checksum:retv.description});
    });
  } else {
    return Object.assign({},{
      revision_id: new_revision_id,
      item_id: o2.item_id,
      warning: o.warning
    })
  }
} // content_revision.
