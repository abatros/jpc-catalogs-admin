const {_assert, xnor_name} =  require('./utils.js')
const {content_item__update} = require('./content-item-update.js');
const {select_cr_item} = require('./select-cr-item.js')
//const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');

/*

    commit_constructeur(parent_id, title)
    name (defaults to) xnor(title)

*/

exports.commit_publisher = async function(o, options) {
  options = options || {};

  _assert(o.title, o, 'Missing publisher.title')
  o.parent_id = o.parent_id || pfolder_id;
  _assert(o.parent_id, o, 'Missing publisher.parent_id')
  o.content_type = o.content_type || 'content_revision'; // must be registered for parent-folder.
  o.item_subtype = o.item_subtype || 'cms-publisher';
  o.package_id = o.package_id || package_id;

  o.name = o.name || xnor_name(o.title);   // let's encrypt the title if no name given.

  return commit_revision(o, {full_data:true})
  .then(o2 =>{
    //console.log(`[commit-constructeur] o2:`,o2)
    if (o2.warning && options.verbose) {
      console.log(` -- commit-publisher warning:`,o2.warning)
    }
    return o2;
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
