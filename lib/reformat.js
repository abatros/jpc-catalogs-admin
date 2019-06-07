const assert = require('assert')
const _assert = require('./utils.js')._assert;

const iso_cc = {
  DE:'Allemagne',
  GB:'Angleterre',
  AT:'Autriche',
  BE:'Belgique',
  FR:'France',
  ES:'Espagne',
  IE:'Irlande',
  IT:'Italie',
  LU:'Luxembourg',
  MC:'Principauté de Monaco',
  RU:'Russie',
  CH:'Suisse',
  US:'USA',
  GK:'Grèce',
  CN:'Chine',
  SC:'Ecosse',
  NL:'Hollande',
  SW:'Suède',
  PR:'Prusse',
  DK:'Danemark',
  MO:'Monaco',
  JP:'Japon',
  SA:'Allemagne (Sarre)'
};

//console.log(`\nCountries Index/frequence`)
Object.keys(iso_cc).forEach(cc=>{
  iso_cc[iso_cc[cc]] = cc;
})


module.exports= (json)=>{
  const alerts = [];

  function alert(s) {alerts.push(s);}

  for (const ix in json) {
    const it = json[ix];
//    it.path = `${it.icat}.${it.isec}`;
//    it.icat = undefined;
//    it.isec = undefined;
    //console.log(it)
  } // loop
  return {alerts};
}
