const {_assert, xnor_name} =  require('./utils.js')

exports.content_item__update = async function (o) {
  _assert(o.item_id, o, 'commit_update_cr_item -- Missing cr_item.item_id')

  const props = (({
    parent_id, name, locale, live_revision, latest_revision, publish_status, content_type
  }) => ({
    parent_id, name, locale, live_revision, latest_revision, publish_status, content_type
  }))(o);

  _assert(Object.keys(props).length ===7, props, "CORRUPTED")

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
  //console.log(`[content_item__update] _query: ${_query.join(', ')}`);
  //console.log(`[content_item__update] data: `,data);

  if (data.length <=0) {
    return null;
  }

  data.push(o.item_id);

  const query = `
    update cr_items set ${_query} where item_id = \$${data.length}
    returning item_id
  `;

  return db.query(query,data,{single:true})
  .then(retv =>{
    //console.log(`content_item__update:: retv => `,retv);
    return retv;
  })
  .catch(err =>{
    //console.log(`content_item__update:: ERROR :`,err);
    throw err;
  })
}
