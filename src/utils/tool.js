function trimHashbangPrep(src) {
  if (src.substring(0, 2) === '#!') {
    var end = src.indexOf('\n');
    var filler = '';
    for (var i = 0; i < end; ++i) {
      filler += ' ';
    }
    src = filler + src.substring(end, src.length);
  }
  return src;
}

/**
 * 
 * @param {*} fname filename
 * @param {*} src source code
 */
function ts2js(fname, src) {
  return babel.transform(src, {
    presets: ["@babel/preset-typescript"],
    plugins: ["@babel/plugin-proposal-class-properties"],
    filename: fname,
    retainLines: true,
    parserOpts: { strictMode: false }
  }).code;
}

function nativeCalls() {
  return ['every',
    'filter',
    'find',
    'findIndex',
    'findLast',
    'findLastIndex',
    'flatMap',
    'forEach',
    'map',
    'reduce',
    'reduceRight',
    'some',
    'sort',
    'replace',]
}

function getNativeName(path) {
  let native_calls = ['every',
    'filter',
    'find',
    'findIndex',
    'findLast',
    'findLastIndex',
    'flatMap',
    'forEach',
    'map',
    'reduce',
    'reduceRight',
    'some',
    'sort',
    'replace']
  let paths = path.split(' ')
  let set = new Set(native_calls)
  for (let e of paths) {
    if (set.has(e)) {
      return e;
    }
  }
}

module.exports.trimHashbangPrep = trimHashbangPrep
module.exports.ts2js = ts2js
module.exports.nativeCalls = nativeCalls
module.exports.getNativeName = getNativeName