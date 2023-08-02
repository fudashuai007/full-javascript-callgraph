// import { Command } from 'commander';
const { Command } = require('commander');
const program = new Command();
const { checkDirectoryValidate, getAllFiles } = require('./utils/file')
const astVisitor = require('./graph/astVisitor')
const binding = require('./graph/binding')
const pessimistic = require('./graph/pessimistic')
const fs = require('fs')
const JSONStream = require('JSONStream');
const options = {
  analysisDir: 'src/test',
  output: ['a.json'],
  time: true,
  count: true,
};
program
  .name('Full-Js-CallGraph')
  .version('0.0.1')
  .description('javascript callgraph')
  .option("-d, --analysisDir directory <directory>", "base directory for files to analyse")
  .option("-o, --output result <xxx.json>", "output of analyse result")
  // .option("-t, --time <millisecond>", "analysis time")
  .action(main)
  .parse();
function addNode(edge, v) {
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
  binding.addBindings(ast);
  console.timeEnd("bindings ");
  console.time("callgraph ");
  cg = pessimistic.buildCallGraph(ast);
  console.timeEnd("callgraph ");

  let result = [];
  cg.edges.iter(function (call, fn) {
    let edge = buildBinding(call, fn)
    // if(edge.source.label ===edge.target.label) continue
    // if (result.some(item => item.target.label === edge.target.label && item.source.label === 'global' && item.source.path!='global')) {
    //   let preEdgeIndex = result.findIndex(item => item.target.label === edge.target.label && item.source.label === 'global')
    //   result.splice(preEdgeIndex, 1)
    // }
    result.push(edge);
  });

  // console.log(options.output);
  // result = result.filter(item => item.source.label != item.target.label)
  console.log(result);
  if (options.output !== null) {
    let filename = options.output[0];
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

  }
  return result;
}