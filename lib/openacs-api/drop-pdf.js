const {_assert, xnor_name} =  require('./utils.js')
const {content_item__update} = require('./content-item-update.js');
const {select_cr_item} = require('./select-cr-item.js')
//const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');

/*

    commit_constructeur(parent_id, title)
    name (defaults to) xnor(title)


*/

exports.drop_pdf = async function(o, options) {
  options = options || {};

  o.package_id = o.package_id || package_id;

  return db.query(`
    delete from cr_items
    where item_id in (
	     select object_id
	     from acs_objects
	     where object_type = 'pdf_file' and (package_id = $1)
     );
    `,
    [o.package_id], {single:true})
  .then(retv =>{
    console.log(`drop_pdf retv:`,retv);
    return retv;
  });
}

// --------------------------------------------------------------------------

drop_pdf_Obsolete = async function(o, options) {
  options = options || {};

  o.package_id = o.package_id || package_id;

  return db.query(`
    -- THIS does not remove the cr_item_rels..............
    delete from acs_objects
    where (package_id = $1) and (object_type = 'pdf_file')`,
    [o.package_id], {single:true})
  .then(retv =>{
    console.log(`drop_pdf retv:`,retv);
    return retv;
  });
}
