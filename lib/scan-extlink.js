const _ = require('lodash');
const {_assert} = require('./openacs-api');

/******************************************************************************

      scan_extlink or scan_irevision
      (revii)

      (acs_object)::(cr_item)
                  ::(cr_revision)

      THIS SHOULD BE CALLED REFORMAT or xnor()
      AND PASSED to commit().

      remove_unchanged() preps for UPDATE.

      ATTN: data::jsonb in cr_revision must be handled with Object.assign()

******************************************************************************/

function cleanup(o) {
  const verbose =0;
  const o2 ={};
  Object.keys(o).forEach(key =>{
    if (o[key] !== '') o2[key]=o[key];
    else {
      verbose && console.log(`cleanup removing ${key}:${o[key]}`)
    }
  });
  return (Object.keys(o2).length>0)? o2:null;
}


exports.retrofit_for_update=  function(o, o2, options) {
  /***********************************
  take new data, compare with actual db-data, optimise for update.
  first o, o2 need to be validated/reformatted
  ************************************/
  const verbose = options && options.verbose;

  const _o = scan_content_revision(o);
  const _o2 = scan_content_revision(o2);

  //console.log(`from db.o2:`,o2)
  //console.log(`from db._o2:`,_o2)

  /*********************************
  ONLY cr_revision has data::jsonb
  *********************************/

  const cr_item = remove_unchanged(_o.cr_item, _o2.cr_item);
  const acs_object = remove_unchanged(_o.acs_object, _o2.acs_object);

//console.log(`cr_revision@41:`,_o.cr_revision)

  const cr_revision = remove_unchanged(_o.cr_revision, _o2.cr_revision);

//console.log(`cr_revision@42:`,cr_revision)

  function subset(o,o2) {
    const verbose =0;
    // if one of o not exactly equal to o2 => return false;
    let count_false =0;
    Object.keys(o).forEach(key =>{
      verbose && console.log(`subset o[${key}]:`,o[key])
      verbose && console.log(`subset o2[${key}]:`,o2[key])
      // tricky (case '' == undefined)
      if ((o[key] =='')&&(!o2[key])) {
        // ok
      } else
      if (o2[key] != o[key]) {
        count_false +=1;
      }
    })
    const iret = (count_false>0)?false:true;
    verbose && console.log(`subset=>${iret}`)
    return iret;
  }

  function remove_unchanged(o, o2, indent) { // not recursif sub-object is jsonb
    const verbose =0;
    indent = indent || 2;
    const o3 ={}; // o3 := o only if (o != o2) BUT NOT FOR DATA!!!!
    for (let key in o) {
      if (o2[key] !== Object(o2[key])) {
        if (o2[key] != o[key]) o3[key] = o[key];
        continue;
      }

      // here we have data::jsonb
      if (o2[key] === Object(o2[key])) {
        // this is a jsonb.

        /*****************************
        (o[key] == null) => do nothing
        (o2[key] == null) => update with data := o[key]
        _.isEqual((o[key],o2[key]) => do nothing.

        else copy new_data into old_data and set cr_revision_data
        ******************************/


        _assert(key == 'data', key, 'Corrupted');
        verbose && console.log(`${'-'.repeat(indent)} o[${key}]:`, o.data);
        verbose && console.log(`${'-'.repeat(indent)} o2[${key}]:`, o2.data);
        if (!o.data) {
          console.log(`${'-'.repeat(indent)} new data empty => do-nothing`)
          continue;
        }
        if (!o2.data) {
          console.log(`${'-'.repeat(indent)} old data (db) empty`)
          o3.data = cleanup(o.data);
          continue;
        }
        if (_.isEqual(cleanup(o.data), o2.data)) {
          // DO NOT CLEANUP o2 !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
          console.log(`${'-'.repeat(indent)} no change in data => do-nothing`)
          continue;
        }

        verbose && console.log(`${'-'.repeat(indent)} [jsonb-not-equal]`);
        verbose && console.log(`${'-'.repeat(indent)} [jsonb] o[${key}]:`, o.data);
        verbose && console.log(`${'-'.repeat(indent)} [jsonb] o2[${key}]:`, o2.data);

        /************************************************
          Here, o != o2, but what if o subset of o2 ?
          ATTN: each prop in o will let o2 unchanged.
          IF o.data is subset of o2.data => nothing todo.
          do not remove null from o.data -yet!
          because null values in o MUST be removed from o2
        *************************************************/

        if (subset(o.data,o2.data)) {
          verbose && console.log(`strict subset`)
          continue;
        }


        o3.data = Object.assign(o2.data, o.data); // ATTENTION: REVERSE ORDER......


        /************************************
        what if an argument is missing in o.... BUG!
         o2.data, except if
        *************************************/
//        o3[key] = _.mergeWith(cleanup(o2.data),o.data, (objectValue, srcValue)=>{})
        verbose && console.log(`${'-'.repeat(indent)} [jsonb] o3[${key}]:`, o3.data);
        o3.data = cleanup(o3.data);
        verbose && console.log(`${'-'.repeat(indent)} [jsonb] o3[${key}]:`, o3.data);
        continue;
      }
    }
    return (Object.keys(o3).length >0) ? o3: null;
  } // remove_unchanged

  return {cr_item, acs_object, cr_revision};
}

// ============================================================================

function scan_content_revision(o, options) {
  const verbose = options && options.verbose;

  const cr_item={}, acs_object={}, cr_revision={}, cr_revision_data={};

  for (key in o) {
    const o1 = {}; o1[key]=o[key];

    switch(key) {

      // cr_revision
      case 'nls_language':
      case 'lang':
      scan_cr_revision({nls_language:o[key]}); break;

      case 'revision_title':
      case 'fsize':
      case 'mtime':
      scan_cr_revision(o1); break;

      // cr_item
      case 'item_id':
      case 'path':
      case 'locale':
      scan_cr_item(o1); break;

      // acs_object
      case 'object_title': scan_acs_object({title:o[key]}); break;
      case 'object_type': scan_acs_object(o1); break;

      case 'data':  // at first level means cr_revision.data
      Object.assign(cr_revision_data, o[key]);
      break;

      case 'h2':
      case 'pic':
      case 'url':
      case 'fsize':
      case 'timeStamp':
      case 'mtime':
      verbose && console.log(`[1] [${key}] cr_revision.data.${key}: ${o[key]}`)
      cr_revision_data[key] = o[key];
      break;

      case 'infos':
      verbose && console.log(`[X] [${key}] --ignored`)
      break;

      case 'cr_revision':
      scan_cr_revision(o[key]);
      break;

      case 'cr_item':
      scan_cr_item(o[key]);
      break;

      case 'acs_object':
      scan_acs_object(o[key]);
      break;

      default:
      verbose && console.log(`[ ] [${key}]: ${o[key]} -- Invalid key => ignored.`)
      break;
    }
  }

  function scan_cr_revision(o) {
    const verbose =0;
    const o2 = {};
    for (key in o) {
      switch(key) {
        case 'title':
        case 'description':
        case 'publish_date':
        case 'mime_type':
        case 'nls_language':
        o2[key] = o[key];
        verbose && console.log(`[1] [${key}] cr_revision.${key}: ${o2[key]}`)
        break;

        case 'data':
        /********************************************
        here, we are setting cr_revision new properties
        The full cr_revision.data will be built later.
        *********************************************/
        const _cleaned = o[key]; //cleanup(o[key]);
        if (_cleaned) {
          Object.assign(cr_revision_data, _cleaned); // correct -- data object copied into cr_revision.
          verbose && console.log(`[1] [${key}] cr_revision_data += `, _cleaned)
        } else {
          verbose && console.log(`[1] [${key}] cr_revision_data = `, cr_revision_data)
        }
        break;

        case 'h2':
        case 'pic':
        case 'url':
        case 'fsize':
        case 'timeStamp':
        case 'mtime':
        const ok = {}; ok[key]=o[key];
        Object.assign(cr_revision_data, ok);
//        o2.data[key] = o[key];
        verbose && console.log(`[1] [${key}] cr_revision.data.${key}: `,o[key])
        break;


        default:
        verbose && console.log(`[ ] [${key}] cr_revision.${key}: ${o2[key]} -- Unknown key!`)
      }
    }
    Object.assign(cr_revision,o2)
    return o2;
  } // scan_cr_revision




  function scan_cr_item(o) {
    const o2 = {};
    for (key in o) {
      switch(key) {
        // case 'item_id': do not copy item_id.
        case 'name':
        case 'locale':
        case 'publish_status':
        case 'content_type':
        case 'path':
        case 'locale':
        o2[key] = o[key];
        verbose && console.log(`[1] cr_item.${key}: ${o2[key]}`)
        break;

        default:
        verbose && console.log(`[ ] cr_item.${key}: ${o2[key]} -- Unknown key!`)
      }
    }
    Object.assign(cr_item, o2)
    return o2;
  } // scan_cr_revision

  function scan_acs_object(o) {
    const o2 = {};
    for (key in o) {
      switch(key) {
        case 'object_type':
        case 'title':
        case 'last_modified':
        case 'modifying_user':
        case 'modifying_ip':
        case 'path':
        o2[key] = o[key];
        verbose && console.log(`[1] cr_item.${key}: ${o2[key]}`)
        break;

        case 'package_id':
        case 'context_id':
        o2[key] = o[key];
        console.log(`[1] cr_item.${key}: ${o2[key]} *ALERT*`)
        break;

        default:
        verbose && console.log(`[ ] cr_item.${key}: ${o2[key]} -- Unknown key!`)
      }
    }
    Object.assign(acs_object, o2)
    return o2;
  } // scan_cr_revision


  _assert(!cr_revision.data, cr_revision, "Corrupted");
  const _data = cr_revision_data; //cleanup(cr_revision_data);
  if (_data) {
    cr_revision.data = _data;
  }
  const o2 = {cr_item, acs_object, cr_revision};
  return o2;
}

/******************************************************************************

  compare both objects.
  remove from o, eveything matching in o2
  operate only on strings and number.
  recursive on array and objects.

  ATTENTION: cr_revision.data (jsonb) must be treated differntly!!!!!!!

******************************************************************************/

exports.remove_unchanged_Obsolete = remove_unchanged;

function remove_unchanged(o, o2, indent) {
  indent = indent || 2;
  const o3 ={};
  for (let key in o) {
    if (o2[key] === Object(o2[key])) {
      //console.log(`${'-'.repeat(indent)} ${key}:`);
      if (true) {
        console.log(`key1:${key}`)
        const y = remove_unchanged(o[key], o2[key], indent+2)
        console.log(`key2:${key}`)
        o3[key] = y;
      } else {
        o3[key] = remove_unchanged(o[key], o2[key], indent+2)
      }

      continue;
    }
    if (/*!o2[key] ||*/ (o[key] != o2[key])) {
      o3[key] = o[key];
      //console.log(`${'-'.repeat(indent)} ${key}: ${o3[key]}`)
    } else {
      //console.log(`${'-'.repeat(indent)} ${key}: ${o3[key]} *UNCHANGED*`)
    }
  }
  return (Object.keys(o3).length >0) ? o3: null;
}
