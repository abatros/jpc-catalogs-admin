const {_assert} =  require('./utils.js')

exports.cms_instance__drop = function(package_id) {

  return db.query(`
      select apm_package__delete($1);
      `, [package_id], {single:true})
  .then(retv =>{
    return retv;
  });
}
