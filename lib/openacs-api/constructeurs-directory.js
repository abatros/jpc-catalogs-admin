const {_assert} = require('./utils.js')

exports.constructeurs_directory = async function(){
  const query = `
    select
      i.item_id,
      i.name,
      i.parent_id,
      i.content_type,
      i.latest_revision,
      o.object_type,
      o.title,
      o.package_id
    from cr_items i
    join acs_objects o on (o.object_id = i.item_id)
    where (i.parent_id = $1)
    order by i.item_id;
  `;

  return db.query(query, [pfolder_id], {single:false});
}

exports.select_constructeur = async function(o) {
  _assert(o.name, o, 'Missing constructeur.name')
  o.parent_id = o.parent_id || pfolder_id;

  return db.query(`
    select *
    from cr_items
    join acs_objects on (object_id = item_id)
    where (parent_id = $1)
    and name = $2`,
    [o.parent_id, o.name], {single:true})
  .then(retv =>{
//    console.log('retv:',retv);
    return retv;
  })
}
