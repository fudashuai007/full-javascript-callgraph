const fs = require('fs');
const { parse } = require('@babel/parser');
const  generate  = require('@babel/generator').default;
const { transformFromAstSync } = require('@babel/core');
const { generateNodeUID, getNumLinesSpannedByNode } = require('./stubUtils.js');
// const { log } = require('console');

const MIN_FCT_STUB_LENGTH = 5; // only stub functions that are > 5 lines long

function shouldTransformFunction(fctName, reachableFuns) {
  let fctNotInList = reachableFuns.includes(fctName);
  return fctNotInList;
}

// generated with babeljs_gen_gen
function get_stub_flag() {
  let node_map = {};
  node_map["new_StringLiteral_4"] = {
    type: "StringLiteral",
    value: "STUB_FLAG_STUB_THIS_STUB_FCT"
  };
  node_map["new_Identifier_3"] = {
    type: "Identifier",
    name: "eval"
  };
  node_map["new_CallExpression_2"] = {
    type: "CallExpression",
    callee: node_map["new_Identifier_3"],
    arguments: Array(node_map["new_StringLiteral_4"])
  };
  node_map["new_ExpressionStatement_1"] = {
    type: "ExpressionStatement",
    expression: node_map["new_CallExpression_2"]
  };
  return node_map["new_ExpressionStatement_1"];
}

/*
  processAST: do it
*/
function processASTForFlagging(ast, reachableFuns, filename, uncoveredMode) {

  // let funcMap : Map<string, [babel.Identifier[], babel.BlockStatement]> = new Map();
  let supportedFunctionNodes = [
    "FunctionExpression",
    "FunctionDeclaration",
    "ArrowFunctionExpression",
    "ClassMethod",
    "ObjectMethod",
  ];


  let output = transformFromAstSync(ast, null, {
    ast: true, plugins: [function processASTForFlagging() {
      return {
        visitor: {
          Function(path) {
            // let inFunction: boolean = path.findParent((path) => path.isFunction());
            if (supportedFunctionNodes.indexOf(path.node.type) > -1
              && getNumLinesSpannedByNode(path.node) > MIN_FCT_STUB_LENGTH) {
              // let functionUIDName = "global::" + path.node.id.name;
              let functionUIDName = generateNodeUID(path.node, filename, uncoveredMode);
              // don't forget to write out function body before we replace
              if (shouldTransformFunction(functionUIDName, reachableFuns)) {
                // console.log("Triggered stubbification.");
                if (path.node.kind == "constructor" ||
                  path.node.generator ||
                  path.node.async) { // TODO broken for generators 
                  path.skip(); // don't transform a constructor or anything in a constructor (stubs dont work with "super" and "this")
                } else {
                  let flaggedParent = path.findParent((path) => path.node.isFlagged);
                  if (!flaggedParent) {
                    let flaggingStmt = get_stub_flag();
                    path.node.body.body = [flaggingStmt].concat(path.node.body.body);
                    path.node.isFlagged = true;
                  }
                }
              }
            }
          },
        }
      }
    }]
  });


  return output.ast;
}


function flagFunctionForStubbing(filename, stubspath, reachableFuns, uncoveredMode) {

  // save the old file 
  // this might get removed later, but is useful right now for debugging
  fs.copyFileSync(filename, filename + ".original");

  let code = fs.readFileSync(filename, 'utf-8');
  // let origCodeFileName: string = process.cwd() + "/" + filename + ".BIGG";
  let ast;
  let esmMode = false;
  try {
    ast = parse(code, { sourceType: "unambiguous", plugins: ["classProperties", "typescript"] }).program;
    esmMode = ast.sourceType == "module";
  } catch (e) {
    console.error("Yikes... parsing error in " + filename + ":  " + e);
    return;
  }

  // Preprocess the AST, propagating function ID information to FunctionExpressions.
  ast = processASTForFlagging(ast, reachableFuns, filename, uncoveredMode);

  // console.log(generate(ast).code)
  // write out the stub, overwriting the old file
  fs.writeFileSync(filename, generate(ast).code);
}

exports.shouldTransformFunction = shouldTransformFunction;
exports.get_stub_flag = get_stub_flag;
exports.processASTForFlagging = processASTForFlagging;
exports.flagFunctionForStubbing = flagFunctionForStubbing;


