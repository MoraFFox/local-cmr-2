// Lightweight test harness for Arabic name alias mapping

function normalize(str){
  if(!str) return '';
  return str.trim().toLowerCase();
}

const BARISTA_NAME_ALIASES = [
  { alias: 'احمد مصطفي', canonical: 'Ahmed Mostafa' },
  { alias: 'احمد مصطفى', canonical: 'Ahmed Mostafa' },
  { alias: 'أحمد مصطفى', canonical: 'Ahmed Mostafa' },
];

function mapBaristaName(name){
  if(!name) return name;
  const n = normalize(name);
  for(const a of BARISTA_NAME_ALIASES){
    if(normalize(a.alias) === n) return a.canonical;
  }
  return name;
}

const tests = [
  'احمد مصطفي',
  'احمد مصطفى',
  'أحمد مصطفى',
  'Ahmed Mostafa',
  'ahmed mostafa'
];

for(const t of tests){
  console.log(t, '->', mapBaristaName(t));
}

// Simple merge predicate test: same canonical name -> should merge if company matches
function canMerge(name1, name2, company){
  const n1 = mapBaristaName(name1);
  const n2 = mapBaristaName(name2);
  // naive company normalization
  const c = company ? company.trim().toLowerCase().replace(/\s+/g, ' ') : '';
  const sameName = n1 === n2;
  return sameName && !!c;
}

console.log('CanMerge Ahmed مصطفي vs احمد مصطفي in Siekh mashwy? ', canMerge('احمد مصطفي','احمد مصطفي','Siekh mashwy'));
