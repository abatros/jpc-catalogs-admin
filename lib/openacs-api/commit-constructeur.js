const {_assert, xnor_name} =  require('./utils.js')
const {content_item__update} = require('./content-item-update.js');
const {select_cr_item} = require('./select-cr-item.js')
//const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');

/*

    commit_constructeur(parent_id, title)
    name (defaults to) xnor(title)


*/

exports.commit_constructeur = async function(o, options) {
  options = options || {};

  _assert(o.title, o, 'Missing constructeur.title')
  o.parent_id = o.parent_id || pfolder_id;
  _assert(o.parent_id, o, 'Missing constructeur.parent_id')
  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'cms-publisher';
  o.package_id = o.package_id || package_id;

  o.name = o.name || xnor_name(o.title);   // let's encrypt the title.

  return commit_revision(o, {full_data:true})
  .then(o2 =>{
    //console.log(`[commit-constructeur] o2:`,o2)
    if (o2.warning && options.verbose) {
      console.log(` -- commit-constructeur warning:`,o2.warning)
    }
    return o2;
  })
}


exports.commit_constructeur_Obsolete = async function(o) {
  _assert(o.title, o, 'Missing constructeur.title')
  o.parent_id = o.parent_id || pfolder_id;
  _assert(o.parent_id, o, 'Missing constructeur.parent_id')
  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'cms-publisher';

  o.name = o.name || xnor_name(o.title);   // let's encrypt the name, now.

  /*
      Create a cr_item without revision => content_type:null.
  */
  return commit_item(o)
  .then(cr_item =>{
    Object.assign(o, cr_item)
    return o;
  })
  .catch(async (err) =>{
    // console.log(`AAAAAAAAAAAA commit_constructeur error:`, err);
    switch (+err.code) {
      case 23505: // already exists (parent_id, name)
        const o2 = await select_cr_item(o);
        return Object.assign(o2, {already_exists:true}) // goto UPDATE phase
        break;
      }
//    console.log(`commit_constructeur error:`, err);
//    console.log(o);
    throw err
  })
  .then((o2)=>{ // UPDATE PHASE.
    if (!o2.already_exists) return o2; // done, should be warning instead of error...

    //console.log('commit_constructeur switching update-mode')

    const {query,data} = mk_update_query(o,o2);
    if (data) {
      return db.query(query,data,{single:true})
      .then(retv =>{
        //console.log(`content_item__update:: retv => `,retv);
        return Object.assign(o2,o);
      })
      .catch(err =>{
        console.log(`content_item__update:: ERROR :`,err);
        throw err;
      })
    } else {
      //console.log('commit_constructeur:: construteur is uptodate.')
      return o2
    }
  })
}

/*
    Remove from o props already in o2.
*/

function mk_update_query(o,o2) {
  //console.log('o:',o)
  //console.log('o2:',o2)
  const props = (({
    parent_id, name, locale, live_revision, latest_revision, publish_status, content_type
  }) => ({
    parent_id, name, locale, live_revision, latest_revision, publish_status, content_type
  }))(o);

  _assert(Object.keys(props).length ===7, props, "CORRUPTED")

  const data = [];
  const _query = [];

  Object.keys(props).forEach(key =>{
    if ((props[key] != undefined)&&(props[key] != o2[key])) {
      // could be null...
      data.push(props[key]);
      _query.push(`${key} = \$${data.length}`)
    }
  })

  //console.log(`[content_item__update] _query: ${_query.join(', ')}`);
  //console.log(`[content_item__update] data: `,data);

  if (data.length >0) {
    data.push(o.item_id);

    const query = `
      update cr_items set ${_query} where item_id = \$${data.length}
      returning item_id
    `;

    return {query, data};
  } else {
    return {query:null, data:null}
  }
}
