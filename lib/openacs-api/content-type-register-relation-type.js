const {_assert} =  require('./utils.js')

exports.content_type__register_relation_type = function(o) {
  const {content_type, target_type, relation_tag, min, max} =o;
  _assert(content_type, o, 'Missing content_type')
  _assert(target_type, o, 'Missing target_type')

  return db.query(`
    select content_type__register_relation_type($1,$2,$3,$4,$5);
    `,[
      content_type, target_type, relation_tag, min, max
    ], {single:true});
}
