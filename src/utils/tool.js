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


module.exports.trimHashbangPrep = trimHashbangPrep
module.exports.ts2js = ts2js