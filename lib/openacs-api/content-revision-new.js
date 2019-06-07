


exports.content_revision__new = function(o) {
  if (o.revision_id) throw 'revision_id should be null.'
  const {
    title,                // 1: character varying,
    description,          // 2: text,
    publish_date,         // 3: timestamp w/tz
    mime_type,            // 4: character varying,
    nls_language,         // 5: character varying,
    text,                 // 6: character varying,
    item_id,              // 7: integer,
    revision_id,          // 8: integer,
    creation_date,        // 9: timestamp with time zone,
    creation_user,        // 10: integer,
    creation_ip,          // 11: character varying,
    content_length,       // 12: integer
    package_id,           // 13: integer DEFAULT NULL::integer,
  } = o;

  const query = 'select * from content_revision__new($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, $13) as revision_id';
  return db.query(query,[
    title,                // 1: character varying,
    description,          // 2: text,
    publish_date,         // 3: timestamp w/tz
    mime_type,            // 4: character varying,
    nls_language,         // 5: character varying,
    text,                 // 6: character varying,
    item_id,              // 7: integer,
    revision_id,          // 8: integer,
    creation_date,        // 9: timestamp with time zone,
    creation_user,        // 10: integer,
    creation_ip,          // 11: character varying,
    content_length,       // 12: integer
    package_id,           // 13: integer DEFAULT NULL::integer,
  ], {single:true})
  .then(retv =>{
    return retv.revision_id
  })


} // content_revision__new
