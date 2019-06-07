const {_assert, xnor_name} =  require('./utils.js')

/*
    NEVER fails.
*/

function select_cr_item1(o) {
  return db.query(`
    select *
    from cr_items
    join acs_objects on (object_id = item_id)
    where (item_id = $1)`,
    [o.item_id], {single:true})
  .then(retv =>{
    /*
        look for conflicts in request/query.
        maybe only warning....
    */
    //console.log('retv:',retv);
    if (o.name && o.name != retv.name) {
      throw 'Conflicting request@324'
    }
    if (o.parent_id && o.parent_id != retv.parent_id) {
      throw 'Conflicting request@327'
    }

    return retv;
  })
  .catch(err =>{
    return {item_id:null}
  });
}

exports.select_cr_item = async function(o) {
  if (o.item_id) {
    return select_cr_item1(o);
  }

  /*
      We assume here select_cr_item(parent_id, name) // unique
  */

  _assert(o.parent_id, o, "Missing cr_item.parent_id")
  _assert(o.name, o, "Missing cr_item.name")

  return db.query(`
    select *
    from cr_items
    join acs_objects on (object_id = item_id)
    where (parent_id = $1) and (name = $2)`,
    [o.parent_id, o.name], {single:true})
  .then(retv =>{
    //console.log('retv:',retv);
    return retv;
  })
  .catch(err =>{
    return {item_id:null}
  });
}
