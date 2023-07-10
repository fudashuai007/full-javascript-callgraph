// import { Command } from 'commander';
const { Command } = require('commander');
const program = new Command();
const { checkDirectoryValidate, getAllFiles } = require('./utils/file')
const astVisitor = require('./graph/astVisitor')
const binding = require('./graph/binding')
const options = {
  analysisDir: 'src/test',
  output: [],
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

  if (args.time) console.time("bindings ");
  bindings.addBindings(ast);
  if (args.time) console.timeEnd("bindings ");
}