#! /usr/bin/env node


console.log(`
  ******************************************************
  xp512-split-pdf
  using Hummus.
  ******************************************************
  `)

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const hummus = require('hummus');


const folder = './pdf-20190517';
const files = fs.readdirSync(folder);
console.log(files)

//process.exit(-1)

files.forEach(file =>{
  const input = path.join(folder,file);

  const pdfReader = hummus.createReader(input)

  for(var i=0; i<pdfReader.getPagesCount(); i++){
    const output_fn = path.join(folder,file.replace('.pdf','#')+(i+1)+'.pdf');
    console.log(`writing <${'./'+output_fn}>`)
    //continue;
    pdfWriter = hummus.createWriter(output_fn)
    pdfWriter.createPDFCopyingContext(pdfReader).appendPDFPageFromPDF(i);
    pdfWriter.end();
  }
})
