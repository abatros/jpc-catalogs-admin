const {_assert, xnor_name} =  require('./utils.js')
const {content_item__update} = require('./content-item-update.js');
const {select_cr_item} = require('./select-cr-item.js')
//const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');

/*

    commit_constructeur(parent_id, title)
    name (defaults to) xnor(title)


*/

exports.commit_pdf = async function(o, options) {
  options = options || {};
  const verbose = options.verbose;

  _assert(o.title, o, 'Missing constructeur.title')
  o.parent_id = o.parent_id || root_folder_id;
  _assert(o.parent_id, o, 'Missing constructeur.parent_id')
  o.content_type = o.content_type || 'content_revision';
  o.item_subtype = o.item_subtype || 'pdf_file';
  o.package_id = o.package_id || package_id;

  o.name = o.name || xnor_name(o.title);   // let's encrypt the title.

  // console.log(`commit-pdf data:`,o.json_data)

  return commit_revision(o, {return_data:true, verbose})
  .then(o2 =>{
    //console.log(`[commit-constructeur] o2:`,o2)
    if (o2.warning) {
      console.log(` -- commit-pdf warning:`,o2.warning)
    }
    return o2;
  })
}
