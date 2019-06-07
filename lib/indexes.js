const _xlsx = {}
const _auteurs = {}; // only s3,s4
const _constructeurs = {}; // only s1,s2
const _marques = {}; // only s1,s2
const _jpeg = {};
const _pdf = {};

exports.mk_indexes = function (xlsx) {
  for (let ix =0; ix <xlsx.length; ix++) {
    const a = xlsx[ix];
    if (a.deleted) continue;

    _xlsx[a.xid] = a;
    if (+a.sec <=2) {
      // this is a catalog: create 1 or more entries in constructeurs (alias)
      // first indexName is main/official constructeur name
      // others are alias/aka.
      // for each constructeur (and aka), we will have full list of catalogs.

      a.indexNames.forEach((cname,j)=>{
        _constructeurs[cname] = _constructeurs[cname] || [];
        _constructeurs[cname].push(a);
      })

      /*
          Populate index marques.
      */
      a.mk && a.mk.forEach((mk,j)=>{
        _marques[mk] = _marques[mk] || [];
        _marques[mk].push(a);
      })

    } else {
      // this is a regular article (s3 or s4 publisher)
      // for each auteur, we will have list of articles.
      a.auteurs.forEach((aname,j)=>{
        _auteurs[aname] = _auteurs[aname] || [];
        _auteurs[aname].push(a);
      })
    }

    /*
        Populate index files.
    */
    if (a.pic) {
      _jpeg[a.pic] = _jpeg[a.pic] || [];
      _jpeg[a.pic].push(a)
    }

    a.links && a.links.forEach((file)=>{
      _pdf[file.fn] = _pdf[file.fn] || [];
      _pdf[file.fn].push(a)
    })

  }

  /*
      Should we create index files (jpeg/pdf) ?
  */

  return {_xlsx, _auteurs, _constructeurs, _marques, _jpeg, _pdf};
}
