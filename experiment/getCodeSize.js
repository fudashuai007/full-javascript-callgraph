
const fs = require("fs");
const path = require('path')
const { getAllFiles, shouldStubbify } = require('./stubUtils.js')

/*
        PROJECT FLAGS
*/
var recurseThroughDirs = true;
const cur_dir = 'result/memfs'
var filename = path.join(__dirname, cur_dir)
console.log('Reading ' + filename);

let deptList = fs.readFileSync(path.join(__dirname, cur_dir, 'dep_list.txt'), 'utf-8').split("\n");

if (fs.lstatSync(filename).isDirectory()) {
    var files = getAllFiles(filename, recurseThroughDirs);
    var totalSize_1 = 0;
    files.forEach(function (file, index) {
        // only get size of JS files (since that's all that we're stubbifying)
        // var curPath = filename + file;
        curPath = file;
        if (shouldStubbify(curPath, file, deptList)) {
            // let ss=fs.statSync(curPath) // this is all the files the stubbifyier looks at (i.e. js files, 
            totalSize_1 += fs.statSync(curPath).size; // in dependencies in node_modules or in the source code)
        }
    });
    console.log("Total size: " + totalSize_1 + " bytes");
}
else if (fs.lstatSync(filename).isFile()) {
    var totalSize = fs.statSync(filename).size;
    console.log("Total size (of one file): " + totalSize + " bytes");
}
else {
    console.log("Error: input to code size must be a directory or a file: it should be the same input as to the transformer");
}
console.log('Done');
