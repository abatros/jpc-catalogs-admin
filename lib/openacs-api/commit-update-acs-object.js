const {_assert, xnor_name} =  require('./utils.js')

exports.commit_update_acs_object = function(o) {
  if (!o.object_id) {
    throw 'commit_update_acs_object -- Missing object_id'
  }
  const props = (({
    object_type, title, context_id
  }) => ({
    object_type, title, context_id
  }))(o);

  _assert(Object.keys(props).length ==3, props, "CORRUPTED")

  /*
      Build the update-query
  */

  const data = [];
  const _query = [];
  Object.keys(props).forEach(key =>{
    if (props[key] != undefined) {
      // could be null...
      data.push(props[key]);
      _query.push(`${key} = \$${data.length}`)
    }
  })
  console.log(`commit_update_acs_object _query: ${_query.join(', ')}`);
  console.log(`commit_update_acs_object data: `,data);
  console.log(`ALERT working...`)
}
