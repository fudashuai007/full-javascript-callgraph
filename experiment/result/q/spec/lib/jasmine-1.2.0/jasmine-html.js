const fs_uniqID = require('fs');
const zlib_uniqID = require('zlib');
console.log("[STUBBIFIER METRICS] FILE STUB HAS BEEN EXPANDED: d:\developDirs\full-js-callgrapgh\experiment\result\q\spec\lib\jasmine-1.2.0\jasmine-html.js");
if (!fs_uniqID.existsSync("d:\developDirs\full-js-callgrapgh\experiment\result\q\spec\lib\jasmine-1.2.0\jasmine-html.js.BIGG")) {
  var gunzip = zlib_uniqID.gunzipSync;
  var inp = fs_uniqID.createReadStream("d:\developDirs\full-js-callgrapgh\experiment\result\q\spec\lib\jasmine-1.2.0\jasmine-html.js.BIGG.gz");
  var out = fs_uniqID.createWriteStream("d:\developDirs\full-js-callgrapgh\experiment\result\q\spec\lib\jasmine-1.2.0\jasmine-html.js.BIGG");
  inp.pipe(gunzip).pipe(out);
}
let fileContents = fs_uniqID.readFileSync("d:\developDirs\full-js-callgrapgh\experiment\result\q\spec\lib\jasmine-1.2.0\jasmine-html.js.BIGG", 'utf-8');
let result_uniqID = eval(fileContents);
module.exports = result_uniqID;