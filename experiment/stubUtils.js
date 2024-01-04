
const babel = require("@babel/types");
const path = require('path')
const fs = require('fs')
const parser=require('@babel/parser');
const generate  = require('@babel/generator').default;
// 文件路径或位置信息的格式化
function buildHappyName(sad) {
  /* 输入: acorn/src/location.js:<12,11>--<18,1>
     输出: acorn_src_location_12_11_18_1
  */
  var happyName = "";
  // 将输入字符串中的点（.）替换为 'dot'，
  // 将破折号（-）替换为 'dash'。这一步是为了对输入的字符串进行清理和规范化
  sad = sad.replace(/\./g, 'dot').replace(/-/g, 'dash');

  var split = sad.split(/.js:<|.ts:</);
  if (split.length < 2) {
    return sad;
  }
  happyName += split[0].replace(/\//g, '_') + '_';
  happyName += split[1].substring(0, split[1].length - 1).replace(/,/g, '_').replace('>dashdash<', '_');
  return happyName;
}
// 生成函数id
function generateNodeUID(n, filename, coverageMode) {
  // acorn/src/location.js:<12,12>--<18,1>
  let locString;
  if (!coverageMode)
    locString = "<" + n.loc.start.line + "," + n.loc.start.column + ">--<" + n.loc.end.line + "," + n.loc.end.column + ">";
  else {
    locString = "<" + n.body.loc.start.line + "," + n.body.loc.start.column + ">--<" + n.body.loc.end.line + "," + n.body.loc.end.column + ">";
  }

  return buildHappyName(filename + ":" + locString);
}

function adjustLOC(locAsString) {
  /* Fun(/opt/src/acorn/src/location.js:<12,12>--<18,1>) 
     want
     acorn/src/location.js:<12,11>--<18,1>

     note the -1 on the first column
  */

  /* get /opt/src/acorn/src/location.js:<12,12>--<18,1> */
  let adjustedLOC = locAsString.substring(4, locAsString.length - 1);

  /* trim up to package root (by removing /opt/src/) 
     get acorn/src/location.js:<12,12>--<18,1> */
  // adjustedLOC = adjustedLOC.substring("/opt/src/".length, adjustedLOC.length);

  /* adjust column number
     get acorn/src/location.js:<12,11>--<18,1> */
  let firstIndex = adjustedLOC.indexOf(":<") + ":<".length;
  let secondIndex = adjustedLOC.indexOf(">--<");
  let firstRowCol = adjustedLOC.substring(firstIndex, secondIndex).split(',');
  firstRowCol[1] = String(Number(firstRowCol[1]) - 1);
  adjustedLOC = adjustedLOC.substring(0, firstIndex) + firstRowCol[0] + ',' + firstRowCol[1] +
    adjustedLOC.substring(secondIndex);

  return adjustedLOC;
}
// 从一个特定格式的调用图文件中提取目标信息
function getTargetsFromACG(filepath) {
  // 读取指定路径下的文件，并按行拆分为数组 unprocessedCG
  let unprocessedCG = fs.readFileSync(filepath, 'utf-8').split('\n');

  // unprocessedCG 输入格式
  // "col0","col1"
  // "Callee(/home/ellen/Documents/ONR_Debloating/stubbifier/playground/commander.js/index.js:<90,14>--<98,3>)","Fun(/home/ellen/Documents/ONR_Debloating/stubbifier/playground/commander.js/index.js:<90,14>--<98,3>)"
  // "Callee(/home/ellen/Documents/ONR_Debloating/stubbifier/playground/commander.js/index.js:<90,14>--<98,3>)","Fun(/home/ellen/codeql_home/codeql/javascript/tools/data/externs/es/es3.js:<2244,27>--<2244,60>)"
  /* 移除第一行的col0,col1 */
  unprocessedCG.shift();

  let targets = unprocessedCG.map((line) => {
    line = line.substring(1, line.length - 2);
    let target = line.split('\",\"')[1];

    if (!target || target.substr(0, 3) != 'Fun') {
      return "";
    }

    return adjustLOC(target);
  })

  let partialRet = targets.filter((line) => {
    return line != "";
  });

  return partialRet;
}

// 获取代码覆盖率报告中未覆盖的函数信息，并将其返回
function getTargetsFromCoverageReport(filepath) {
  let uncoveredFunctions = getUncoveredFunctions(filepath);

  return uncoveredFunctions;
}

// 提取未覆盖的函数信息，并以数组形式返回
function getUncoveredFunctions(pathToCoverageReport) {
  // 加载指定路径的代码覆盖率报告文件
  const coverage = require(path.join(__dirname, pathToCoverageReport));
  const calledFunctions = []; // 被调用列表
  const uncalledFunctions = []; // 未被调用函数列表
  Object.keys(coverage).forEach((fileName) => { //遍历覆盖率报告中的每个文件
    Object.keys(coverage[fileName].fnMap).forEach((key) => { // 遍历每个文件中的函数
      if (coverage[fileName].f[key] > 0) { // 根据覆盖率信息判断函数是否被调用
        const loc = coverage[fileName].fnMap[key].loc;
        calledFunctions.push(
          `${fileName}:<${loc.start.line},${loc.start.column}>--<${loc.end.line},${loc.end.column}>`
        )
      } else {
        const loc = coverage[fileName].fnMap[key].loc;
        uncalledFunctions.push(
          `${fileName}:<${loc.start.line},${loc.start.column}>--<${loc.end.line},${loc.end.column}>`
        )
      }
    });
  });
  return calledFunctions;
}
// 获取文件名
function getFileName(target) {
  return target.split(":")[0];
}

// 获取文件名
function getFileName2(target) {
  return target.split(":<")[0];
}

// 检查是否存在危险函数调用的函数
// 函数调用之前插入一段检查代码，以确保被调用的函数不是危险的函数
// 创建一个临时变量 tempVarID 用于保存函数调用的函数。
// 如果函数调用是一个成员表达式（MemberExpression），并且其属性是一个标识符（Identifier）或私有名称（PrivateName），则保存接收器（receiver）。
// 如果有接收器，使用 bind 方法将调用函数绑定到接收器，以确保在后续的检查中可以比较两者是否相等。
// 创建一个中间表达式 intermCallExp，用于检查 tempVarID 是否在危险函数数组中。
// 创建一个条件语句，如果 tempVarID 在危险函数数组中，则输出警告信息。
// 创建一个返回语句，调用原始的函数调用，并将其封装在一个箭头函数中。
// 返回一个调用箭头函数的表达式
function buildEvalCheck(callExpNode, inAsyncFct, filename) {
  // if ( callee === eval ) { console.warn("BTW dangerous call"); }
  // "let dangerousFunctions = [eval, process.exec];"
  // ( () => let tempExp__uniqID = callee; if( tempExp__uniqID === eval) { console.warn("uh oh"); } return tempExp__uniqID; )()
  var tempVarID = babel.identifier("tempExp__uniqID");
  var tempVarDecl = babel.variableDeclaration("let", [babel.variableDeclarator(tempVarID, React.createElement("any", null, "callExpNode.callee)]); let tempVarDecls : babel.Statement[] = [tempVarDecl]; if (callExpNode.callee.type == \"MemberExpression\" && ( callExpNode.callee.property.type == \"Identifier\" || callExpNode.callee.property.type == \"PrivateName\")) ",
    // If it's a memberExpression, we want to save the receiver.
    let, " tempReceiverID: babel.Identifier = babel.identifier(\"tempEXP__rec__uniqID\"); let tempReceiver = babel.variableDeclaration(\"let\", [babel.variableDeclarator(tempReceiverID, callExpNode.callee.object)]); // callee.bind(callee.object) let tempBindCall: babel.CallExpression = babel.callExpression( babel.memberExpression(babel.memberExpression(tempReceiverID, callExpNode.callee.property, callExpNode.callee.computed), babel.identifier(\"bind\")), [tempReceiverID]); (", React.createElement("any", null, "tempBindCall).isNewCallExp = true; tempVarDecl = babel.variableDeclaration(\"let\", [babel.variableDeclarator(tempVarID, tempBindCall)]); tempVarDecls = [tempReceiver, tempVarDecl]; } let intermCallExp: babel.CallExpression = babel.callExpression( babel.memberExpression( babel.identifier(\"dangerousFunctions\"), babel.identifier(\"indexOf\") ), [ tempVarID] ); (", React.createElement("any", null, "intermCallExp).isNewCallExp = true; let test = babel.binaryExpression( \">\", intermCallExp, babel.numericLiteral(-1) ); let consequent: babel.Statement = babel.expressionStatement( babel.callExpression( babel.memberExpression( babel.identifier(\"console\"), babel.identifier(\"warn\") ), [ babel.stringLiteral(\"[STUBBIFIER METRICS] WARNING: Dangerous call in expanded stub, in file: \" + filename)] )); (", React.createElement("any", null, "consequent.expression).isNewCallExp = true; let ifCheckStmt: babel.IfStatement = babel.ifStatement( test, consequent); let retCallExp: babel.CallExpression = babel.callExpression(", React.createElement("any", null, "callExpNode.callee/*tempVarID*/, callExpNode.arguments); (", React.createElement("any", null, " retCallExp).isNewCallExp = true; let returnStmt: babel.ReturnStatement = babel.returnStatement( retCallExp); let arrowFunc: babel.ArrowFunctionExpression = babel.arrowFunctionExpression( [], // params babel.blockStatement(tempVarDecls.concat([ifCheckStmt, returnStmt])), inAsyncFct) // whether or not it should be async return babel.callExpression( arrowFunc, []); } // generate rollup.stubbifier.config.js in the directory specified export function generateBundlerConfig( dirname): void ",
      /*
          export default {
            input: 'name of the main file in package.json',
            output: {
              dir: 'output',
              format: 'cjs'
            },
            context: 'null',
            moduleContext: 'null',
            plugins: [nodeResolve({ moduleDirectories: ['node_modules'] }), commonjs(), babel()]
          };
      */
      let, " mainPath= undefined; try ", let, " json = JSON.parse(fs.readFileSync(dirname + \"/package.json\", 'utf-8')); mainPath = json.main; } catch(e) ", " // if there's an error, then we're not using esm if( ! mainPath) ", mainPath = "index.js", "let configBody = `import nodeResolve from '@rollup/plugin-node-resolve'; import babel from '@rollup/plugin-babel'; import commonjs from '@rollup/plugin-commonjs'; import json from '@rollup/plugin-json'; export default ", input, ": '$", mainPath, "', output: ", file, ": 'stubbifyBundle.js', format: 'cjs' }, context: 'null', moduleContext: 'null', plugins: [nodeResolve(", moduleDirectories, ": ['node_modules'] }), commonjs(), babel(), json()] };`; configBody = generate( parse(configBody, ", sourceType, ": \"unambiguous\"}).program).code; fs.writeFileSync( dirname + \"/rollup.stubbifier.config.js\", configBody); }")))))))]);
}

// 生成一个 Rollup 打包工具的配置文件 rollup.stubbifier.config.js
function generateBundlerConfig(dirname) {
  /*
      export default {
        input: 'name of the main file in package.json',
        output: {
          dir: 'output',
          format: 'cjs'
        },
        context: 'null',
        moduleContext: 'null',
        plugins: [nodeResolve({ moduleDirectories: ['node_modules'] }), commonjs(), babel()]
      };
  */

  let mainPath = undefined;

  try {
    let json = JSON.parse(fs.readFileSync(dirname + "/package.json", 'utf-8'));
    mainPath = json.main;
  } catch (e) { } // if there's an error, then we're not using esm

  if (!mainPath) {
    mainPath = "index.js"
  }

  let configBody =
    `import nodeResolve from '@rollup/plugin-node-resolve';
   import babel from '@rollup/plugin-babel';
   import commonjs from '@rollup/plugin-commonjs';
   import json from '@rollup/plugin-json';

   export default {
        input: '${mainPath}',
        output: {
          file: 'stubbifyBundle.js',
          format: 'cjs'
        },
        context: 'null',
        moduleContext: 'null',
        plugins: [nodeResolve({ moduleDirectories: ['node_modules'] }), commonjs(), babel(), json()]
      };`;

  configBody = generate(parser.parse(configBody, { sourceType: "unambiguous" }).program).code;
  fs.writeFileSync(dirname + "/rollup.stubbifier.config.js", configBody);

}

function getNumLinesSpannedByNode(n) {
  return n.loc.end.line - n.loc.start.line;
}



const SKIP_DIR = ['.nyc_output', '.git', 'coverage', 'test', 'build', 'docs', '__test__', 'changelogs']
// 获取指定目录下的所有文件路径，并递归获取子目录中的文件路径
function getAllFiles(dirname, recurse = true, listOfFiles = []) {
  let baseListOfFiles = fs.readdirSync(dirname);

  for (let i = 0; i < baseListOfFiles.length; i++) {
    if (fs.statSync(dirname + "/" + baseListOfFiles[i]).isDirectory() &&
      !SKIP_DIR.includes(baseListOfFiles[i]) &&
      recurse) {
      // console.log( );
      // SKIP_DIR.indexOf(baseListOfFiles[i]!=-1) &&
      listOfFiles = getAllFiles(dirname + "/" + baseListOfFiles[i], recurse, listOfFiles);
    }
    else {
      if (baseListOfFiles[i].endsWith('js') || baseListOfFiles[i].endsWith('ts')) {
        listOfFiles.push(path.join(dirname, baseListOfFiles[i]));
      }

    }
  }
  return listOfFiles;
};
// 确定是否应该对指定的文件进行stubbify操作
function shouldStubbify(curPath, file, depList) {
  let shouldStub = fs.lstatSync(curPath).isFile() &&  // 检查文件是否为普通文件而不是目录
    file.substr(file.length - 2) == "js" && // 检查文件是否以 ".js" 结尾
    file.indexOf("externs") == -1 && //  确保文件名中不包含 "externs"
    file.indexOf("node_modules/@babel") == -1 && // 确保文件路径中不包含 "@babel" 目录
    (file.indexOf("test") == -1 ||
      file.indexOf("node_modules") > -1);
  // 如果传入了依赖列表 depList，则检查文件是否在依赖列表中。如果文件位于 "node_modules" 目录下，确保其在依赖列表中
  if (depList) {
    let node_mod_index = curPath.split("/").indexOf("node_modules");
    if (node_mod_index > -1) { // if it's a node_module and we have a dep list, need to make sure it's in the dep list 
      shouldStub = shouldStub && (depList.indexOf(curPath.split("/")[node_mod_index + 1]) > -1);
    }
  }
  return shouldStub;
}

exports.buildHappyName = buildHappyName;
exports.generateNodeUID = generateNodeUID;
exports.getTargetsFromACG = getTargetsFromACG;
exports.getTargetsFromCoverageReport = getTargetsFromCoverageReport;
exports.getUncoveredFunctions = getUncoveredFunctions;
exports.getFileName = getFileName;
exports.getFileName2 = getFileName2;
exports.buildEvalCheck = buildEvalCheck;
exports.generateBundlerConfig = generateBundlerConfig;
exports.getNumLinesSpannedByNode = getNumLinesSpannedByNode;
exports.getAllFiles = getAllFiles;
exports.shouldStubbify = shouldStubbify;
