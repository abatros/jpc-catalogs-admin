const {_assert} =  require('./utils.js')

exports.commit_extlink_2 = async function (o) {
  const {item_id, url, label, description} =o;
  _assert(item_id, o, "Missing item_id")
  return db.query(`
    insert into cr_extlinks (extlink_id, url, label, description)
    values ($1,$2,$3,$4);
    `, [item_id, url, label, description], {single:true})
};


exports.commit_extlink = async function (o) {
  /************************************
    contract: always return an object.

    retv := {
      revision_id: null => check {error,retCode}
      item_id: [optional]
      error: from the server.
      retCode: short
    }

  ************************************/
  const { name,
          url,
          label,
          description,
          parent_id, // the catalog/article
          extlink_id,
          creation_date,
          creation_user,
          creation_ip,
          package_id,
          json_data,
          path} =o;

  const item_id = extlink_id || o.item_id;
  if (item_id) {
    throw 'NOT-READY'
    return {original_object:o, retCode:'not-ready'};
  }

  /*************************************
      HERE: no item_id => NEW EXTLINK.
  **************************************/

  _assert(parent_id, o, "Missing parent_id")
  _assert(name, o, "Missing name")
  _assert(url, o, "Missing URL")
  _assert(path, o, "Missing path:ltree")

  const retv = await db.query(`
    select * from cms.content_extlink__new($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as item_id
    `, [
        name,
        url,
        label,
        description,
        parent_id,
        null, // item_id
        creation_date,
        creation_user,
        creation_ip,
        package_id,
        json_data,
        path
        ], {single:true})
  .then(({item_id}) =>{
    console.log(`item_id:`,item_id)
    _assert(Number.isInteger(item_id), item_id, `Invalid item_id @58 : <${item_id}> should be an Integer`)
    return Object.assign(o, {item_id});
  })
  .catch(err =>{
    if (err.code != 23505) {
      console.log(`cms.content_extlink__new@65 err:`,err.detail)
      throw err;
    }
    // return Object.assign(o, {error:err.detail});

    /******************************************
        LOCATE THE extlink and TRY AN UPDATE
    *******************************************/

    const o2 = db.query(`
      select *
      from cms.extlinks
      where (parent_id = $1)
      and (name = $2);
      `,[parent_id, name],{single:true})
    .then(async o2 =>{
      // here item_id exists.... in combination with error
      Object.assign(o2, {error:err.detail});
      // console.log(`extlink__new:: found existing extlink - switching to UPDATE:`,o2)
      // HERE WE HAVE an item_id
      const {item_id} = o2;
      const retv = await update_extlink(item_id, o, o2);
      //console.log(`update_extlink@87 => retv:`,retv)
      return retv;
    })
    .catch(err =>{
      console.log(`err@93:`,err)
      throw err;
    });
    return o2;
  }); // catch

  return retv;
};

function delta(o1,o2) {
  const o3 ={};
  if (o2.path != o1.path) {o3.path = o2.path;}
  if (Object.keys(o3).length >0) return o3;
  return null;
}

async function update_extlink(item_id, o, o2) {
  /*
      DO NOT EXPORT THIS ONE
      o: new object, new data
      o2: actual from database
  */
  const {path} = o;
  const _query = ['update cr_items'];
  const _argv = [];

  if (path != o2.path) {
    _argv.push(path);
    _query.push(`set path = $${_argv.length}`);
  }

  if (_argv.length <=0) {
    return {item_id, retCode:'nothing-to-update'} // nothing
  }

  _argv.push(item_id)
  _query.push(`where item_id = $${_argv.length}`);

  const query = _query.join('\n');

  const retv = db.query(query,_argv,{single:true})
  .then(() =>{
    return {item_id}
  })
  .catch(err =>{
    console.log(`query:`,query)
    return {item_id, error:err}
  });
  return retv;
}


/*


    return db.query(`
      select *
      from cms.extlinks
      where (parent_id = $1)
      and (name = $2);
      `,[parent_id, name],{single:true});

    const {detail, code} = err;
    Object.assign(o2, {error:{detail,code}})
    return o2;
  })
  .then(retv =>{
    console.log('then2:',retv)
    if (o2.path != path) {
      console.log('updating path')
    }
    console.log('updating path2')
  })

*/

async function update_path(path, item_id) {
  return db.query(`
    update cr_items
    set path = $1
    where item_id = $2;
    `,[path, item_id],{single:true})
    /*
  .then((retv) =>{
    console.log(`path updated.`)
    return retv;
  })
  .catch(err =>{
    console.log(`path update err:`,err)
    throw err;
  });*/
}



/***********************************
    return

      console.log(`alert: ${err.detail} -- continue.`)
      // returns also the actual extlink
      const o2 = await db.query(`
        select *
        from cms.extlinks
        where (parent_id = $1)
        and (name = $2);
        `,[parent_id, name],{single:true});

      _assert(o2.item_id, o2, "Missing item_id")

      const {detail, code} = err;
      Object.assign(o2, {error:{detail,code}})
      return o2;

      // console.log(`o2 =>`,o2)

      if (o2.path != path) {
        console.log('updating path')
        await update_path(path,item_id)
        .then(()=>{
          console.log('path updated')
          return o2;
        })
        .catch(err =>{
          console.log('path updated error')
        })
      }


    } // if 23505
    *******************/
