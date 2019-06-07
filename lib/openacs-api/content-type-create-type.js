const {_assert} =  require('./utils.js')

exports.create_content_type = function(o) {
  const {content_type, supertype, pretty_name, pretty_plural, table_name, id_column, name_method} =o;
  _assert(content_type, o, 'Missing content_type')
  supertype = supertype || 'content_revision';
  _assert(supertype, o, 'Missing supertype')

  return db.query(`
    select content_type__create_type($1,$2,$3,$4,$5,$6,$7);
    `,[
      content_type, supertype, pretty_name, pretty_plural, table_name, id_column, name_method
    ], {single:true});
}
