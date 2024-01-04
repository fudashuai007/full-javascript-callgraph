// import { Command } from 'commander';
const { Command } = require('commander');
const program = new Command();
const { checkDirectoryValidate, getAllFiles } = require('./utils/file')
const astVisitor = require('./graph/astVisitor')
const binding = require('./graph/binding')
const pessimistic = require('./graph/pessimistic')
const fs = require('fs')
const JSONStream = require('JSONStream');
//
const options = {
  // analysisDir: 'src/test/Data/doctrine/lib',
  // analysisDir: 'src/test/Data/express/lib',
  // analysisDir: 'src/test/Data/passport/lib',
  // analysisDir: 'src/test/Data/request/lib',
  // analysisDir: 'src/test/Data/jshint/src',
  // analysisDir: 'src/test/exper',
  // analysisDir: 'src/test/Data/debug/src',
  // analysisDir: 'src/result/memfs/src',
  analysisDir: 'mcg/src/test/exper',
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
    // let nd = v.call;
    // edge.label = astVisitor.funcname(v.call.func)
    // // edge.label = 'nativeCall(' + nd.attr.path.split(' ')[nd.attr.path.split(' ').length - 1] + ')';
    // edge.file = nd.func.attr.enclosingFile;
    // edge.path = nd.attr.path;
    // edge.start = { row: nd.func.loc.start.line, column: nd.func.loc.start.column };
    // edge.end = { row: nd.func.loc.end.line, column: nd.func.loc.end.column };
    // edge.range = { start: nd.func.range[0], end: nd.func.range[1] };
    // return edge;
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
    edge.start.row = null;
    edge.end.row = null;
    edge.start.column = null;
    edge.end.column = null;
    edge.range = { start: null, end: null };
    return edge;
  }
  throw new Error("strange vertex: " + v);
};

function buildBinding(call, fn) {
  // console.log(call);
  // console.log(attr);
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


function pp(v, baseDirToCut, v8Style) {
  if (v.type === 'CalleeVertex')
    // return astVisitor.ppPos(v.call);
    return astVisitor.ppPos(v.call, baseDirToCut, v8Style);
  if (v.type === 'FuncVertex')
    // return astVisitor.ppPos(v.func);
    return astVisitor.ppPos(v.func, baseDirToCut, v8Style);
  if (v.type === 'NativeVertex')
    return v.name;
  if (v.type === 'NativeCalleeVertex')
    return astVisitor.ppPos(v, baseDirToCut, v8Style, 'native');
  throw new Error("strange vertex: " + v);
}

function main() {
  for (const opt of Object.getOwnPropertyNames(program.opts())) {
    options[opt] = program.opts()[opt]
  }

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


  var forest = astVisitor.mergeAst(ast)
  let cgs = []
  console.time("callgraph ");
  for (let tree of forest) {
    // console.log(tree);
    cgs.push(pessimistic.buildCallGraph(tree))
  }
  // cg = pessimistic.buildCallGraph(ast)

  console.timeEnd("callgraph ");

  let result = [];
  let styleResult = []
  for (let i = 0; i < cgs.length; i++) {
    cgs[i].edges.iter(function (call, fn) {
      let edge = buildBinding(call, fn)

      // styleResult.push(pp(call,options.analysisDir,options.v8) + " -> " + pp(fn,options.analysisDir,options.v8))
      // if (options.od) {
      //   styleResult.push(pp(call, options.od, options.v8) + " -> " + pp(fn, options.od, options.v8))
      //   // console.log();
      // }
      if (!(edge.source.file == 'Native' || edge.target.file == 'Native')) {
        styleResult.push(
          edge.source.file + ':' + edge.source.start.row + ':' + edge.source.start.column
          + " -> " +
          edge.target.file + ':' + edge.target.start.row + ':' + edge.target.start.column)
      }
      result.push(edge);
    });
  }


  console.log(result);
  // result = result.filter(item => item.source.label != item.target.label)
  // console.log(styleResult);


  if (options.output !== null) {
    let filename = options.output[0];
    let filename2 = options.output[1]
    if (!filename.endsWith(".json")) {
      filename += ".json";
    }
    fs.writeFile(filename, JSON.stringify(result, null, 2), function (err) {
      if (err) {
        /*
        When happened something wrong (usually out of memory when we want print
        the result into a file), then we try to file with JSONStream.
         */
        let transformStream = JSONStream.stringify();
        let outputStream = fs.createWriteStream(filename);
        transformStream.pipe(outputStream);
        result.forEach(transformStream.write);
        transformStream.end();
      }
    });

    fs.writeFile(filename2, JSON.stringify(styleResult, null, 2), function (err) {
      if (err) {
        /*
        When happened something wrong (usually out of memory when we want print
        the result into a file), then we try to file with JSONStream.
         */
        let transformStream = JSONStream.stringify();
        let outputStream = fs.createWriteStream(filename2);
        transformStream.pipe(outputStream);
        styleResult.forEach(transformStream.write);
        transformStream.end();
      }
    });

  }
  return result;

}