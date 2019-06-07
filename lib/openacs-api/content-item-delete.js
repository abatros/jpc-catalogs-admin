const {_assert} =  require('./utils.js')
exports.content_item__delete = async function(o) {
  _assert(o.item_id, o, 'Missing item_id')
  return db.query(`select content_item__delete($1)`, [o.item_id], {single:true}) // => 0.
//  .then(retv =>{
//    console.log('retv:',retv);
//  })

}
