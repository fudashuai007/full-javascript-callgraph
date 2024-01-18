const fs = require("fs");
const path = require("path");
const { stubFunction } = require("./stubFunction.js");
const { flagFunctionForStubbing } = require("./functionFlagging.js");
const { stubFile } = require("./stubFile.js");
const { getTargetsFromCoverageReport,
  getTargetsFromACG,
  buildHappyName,
  getFileName,
  getFileName2,
  getAllFiles,
  shouldStubbify,
  generateBundlerConfig
} = require("./stubUtils.js");
const { argv } = require("process");
// const yargs = require("yargs");
const { execSync } = require("child_process");


let bundlerMode = "no"; // default: don't bundle
let bundleOptions = {
  no: "no",
  only_bundle: "only_bundle",
  stub_bundle: "stub_bundle",
  bundle_and_stub: "bundle_and_stub"
  // no, only_bundle, stub_bundle, bundle_and_stub
}
// valid options are:
// "no" : dont bundle
// "only_bundle" : bundle but don't stub anything
// "stub_bundle" : stub an existing bundle file (this requires the bundle to have been previously created)
// "bundle_and_stub" : both stub and bundle
// if (argv.bundler_mode) {
//   if (!bundleOptions[argv.bundler_mode]) {
//     console.log("Invalid bundle option provided: " + bundlerMode + "; proceeding without bundling");
//     bundlerMode = "no";
//   }
// }

let testingMode = true;
let safeEvalMode = false;
let recurseThroughDirs = true;
let pro_dir = 'q'
let cur_dir = 'result/q';
// console.log('Reading ' + filename);

let callgraphpath = path.join(cur_dir, 'static.csv');
let node_profpath = path.join(cur_dir, 'node_prof.json')
let coverageReportPath = path.join(cur_dir, 'coverage/coverage-final.json');
let removeFunsPath = null;
let functions = [];
let listedFiles = new Set()
let removeFuns = [];
let noCG = true;
let uncoveredMode = true;
let depList;

// 合并动态分析与静态分析结果
let targets = []

let analysis_mode = 'hibrid' // stubifier
if (analysis_mode == 'static') { }
else if (analysis_mode == 'dynamic') { }
else if (analysis_mode == 'stubifier') {
  targets = getTargetsFromCoverageReport(coverageReportPath);
  functions = [...new Set(targets.map(item => path.join(__dirname, item)).map(buildHappyName))].map(item => {
    let [path, line] = item.split('do_');
    let info = line.split('_')
    return path + 'do_' + info[0] + '_' + info[2]
  })
} else {
  targets = getTargetsFromACG(callgraphpath, node_profpath, coverageReportPath,cur_dir);
  functions = [...new Set(targets.map(item => path.join(__dirname, item)).map(buildHappyName))].map(item => {
    let [path, line] = item.split('do_');
    let info = line.split('_')
    return path + 'do_' + info[0] + '_' + info[2]
  })

}
targets.forEach(item => {
  listedFiles.add(path.join(__dirname, getFileName(item)))
})
// let ddtargets = getTargetsFromCoverageReport(coverageReportPath);
// let ddfunctions = ddtargets.map(buildHappyName);
noCG = false;


let zipFiles = false; // Currently don't ever do this.
if (removeFunsPath) {
  removeFuns = getTargetsFromACG(removeFunsPath).map(buildHappyName);
}
// console.log(path.join(__dirname,cur_dir, 'dep_list.txt'));
depList = fs.readFileSync(path.join(__dirname, cur_dir, 'dep_list.txt'), 'utf-8').split("\n");

if (bundlerMode != "no") {
  if (bundlerMode == "bundle_and_stub" || bundlerMode == "only_bundle") {
    let files = getAllFiles(path.join(__dirname, cur_dir), recurseThroughDirs);
    files.forEach(function (file, index) {
      let curPath = cur_dir + file;
      curPath = file;
      if (shouldStubbify(curPath, file, depList)) { // don't even try to stub externs
        if (noCG || listedFiles.indexOf(curPath) > -1) { // file is reachable, so only stubify functions
          console.log("FUNCTION CASE: flagging to be stubbed: " + curPath);
          try {
            flagFunctionForStubbing(curPath, process.cwd(), functions, uncoveredMode);
          }
          catch (e) {
            console.log("ERROR: cannot stubbify function in: " + curPath);
            console.log(e);
          }
        }
        else {
          console.log("FILE CASE: flagging all functions to be stubbed in: " + curPath);
          try {
            flagFunctionForStubbing(curPath, process.cwd(), [], uncoveredMode);
          }
          catch (e) {
            console.log("ERROR: cannot stubbify all functions in file: " + curPath);
            // console.log(e);
          }
        }
      }
    });
    // By now, the functions that should be stubbed are flagged as such with 
    // eva("STUB_FLAG_STUB_THIS_STUB_FCT") as the first thing in the function body.
    // Now, we need to call the bundler.
    // To do this, we should just dispatch a shell command which invokes the bundler.
    // Notes:
    // 1. Bundler needs to be installed globally.
    // 2. Bundler needs to be called from the project being stubbified.
    // 3. Bundler config file is needed. 
    // create bundler config file
    generateBundlerConfig(path.resolve(path.join(__dirname, cur_dir)));
    // cd into project directory (filename is the path to the tgt project)
    // save current directory first to chdir back
    // let stubsDir = process.cwd();
    // process.chdir(path.resolve(path.join(__dirname, cur_dir)));
    // // call bundler
    // execSync('rollup --config rollup.stubbifier.config.js');
    // // cd back into stubbifier
    // process.chdir(stubsDir);
  }
  // Once bundled, we need to read in the bundle and stubbify the functions with
  // the eval.
  if (bundlerMode == "bundle_and_stub" || bundlerMode == "stub_bundle")
    stubFunction(
      path.resolve(filename) + '/stubbifyBundle.js',
      process.cwd(),
      new Map(),
      functions,
      removeFuns,
      uncoveredMode,
      safeEvalMode,
      testingMode,
      zipFiles,
      true);
}
else {
  // stubbing section; no bundling 
  if (fs.lstatSync(path.resolve(path.join(__dirname, cur_dir))).isDirectory()) {
    let files = getAllFiles(path.resolve(path.join(__dirname, cur_dir)), recurseThroughDirs,[], depList);
    files.forEach(function (file, index) {
      // console.log(file);
      // only stubify JS files
      let curPath = file
      // console.log("decision: " + shouldStubbify(curPath, file, depList));
      // let curAbsPath: string = process.cwd() + curPath;
      if (shouldStubbify(curPath, file, depList)) { // don't even try to stub externs
        if (noCG || [...listedFiles].indexOf(curPath) > -1) { // file is reachable, so only stubify functions
          console.log("FUNCTION CASE: " + curPath);
          try {
            stubFunction(
              curPath,
              process.cwd(),
              new Map(),
              functions,
              removeFuns,
              uncoveredMode,
              safeEvalMode,
              testingMode);
          }
          catch (e) {
            console.log("ERROR: cannot stubbify function in: " + curPath);
            console.log(e);
          }
        }
        else {
          console.log("FILE CASE: " + curPath);
          try {
            stubFile(curPath, safeEvalMode, testingMode);
          }
          catch (e) {
            console.log("ERROR: cannot stubbify file: " + curPath);
            // console.log(e);
          }
        }
      }
    });
  }
  else {
    console.log("Error: input to transformer must be a directory");
  }
}