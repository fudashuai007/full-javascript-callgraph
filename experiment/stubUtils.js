
const babel = require("@babel/types");
const path = require('path')
const fs = require('fs')
const parser = require('@babel/parser');
const readlines = require('n-readlines');
const generate = require('@babel/generator').default;
// 文件路径或位置信息的格式化
function buildHappyName(sad) {
  /* 输入: acorn/src/location.js:<12,11>--<18,1>
     输出: acorn_src_location_12_11_18_1
  */
  //  sad='acorn/src/location.js:<12,11>--<18,1>'
  var happyName = "";
  // 将输入字符串中的点（.）替换为 'dot'，
  // 将破折号（-）替换为 'dash'。这一步是为了对输入的字符串进行清理和规范化
  // sad = sad.replace(/\./g, 'dot').replace(/-/g, 'dash');
  sad = sad.replace(/\./g, 'dot').replace(/-/g, 'dash');

  var split = sad.split(/.js:<|.ts:</);
  if (split.length < 2) {
    return sad;
  }
  happyName += split[0].replace(/\//g, '_') + '_';
  happyName += split[1].substring(0, split[1].length - 1).replace(/,/g, '_').replace('>dashdash<', '_');
  // happyName += split[1].substring(0, split[1].length - 1).replace(/,/g, '_').replace(/\'dash\'/g, '_');
  return happyName;
}
// 生成函数id
function generateNodeUID(n, filename, coverageMode) {
  let locString;
  locString = "<" + n.body.loc.start.line + "," + n.body.loc.start.column + ">--<" + n.body.loc.end.line + "," + n.body.loc.end.column + ">";
  return buildHappyName(filename + ":" + locString);
}


function colNum2V8(ln, col, bdir, type) {
  let endTag = {
    "start": "{",
    "end": "("
  }
  let liner = new readlines(bdir);
  let lCount = 0;
  let next;
  let newCol = col;
  while (next = liner.next()) {
    lCount++;
    if (lCount === ln) {
      var line = next.toString("utf-8");
      if (!line.substring(col).includes("=>")) {
        while (line.charAt(newCol) !== endTag[type]) {
          newCol++;
          if (newCol > line.length) {
            newCol = 0;
            break;
          }
        }
      }
    }
  }
  return newCol;

}
// 从一个特定格式的调用图文件中提取目标信息
function getTargetsFromACG(filepath, profpath, coverpath,cur_path) {
  let listFunc = []
  // 静态结果
  const static_result = path.join(__dirname, filepath)
  let pattern = /<(\d+),(\d+)>--<(\d+),(\d+)>/;
  let pattern2 = /(\d+):(\d+):(\d+):(\d+)/;
 
  // 读取指定路径下的文件，并按行拆分为数组 unprocessedCG
  let unprocessedCG = fs.readFileSync(static_result, 'utf-8').split('\n');
  /* 移除收尾括号 */
  unprocessedCG.shift();
  unprocessedCG.pop();

  unprocessedCG = unprocessedCG.map(item => {
    item = item.replace(/\s+/g, '')
    let [source,target] = item.split('->').map(item=>item.match(pattern))
    source =source.input.split(':')[0]+'<'+source[1]+',fake>--<'+ source[3]+','+ source[4]+'>'
    target =target.input.split(':')[0]+'<'+target[1]+',fake>--<'+ target[3]+','+ target[4]+'>'
    item=source+'->'+target
    return item
  })

  let visitedItem = new Set()
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, profpath), 'utf8'));
  let dynamic_result = []
  for(const key in data){
    let start
    if(key =='system (Native)' || key =='anon (Native)'){
      start='/'+cur_path+'/:'+'1:0:1:0'
    }else{  
        start ='/'+cur_path+'/:'+ key.split(' ')[key.includes('Native')?2:1].replace(/\(|\)/g,'').replace(':','\/')  
    }
    let matches = start.match(pattern2)
    start= matches.input.split(':')[0]+'<'+matches[1]+',fake>--<'+ matches[3]+','+ matches[4]+'>'
     
    data[key].forEach(item=>{
      if(!item.includes('Native') && !item.includes(':{')){
        item ='/'+cur_path+'/'+ item.split(' ')[item.includes('Native')?2:1].replace(/\(|\)/g,'').replace(':','\/')
        matches = item.match(pattern2)
        item = matches.input.split(':')[0]+'<'+matches[1]+',fake>--<'+ matches[3]+','+ matches[4]+'>'
        dynamic_result.push(start+'->'+item)
      }
    })
  }

  // node_prof结果
  // let node_prof_global = data['system'].filter(item => !item.includes(':{')).concat(data['anon'])

  // // coverage结果
  // let cover_data = getTargetsFromCoverageReport(coverpath)

  // 返回函数调用结果列表
  let targets = []

  // 函数的调用关系
  listFunc = listFunc.concat(unprocessedCG.filter(item => {
    item = item.trim(' ').trim('"')
    if (item.includes('<1,0>--<1,0>')) {
      visitedItem.add(item)
      return true
    }
  }))


  // dynamic_result.forEach(item1 => {
  //   let startRow = item1.split(':')[1]
  //   let endRow = item1.split(':')[3]
  //   let endCol = Number(item1.split(':')[4].split(')')[0]) - 1
  //   let res = unprocessedCG.filter((item) => {
  //     item = item.trim(' ').trim('"')
  //     let pattern = /<(\d+),(\d+)>--<(\d+),(\d+)>/;
  //     let matchRes = item.split('->')[0].match(pattern)
  //     let sg_start_row = matchRes[1], sg_end_row = matchRes[3], sg_end_column = matchRes[4]
  //     if (startRow == sg_start_row && endRow == sg_end_row && endCol == sg_end_column) {
  //       visitedItem.add(item)
  //       return true
  //     }
  //   })
  //   listFunc = listFunc.concat(res)
  // })
  listFunc.forEach(item => {
    let target = item.split('->')[1]
    findChildrenFunction(unprocessedCG, listFunc, target, visitedItem)

  })

  // cover_data.forEach(item => {
  //   findChildrenFunction(unprocessedCG, listFunc, item, visitedItem)
  // })
  listFunc.forEach(line => {
    let split_line = line.trim(' ').trim('"')
    let [source, target] = split_line.split('->')
    source = source.replace(/\"/g, '').replace(/\s/g, '')
    target = target.replace(/\"/g, '').replace(/\s/g, '')
    targets.push(source)
    targets.push(target)
  })


  return targets;
}

function findChildrenFunction(allFunc, listFunc, parentId, visited) {
  let res = allFunc.filter((item) => {
    if (!visited.has(item)) {
      parentId = parentId.replace(/\"/g, '').replace(/\s/g, '')
      if (item.split('->')[0].includes(parentId)) {
        visited.add(item)
        return true
      }
    }
  })
  if (res.length == 0) return
  else {
    res.forEach(item => {
      listFunc.push(item)
      findChildrenFunction(allFunc, listFunc, item.split('->')[1], visited)
    })
  }
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
          `${path.relative(__dirname, fileName)}:<${loc.start.line},${loc.start.column}>--<${loc.end.line},${loc.end.column}>`
        )
      } else {
        const loc = coverage[fileName].fnMap[key].loc;
        uncalledFunctions.push(
          `${path.relative(__dirname, fileName)}:<${loc.start.line},${loc.start.column}>--<${loc.end.line},${loc.end.column}>`
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



const SKIP_DIR = ['.nyc_output', '.git', 'coverage', 'build', 'docs', 'changelogs']
// 获取指定目录下的所有文件路径，并递归获取子目录中的文件路径
function getAllFiles(dirname, recurse = true, listOfFiles = [], dept) {
  let baseListOfFiles = fs.readdirSync(dirname);

  for (let i = 0; i < baseListOfFiles.length; i++) {
    if (fs.statSync(path.join(dirname, baseListOfFiles[i])).isDirectory() &&
      !SKIP_DIR.includes(baseListOfFiles[i]) &&
      recurse) {
      let node_mod_index = dirname.split("\\").indexOf("node_modules")

      if (node_mod_index > -1 && dept) {
        if (dept.indexOf(curPath.split("\\")[node_mod_index + 1]) > -1) {
          listOfFiles = getAllFiles(path.join(dirname, baseListOfFiles[i]), recurse, listOfFiles);
        }
      } else {
        listOfFiles = getAllFiles(path.join(dirname, baseListOfFiles[i]), recurse, listOfFiles);
      }
    }
    else {
      if (baseListOfFiles[i].endsWith('js') || baseListOfFiles[i].endsWith('ts')) {
        listOfFiles.push(path.join(dirname, baseListOfFiles[i]));
      }

    }
  }
  return listOfFiles.filter(item => item != '');
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
    let node_mod_index = curPath.split("\\").indexOf("node_modules");
    if (node_mod_index > -1) { // if it's a node_module and we have a dep list, need to make sure it's in the dep list 
      shouldStub = shouldStub && (depList.indexOf(curPath.split("\\")[node_mod_index + 1]) > -1);
    }
  }
  return shouldStub;
}



function getFunctionCode(sourceCode,body){
  var functionBodyLength = body.range[1] - body.range[0] - 2;
  var startIndex = body.range[0] + 1;
  var functionBody =sourceCode.slice(startIndex, startIndex + functionBodyLength);
  return functionBody;
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
