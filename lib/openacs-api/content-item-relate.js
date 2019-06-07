const {_assert} =  require('./utils.js');

exports.content_item__relate2 = async function(o) {
  const {item_id, object_id, relation_tag, order_n, relation_type} = o;
  _assert(Number.isInteger(item_id), o, 'Missing item_id')
  _assert(Number.isInteger(object_id), o, 'Missing object_id')
  _assert(Number.isInteger(order_n), o, 'Missing order_n')

 return db.query(`
   select content_item__relate2($1,$2,$3,$4,$5) as rel_id;
   `,[
     item_id,
     object_id, // it must be a cr_item.
     relation_tag,
     order_n,
     relation_type || 'content_revision'
   ],{single:true})
   .then(o2 =>{
     console.log(`content_item__relate =>`,o2)
     return o2.rel_id;
   })
}

exports.content_item__relate = async function(o) {
  const {item_id, object_id, relation_tag, order_n, relation_type} = o;
  _assert(Number.isInteger(item_id), o, 'Missing item_id')
  _assert(Number.isInteger(object_id), o, 'Missing object_id')
  _assert(Number.isInteger(order_n), o, 'Missing order_n')

 return db.query(`
   select content_item__relate($1,$2,$3,$4,$5) as rel_id;
   `,[
     item_id,
     object_id, // it must be a cr_item.
     relation_tag,
     order_n,
     relation_type || 'content_revision'
   ],{single:true})
   .then(o2 =>{
     console.log(`content_item__relate =>`,o2)
     return o2.rel_id;
   })
}


exports.content_item__unrelate = async function(rel_id) {
  return db.query(`
    select content_item__unrelate($1)`,[rel_id], {single:true});
}
