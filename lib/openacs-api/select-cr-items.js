const {_assert} =  require('./utils.js')

exports.select_cr_items = async function(o) {
  _assert(o.parent_id, o, 'Missing select_cr_items.parent.id')

  return db.query(`
    select *
    from cr_items
    join acs_objects on (object_id = item_id)
    where (parent_id = $1)`,
    [o.parent_id], {single:false})
  .then(retv =>{
    console.log('retv:',retv);
    return retv;
  })
//  .catch(err =>{});
}
