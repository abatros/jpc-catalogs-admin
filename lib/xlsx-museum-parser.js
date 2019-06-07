const XLSX = require('xlsx'); // npm install xlsx
//var jsonfile = require('jsonfile');
//const reformat = require('./reformat.js')


// ===========================================================================

export function open_sheet1(buffer) {
  //console.log('buffer:',buffer)
    //var workbook = XLSX.readFile(xlsx_fn, {cellDates:true});
      var workbook = XLSX.read(buffer, {type:"buffer"});
      const sheet1 = workbook.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1],{
          header:[
            "xid",              // A
            "sec",              // B
            "yp",               // C
            "circa",            // D
            "pic",              // E : jpeg
            "co",               // F : country
            "h1",               // G
            'isoc',             // H
            "h2",               // I
            'root',             // J : other name, author (root-name)!
            'yf',               // K : year founded
            'fr',               // L : texte francais
            'mk',               // M : marque
            'en', 'zh',         // N,O : english chinese
            'ci', 'sa',         // P,Q : city, street address
            'links',            // R : pdf[]
            'flags',             // S : [RT..]
            'npages',           // T : number of pages
            'rev',              // U : revision date (Update)
            'com',              // V : comments
            'ori'               // W : origine source du document.
          ], range:1
      }); // THIS IS THE HEAVY LOAD.

      console.log(`sheet:${sheet1} rows:${json.length}`);
//      console.log(json)
      return json;

};
