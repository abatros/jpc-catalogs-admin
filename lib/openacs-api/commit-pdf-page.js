const {_assert, xnor_name} =  require('./utils.js')
const {content_item__update} = require('./content-item-update.js');
const {select_cr_item} = require('./select-cr-item.js')
//const {commit_item} = require('./commit-item.js');
const {commit_revision} = require('./commit-revision.js');

/*

    commit_pdf_page(revision_id, raw_text, url, pageno)
    name (defaults to) xnor(title)


*/

async function try_update(o) {
  const {revision_id, raw_text, url, pageno} = o;
  return db.query(`
    update txt
    set data = $1
    where (object_id = $2) -- not unique...
    and (data->>'url' = $3)
    and ((data->>'pageno')::integer = $4) returning *; -- was unable to get count
    `,[{url, pageno, raw_text}, revision_id, url, pageno],{single:false})
  .then((retv) =>{
    console.log(`try_update #rows:${retv.length}`);
    return retv.length;
  })
}

async function remove_duplicates(revision_id) {
  const query = `
  with u as (select distinct on (object_id, data->>'url', (data->>'pageno')::integer)*, ctid
    from txt
    where object_id = $1
    )
  delete from txt
  where object_id = $1
  and txt.ctid not in (select ctid from u);
  `;

  return db.query(query, [revision_id], {single:true});

}

// ----------------------------------------------------------------------------

exports.commit_pdf_page2 = async function(o, options) {
  options = options || {};
  const verbose = options.verbose;

  const {extlink_id, raw_text, url, pageno} = o;

  if (!raw_text || raw_text.length<=0) return {
    retCode: 'raw-text-empty'
  };

  _assert(extlink_id, o, 'Missing pdf-page.extlink-id');
  _assert(url, o, 'Missing pdf-page.url');
  _assert(pageno, o, 'Missing pdf-page.pageno');



  return db.query(`
    insert into txt (object_id, data) values ($1,$2) returning object_id;
    `,[
      extlink_id,
      {url, pageno, raw_text}
    ],{single:true})
  .then((retv)=>{
    //console.log('insert retv:',retv)
    return retv
  }) // then
} // commit_pdf_page2(extlink_id, url, pageno)

// ----------------------------------------------------------------------------

exports.commit_pdf_page = async function(o, options) {
  options = options || {};
  const verbose = options.verbose;

  const {revision_id, raw_text, url, pageno} = o;

  if (!raw_text || raw_text.length<=0) return {
    retCode: 'raw-text-empty'
  };

  _assert(revision_id, o, 'Missing pdf-page.revision-id');
  _assert(url, o, 'Missing pdf-page.url');
  _assert(pageno, o, 'Missing pdf-page.pageno');

  await try_update(o)
  .then(async (nrows) =>{
    if (nrows ==1) {
      return {
        message: 'success-updating'
      }
    }
    if (nrows <=0) {
      // Going Insert
      return await db.query(`
        insert into txt (object_id, data) values ($1,$2) returning object_id;
        `,[
          revision_id,
          {url, pageno, raw_text}
        ],{single:true})
      .then(retv =>{
        console.log(`insert into txt return =>`,retv);
        return retv;
      });
    }

    if (nrows>1) {
      // just keep 1 copy.

      console.log(`
        Something wrong, we have multiple pdf pages (${url}:${pageno})
        for same cr_revision:${revision_id} => remove duplicates....
        `);

      // This cleans more than (url:pageno) !
      // It cleans all duplicate pages for a cr_revision
      await remove_duplicates(revision_id)
      return {retCode: 'duplicates-removed'}

      throw `
        Something wrong, we have multiple pdf pages (${url}:${pageno})
        for same cr_revision:${revision_id} => remove duplicates....
        `;
      return {retCode: 'duplicates-removed'}
    }

    throw 'IMPOSSIBLE'
  }) // then
} // commit_pdf_page(revison_id, url, pageno)
