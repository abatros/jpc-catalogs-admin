const {connect, close_connection} = require('./connect.js')
const {select_cr_item} = require('./select-cr-item.js');
const {select_cr_items} = require('./select-cr-items.js');
const {select_app_instance, select_app_folders } = require('./select-app-instances.js');
const {constructeurs_directory, select_constructeur} = require('./constructeurs-directory.js');
const {content_item__new} =  require('./content-item-new.js');
const {content_item__delete} =  require('./content-item-delete.js');
const {commit_constructeur} = require('./commit-constructeur')
const {commit_publisher} = require('./commit-publisher')
const {commit_catalog} = require('./commit-catalog')
const {commit_article} = require('./commit-article')
const {commit_update_acs_object} = require('./commit-update-acs-object');
//const {content_item__update} = require('./content-item-update');
const {content_item__relate, content_item__unrelate} = require('./content-item-relate.js');
const {list_pdf, pdf_latest_revisions} = require('./list-pdf.js');

exports.cms_instance__new = require('./cms-instance-new.js').cms_instance__new;
exports.cms_instance__drop = require('./cms-instance-drop.js').cms_instance__drop;
exports._assert = require('./utils.js')._assert;
exports.connect = require('./connect.js').connect;
exports.close_connection = require('./connect.js').close_connection;
exports.select_app_instance = require('./select-app-instances.js').select_app_instance;
exports.commit_revision = require('./commit-revision.js').commit_revision;
exports.commit_extlink = require('./commit-extlink').commit_extlink;


/*
module.exports = {
  _assert: require('./utils.js')._assert,
  xnor_name: require('./utils.js').xnor_name,
  fatal_error: require('./utils.js').fatal_error,
  connect, close_connection,
  select_cr_item,
  select_cr_items,
  select_app_instance, select_app_folders,
  constructeurs_directory, select_constructeur,
  content_item__delete, content_item__new,
  content_revision__new: require('./content-revision-new.js').content_revision__new,
  content_item__update: require('./content-item-update'),
  commit_publisher,
  commit_constructeur,
  commit_catalog,
  commit_article,
  commit_extlink,
  commit_update_acs_object,
  catalogs_directory: require('./catalogs-directory.js').catalogs_directory,
  catalogs_directory_all: require('./catalogs-directory.js').catalogs_directory_all,
  commit_revision_data: require('./commit-revision-data.js').commit_revision_data,
  mk_pdf_index: require('./mk-pdf-index.js').mk_pdf_index,
  mk_extlinks: require('./mk-extlinks.js').mk_extlinks,
  list_pdf, pdf_latest_revisions,
  drop_pdf: require('./drop-pdf.js').drop_pdf,
  commit_pdf_page: require('./commit-pdf-page.js').commit_pdf_page,
  commit_pdf_page2: require('./commit-pdf-page.js').commit_pdf_page2,
  content_item__relate, content_item__unrelate,
  create_content_type: require('./content-type-create-type.js').create_content_type,
  content_type__register_relation_type: require('./content-type-register-relation-type').content_type__register_relation_type
}*/
