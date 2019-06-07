const {_assert} =  require('./utils.js')
const {select_cr_item} = require('./select-cr-item.js')

/*

    Just a wrapper around content_item__new.
    NEVER USES DATA.
*/


exports.content_item__new = async function(o) {

  if (o.data) throw 'data not allowed in content_item__new.'

  _assert(o.name, o, 'Missing cr_item.name');
  _assert(o.parent_id, o, 'Missing cr_item.parent_id');
  _assert(o.path, o, "Missing o.path")



  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'content_item';
  // o.title = o.title || '*undefined title to create revision*';
  o.storage_type = o.storage_type || 'text';

  /*
      Create a cr_item without revision => content_type:null.
  */

  const {
    name,                 // 1: character varying,
    parent_id,            // 2: integer,
    item_id,              // 3: integer,
    locale,               // 4: character varying,
    creation_date,        // 5: timestamp with time zone,
    creation_user,        // 6: integer,
    context_id,           // 7: integer,
    creation_ip,          // 8: character varying,
    item_subtype,         // 9: character varying,
    content_type,         // 10: character varying,
    title,                // 11: character varying,
    description,          // 12: text,
    mime_type,            // 13: character varying,
    nls_language,         // 14: character varying,
    text,                 // 15: character varying,
    data,                 // 16: text,
    relation_tag,         // 17: character varying,
    is_live,              // 18: boolean,  DO NOT SET TO TRUE!
    storage_type,         // 19: cr_item_storage_type_enum : text,file,lob
    package_id,           // 20: integer DEFAULT NULL::integer,
    with_child_rels,      // 21: boolean DEFAULT true
    path                  // extra parameter for classification using ltree.
  } = o;



  const query = 'select * from content_item__new($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) as item_id';
  return db.query(query,[
    name,                 // 1: character varying,
    parent_id,            // 2: integer,
    item_id,              // 3: integer,
    locale,               // 4: character varying,
    creation_date,        // 5: timestamp with time zone,
    creation_user,        // 6: integer,
    context_id,           // 7: integer,
    creation_ip,          // 8: character varying,
    item_subtype,         // 9: character varying,
    content_type,         // 10: character varying,
    title,                // 11: character varying,
    description,          // 12: text,
    mime_type,            // 13: character varying,
    nls_language,         // 14: character varying,
    text,                 // 15: character varying,
    data,                 // 16: text,
    relation_tag,         // 17: character varying,
    is_live,              // 18: boolean,  DO NOT SET TO TRUE!
    storage_type,         // 19: cr_item_storage_type_enum : text,file,lob
    package_id,           // 20: integer DEFAULT NULL::integer,
    with_child_rels       // 21: boolean DEFAULT true
  ], {single:true})
  .then(retv =>{
    return retv.item_id
  })
}
