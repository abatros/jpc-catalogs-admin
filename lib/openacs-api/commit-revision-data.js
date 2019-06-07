const {_assert} =  require('./utils.js')


/*
    Just update cr_revision
*/

exports.commit_revision_data = async function(revision_id, data) {
  _assert(o.item_id, o, 'Missing item_id')
  return db.query(`update cr_item data = $1 where revision_id = $2`,[data,revision_id],{single:true}) // => 0.
//  .then(retv =>{
//    console.log('retv:',retv);
//  })

}
