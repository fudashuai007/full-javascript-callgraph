// import { Command } from 'commander';
const { Command } = require('commander');
const program = new Command();
const { checkDirectoryValidate, getAllFiles } = require('./utils/file')
const astVisitor = require('./graph/astVisitor')
const binding = require('./graph/binding')
const pessimistic = require('./graph/pessimistic')
const fs = require('fs')
const path = require('path')
const JSONStream = require('JSONStream');
//
const options = {
  // analysisDir: 'src/test/Data/doctrine/lib',
  // analysisDir: 'src/test/Data/express/lib',
  // analysisDir: 'src/test/Data/passport/lib',
  // analysisDir: 'src/test/Data/request/lib',
  // analysisDir: 'src/test/Data/jshint/src',
  // analysisDir: 'mcg/src/test/exper',
  // analysisDir: 'src/test/Data/debug/src',
  // analysisDir: 'src/result/memfs/src',
  // analysisDir: 'mcg/src/test/Data/body-parser/analysis_dir/static',
  analysisDir: 'mcg/src/test/Data/memory-fs',
  // analysisDir: 'mcg/src/test/Data/compression',
  // analysisDir: 'mcg/src/test/Data/compression/node_modules/accepts',
  // analysisDir: 'mcg/src/test/Data/body-parser/analysis_dir/static/debug',
  output: ['a.json', 'b.json'],
  style: 'v8',
  time: true,
  od: 'src/result',
  v8: true,
  count: true,
};
program
  .name('Full-Js-CallGraph')
  .version('0.0.1')
  .description('javascript callgraph')
  .option("-d, --analysisDir directory <directory>", "base directory for files to analyse")
  .option("-o, --output result <xxx.json>", "output of analyse result")
  .option("-s, --output style", "output of V8 style column numbers")
  // .option("-t, --time <millisecond>", "analysis time")
  .action(main)
  .parse();
function addNode(edge, v) {
  if (v.type === 'NativeCalleeVertex') {

    let nd = v.call
    edge.label = 'NativeCallee(' + v.name + ')';
    edge.file = nd.mes.split('<')[0];
    edge.start = { row: v.loc.start.line, column: v.loc.start.column };
    edge.end = { row: v.loc.end.line, column: v.loc.end.column };
    edge.range = { start: nd.call.range[0], end: nd.call.range[1] };
    return edge;
  }
  if (v.type === 'CalleeVertex') {
    let nd = v.call;

    edge.label = astVisitor.encFuncName(nd.attr.enclosingFunction);
    edge.file = nd.attr.enclosingFile;
    edge.path = nd.attr.path;
    edge.start = { row: nd.loc.start.line, column: nd.loc.start.column };
    edge.end = { row: nd.loc.end.line, column: nd.loc.end.column };
    edge.range = { start: nd.range[0], end: nd.range[1] };
    return edge;
  }
  if (v.type === 'FuncVertex') {
    edge.label = astVisitor.funcname(v.func);
    edge.file = v.func.attr.enclosingFile;
    edge.path = v.func.attr.path;
    edge.start = { row: v.func.loc.start.line, column: v.func.loc.start.column };
    edge.end = { row: v.func.loc.end.line, column: v.func.loc.end.column };
    edge.range = { start: v.func.range[0], end: v.func.range[1] };
    return edge;
  }
  if (v.type === 'NativeVertex') {
    //'Math_log' (Native)
    edge.label = v.name;
    edge.file = "Native";
    edge.start.row = v.loc.start.row;
    edge.end.row = v.loc.end.column;
    edge.start.column = v.loc.start.column;
    edge.end.column = v.loc.end.column;
    edge.range = { start: null, end: null };
    return edge;
  }
  throw new Error("strange vertex: " + v);
};

function buildBinding(call, fn) {
  let edge = {
    source: {
      label: null,
      file: null,
      start: { row: null, column: null },
      end: { row: null, column: null },
      range: { start: null, end: null }
    },
    target: {
      label: null,
      file: null,
      start: { row: null, column: null },
      end: { row: null, column: null },
      range: { start: null, end: null }
    }
  };
  addNode(edge.source, call);
  addNode(edge.target, fn);
  return edge;
};
function pp123(v, baseDirToCut, v8Style) {

  if (v.fake) return v.func.attr.enclosingFile.replace(/\\/g, "/") + ':<' + v.func.loc.start.line + ':' + v.func.loc.start.column + ',' + v.func.loc.end.line + ':' + v.func.loc.end.column + '>'
  if (v.type === 'CalleeVertex')
    return astVisitor.ppPos2(v.call, baseDirToCut, v8Style);
  if (v.type === 'FuncVertex')
    return astVisitor.ppPos2(v.func, baseDirToCut, v8Style);
  if (v.type === 'NativeVertex')
    return astVisitor.ppPos2(v, baseDirToCut, v8Style, 'nativeFunc');
  // return v.name + '<' + v.loc.start.line + ':' + v.loc.start.column + ',' + v.loc.end.line + ':' + v.loc.end.column + '>';
  if (v.type === 'NativeCalleeVertex')
    return astVisitor.ppPos2(v, baseDirToCut, v8Style, 'nativeCallee');
  throw new Error("strange vertex: " + v);
}

function pp(v, baseDirToCut, v8Style) {

  if (v.fake) return v.func.attr.enclosingFile.replace(/\\/g, "/") + ':<' + v.func.loc.start.line + ',' + v.func.loc.start.column + '>--<' + v.func.loc.end.line + ',' + v.func.loc.end.column + '>'
  if (v.type === 'CalleeVertex')
    return astVisitor.ppPos2(v.call, baseDirToCut, v8Style);
  if (v.type === 'FuncVertex')
    return astVisitor.ppPos2(v.func, baseDirToCut, v8Style);
  if (v.type === 'NativeVertex')
    return astVisitor.ppPos2(v, baseDirToCut, v8Style, 'nativeFunc');
  // return v.name + '<' + v.loc.start.line + ':' + v.loc.start.column + ',' + v.loc.end.line + ':' + v.loc.end.column + '>';
  if (v.type === 'NativeCalleeVertex')
    return astVisitor.ppPos2(v, baseDirToCut, v8Style, 'nativeCallee');
  throw new Error("strange vertex: " + v);
}

function main() {
  // console.log(process.argv0);
  options.analysisDir = process.argv[2]
  options.output = [].concat(process.argv[3])


  // for (const opt of Object.getOwnPropertyNames(program.opts())) {
  //   options[opt] = program.opts()[opt]
  // }

  if (!options.analysisDir) {
    throw Error('you should input analysis directory or file')
  }

  if (!checkDirectoryValidate(options.analysisDir)) {
    throw Error('handling analysis directory error,please check the input directory and try again')
  }



  const allAnalyseFiles = getAllFiles(options.analysisDir, true, [])

  console.time("parsing  ");
  var ast = astVisitor.astFromFiles(allAnalyseFiles);
  console.timeEnd("parsing  ");

  console.time("bindings ");
  for (let fileAst of ast.programs.values()) {
    binding.addBindings(fileAst);
  }
  console.timeEnd("bindings ");
  let entry_file
  try{
    const packageJson = JSON.parse(fs.readFileSync(path.join(options.analysisDir,'package.json'), 'utf8'));  
    entry_file = packageJson.main;
  }catch{
    entry_file='index.js'
  }

  var forest = astVisitor.mergeAst(ast, options.analysisDir,entry_file)
  let cgs = []
  console.time("callgraph ");
  for (let tree of forest) {
    let tree_kids = tree.kids

    // if(visitedForests.has(tree.name))
    cgs.push(pessimistic.buildCallGraph(tree))
  }
  console.timeEnd("callgraph ");

  // let result = [];
  let styleResult = new Set()
  for (let i = 0; i < cgs.length; i++) {
    cgs[i].edges.iter(function (call, fn) {
      // let edge = buildBinding(call, fn)
      let start = pp(call, options.analysisDir, options.v8)
      let end = pp(fn, options.analysisDir, options.v8)
      if (start.split(':<')[1] != end.split(':<')[1])
        if (end.includes('Native') && start.includes('1:0,1:0') || !end.includes('Native'))
          styleResult.add(start + " -> " + end)
    });
  }
  if (options.output !== null) {
    let filename = options.output[0];
    // let filename2 = options.output[1]
    // if (!filename.endsWith(".json")) {
    //   filename += ".json";
    // }
    // fs.writeFile(filename, JSON.stringify(result, null, 2), function (err) {
    //   if (err) {
    //     let transformStream = JSONStream.stringify();
    //     let outputStream = fs.createWriteStream(filename);
    //     transformStream.pipe(outputStream);
    //     result.forEach(transformStream.write);
    //     transformStream.end();
    //   }
    // });

    fs.writeFile(filename, JSON.stringify([...styleResult], null, 2), function (err) {
      if (err) {
        /*
        When happened something wrong (usually out of memory when we want print
        the result into a file), then we try to file with JSONStream.
         */
        let transformStream = JSONStream.stringify();
        let outputStream = fs.createWriteStream(filename);
        transformStream.pipe(outputStream);
        styleResult.forEach(transformStream.write);
        transformStream.end();
      }
    });

  }


}