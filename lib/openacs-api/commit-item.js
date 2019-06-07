const {content_item__new} = require('./content-item-new.js');

/*
  This does not store data yet.
  We need an update on cr_revision.
*/


exports.commit_item = function(o) {
  return content_item__new(o)
  .then(async item_id =>{
    console.log('item_id:', item_id);
    if (o.verbose) {
      const o2 = await select_cr_item({item_id})
      return Object.assign(o, {item_id});
    }
    return {item_id};
  })
  .catch(async (err) =>{
    throw err;
    console.log('HHHHHHHHHHHHHHHHH content_item__new err:',err)
    switch (+err.code) {
      case 23505:
        const {item_id} = await select_cr_item(o);
        console.log('content_item__new item_id:',item_id)
        return {
          item_id,
          errCode:23505,
          err:err
        };
        return {item_id:null, errCode:23505};
        break;
    }
    console.log('content_item__new err:',err)
    console.log(o)
    const {code,detail} = err;
    throw {code,detail};
  })

} // commit_item
