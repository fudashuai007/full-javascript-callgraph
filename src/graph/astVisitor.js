
const parser = require('@babel/parser');
const babel = require('@babel/core');
const fs = require('fs');
const traverse = require('@babel/traverse').default
// const prep = require('./srcPreprocessor');
const { trimHashbangPrep } = require('../utils/tool')
const { errorLog } = require('../utils/log');
// const { privateName } = require('@babel/types');


/** gnerate AST from files */
function astFromFiles(files) {
  const ast = {
    type: 'ProgramCollection',
    programs: [],
    attr: {}
  }

  for (let file of files) {
    try {
      let src = fs.readFileSync(file, 'utf-8');
      ast.programs.push(buildProgram(file, src));
    } catch (error) {
      errorLog(err, 'file:' + file + 'load error for:')
    }

  }
  init(ast);
  collectPathData(ast)
  return ast;
}


/* Set up `attr` field that can be used to attach attributes to
 * nodes, and fill in `enclosingFunction` and `enclosingFile`
 * attributes. */
function init(root) {
  var enclosingFunction = null, enclosingFile = null;

  // global collections containing all functions and all call sites
  root.attr.functions = [];
  // root.attr.functions = new Map()
  root.attr.calls = [];

  // root.attr.global.set(enclosingFile,new Map())
  visit(root, function (nd, doVisit, parent, childProp) {
    if (nd.type && !nd.attr)
      nd['attr'] = {};
    let path = ''
    if (nd.type === 'Program') {
      path = 'global'

    } else {
      if (nd.type === 'CallExpression' || nd.type === 'NewExpression') {

        switch (nd.callee.type) {
          // 
          case 'Identifier':
            path = parent.attr.path + ' ' + nd.callee.name
            break;
          case 'MemberExpression':
            path = parent.attr.path + ' ' + handleRecusiveFindPath(nd.callee)
            break;
          // 匿名函数调用
          case 'ParenthesizedExpression':
          case 'FunctionExpression':
            path = parent.attr.path
            break
        }
        // nd.attr['callPath'] = callPath
        // console.log(nd);
        root.attr.calls.push(nd);
      }
      else {
        if (nd.type === 'Property' || nd.type === 'MethodDefinition') {
          path = parent.attr.path + (nd.key && nd.key.name ? ' ' + nd.key.name : ' ' + nd.key.value)
        } else {
          // 处理对象属性的赋值是具名函数的情况:obj:{a:function aa(){}}
          if (nd.type === 'FunctionExpression' && (childProp === 'value' || childProp === 'init')) {
            path = parent.attr.path
          } else
            path = parent.attr.path + (nd.id && nd.id.name ? ' ' + nd.id.name : '')
        }


      }
    }

    nd.attr['path'] = path

    if (enclosingFunction)
      nd.attr.enclosingFunction = enclosingFunction;
    if (enclosingFile) {
      nd.attr.enclosingFile = enclosingFile;
    }


    if (nd.type === 'Program') {
      enclosingFile = nd.attr.filename;
      root.attr.global = new Map()
    }
    if (nd.type === 'FunctionExpression' && parent !== undefined && parent.type === 'Property') {
      if (!parent.computed) {
        if (parent.key.type === 'Identifier') {
          nd.id = parent.key;
        }
        else if (parent.key.type === 'Literal') {
          // create a new `Identifier` AST node and set it to `FunctionExpression`'s id
          nd.id = {
            type: 'Identifier',
            name: parent.key.value,
            range: parent.key.range,
            loc: parent.key.loc
          };
        }
        else {
          console.log("WARNING: unexpected key type of 'Property'.");
        }
      }
      else
        console.log("WARNING: Computed property for method definition, not yet supported.");
    }

    if (nd.type === 'ClassDeclaration') {
      // root.attr.global.set(nd.id.name, new Map())
      if (nd.superClass) {
        let index = nd.attr.path.lastIndexOf(nd.id.name)
        nd.attr['path'] = nd.attr.path.slice(0, index) + nd.superClass.name + ' ' + nd.attr.path.slice(index)

      }
    }

    if (nd.type === 'MethodDefinition')
      if (!nd.computed) {
        if (nd.key.type === 'Identifier' || nd.key.type === 'PrivateName') {
          nd.value.id = nd.key;
        }
        else if (nd.key.type === 'Literal') {
          // this case is covered by test case: tests/unexpected/stringiterator.truth
          console.log("WARNING: invalid syntax, method name is of type Literal instead of Identifier.");
        }
        else {
          console.log("WARNING: unexpected key type of 'MethodDefinition'.");
        }
      }
      else {
        console.log("WARNING: Computed property for method definition, not yet supported.");
      }
    if (nd.type === 'FunctionDeclaration' ||
      nd.type === 'FunctionExpression' ||
      nd.type === 'ArrowFunctionExpression') {
      // // case 1: class method   
      // if (parent.type === 'MethodDefinition') {
      //   // let prev = parent
      //   // while (!prev.id) prev = prev.parent
      //   const path = nd.attr.path.trim(' ').split(' ')
      //   // static function & function  class C { fun1() static func2()}  path:C==>func1   C-->func2
      //   // if (parent.key.type !== 'PrivateName') {
      //   //   root.attr.varias.set(path[path.length - 1] + '' + parent.key.name, nd)
      //   // } else {
      //   //   // private function  class C {  #func3()}  path: C-->func3
      //   //   root.attr.varias.set(path[path.length - 1] + ' ' + parent.key.id.name, nd)
      //   // }
      // }
      // // case 2: normal function write by VariableDeclarator
      // if (parent.type === 'VariableDeclarator') {
      //   const path = nd.attr.path.trim(' ').split(' ')
      //   // root.attr.varias.set(path + parent.id.name, nd)
      // }
      // // case 3: assgin a function expression to a variable: let fun = function(){}

      // if (nd.type === 'FunctionExpression' && parent.type === 'AssignmentExpression') {
      //   const path = nd.attr.path.trim(' ').split(' ')
      //   // root.attr.varias.set(path + parent.left.name, nd)
      // }

      // // case 4: function expression assigned to object property obj:{fun:function(){}}  path:obj-->fun
      // if (nd.type === 'FunctionExpression' && parent.type === 'Property') {
      //   // let prev = parent
      //   // while (!(prev && prev.key)) prev = prev.parent
      //   const path = nd.attr.path.trim(' ').split(' ')
      //   // root.attr.varias.set(path[path.length - 1] + ' ' + parent.key.name, nd)
      // }


      // case 5: function expression in arguments
      // case 6: function declaration
      // todo : 同个文件下的函数重载问题
      root.attr.functions.push(nd);
      nd.attr.parent = parent;
      // nd.attr.originCode = print(nd)
      nd.attr.childProp = childProp;
      var old_enclosingFunction = enclosingFunction;
      enclosingFunction = nd;
      doVisit(nd.id, nd, 'id');
      doVisit(nd.params, nd, 'params');
      doVisit(nd.body, nd, 'body');
      enclosingFunction = old_enclosingFunction;
      return false;
    }





  });
}
/**
 * 
 * @param {node} node node.callee
 * @param {path} path 
 * @param { root} root  top node
 * @returns 
 */

function handleRecusiveFindPath(node, path = '', root) {

  if (node.object) {
    return handleRecusiveFindPath(node.object) + ' ' + node.property.name || ''
  } else {
    return node.name
  }

  // return path
  // if (node.object.type === 'MemberExpression') {

  //   handleRecusiveFindPath(node.object)
  // } else if (node.object.type === 'CallExpression') {

  // }
  // path = node.object.name + node.property.name + path
  // return path
}

function collectPathData(ast) {

  ast.attr.pathNode = new Map()
  let pathNode = ast.attr.pathNode
  ast.attr.functions.forEach(item => {
    console.log(item);
    const nodeInfo = {
      type: isFunction(item) ? 'function' : 'variable',
      info: item,
      name: item.id.name
    }
    if (pathNode.has(item.attr.enclosingFile)) {
      pathNode.get(item.attr.enclosingFile).set(nodeInfo.name,nodeInfo)
    } else {
      let nodeMap = new Map()
      nodeMap.set(nodeInfo.name,nodeInfo)
      pathNode.set(item.attr.enclosingFile, nodeMap)
      
    }

  })

  console.log(ast);
}
/* AST visitor */
function visit(root, visitor) {
  function doVisit(nd, parent, childProp) {
    if (!nd || typeof nd !== 'object')
      return;

    if (childProp === 'body' ||
      childProp === 'declarations' ||
      childProp === 'properties' ||
      childProp === 'decorators' ||
      childProp === 'elements' ||
      childProp === 'specifiers' ||
      childProp === 'params') {
      //  console.log( parent.attr.path);
      nd['attr'] = {}
      nd.attr['path'] = parent.attr.path
      // console.log(nd);
    }

    if (childProp === 'arguments') {
      nd['attr'] = {}
      // if(parent.callee.type==='Identifier' || parent.callee.type ==='FunctionExpression' || parent.callee.type ==='MemberExpression'){
      //   nd.attr['path'] =parent.callee.attr.path
      // }else{
      //   nd.attr['path'] = parent.callee.expression.attr.path
      // }

      if (parent.callee.type === 'ParenthesizedExpression') {
        nd.attr['path'] = parent.callee.expression.attr.path
      } else {
        nd.attr['path'] = parent.callee.attr.path
      }

    }

    if (nd.type && nd.type !== 'ProgramCollection') {
      var res = visitor(nd, doVisit, parent, childProp);
      if (res === false)
        return;
    }

    for (var p in nd) {
      if (!nd.hasOwnProperty(p) || p.match(/^(range|loc|attr|comments|raw|path|type|start|end|sourceType|interpreter)$/))
        continue;
      doVisit(nd[p], nd, p);
    }
  }

  doVisit(root);
}


/* AST visitor with state */
function visitWithState(root, visitor) {
  const state = {
    'withinDeclarator': false,
    'withinParams': false
  };

  function doVisit(nd, parent, childProp) {
    if (!nd || typeof nd !== 'object')
      return;

    if (nd.type) {
      var res = visitor(nd, doVisit, state, parent, childProp);
      if (res === false)
        return;
    }

    for (var p in nd) {
      // skip over magic properties
      if (!nd.hasOwnProperty(p) || p.match(/^(range|loc|attr|comments||type)$/))
        continue;
      doVisit(nd[p], nd, p);
    }
  }

  doVisit(root);
}

/* Simple version of UNIX basename. */
function basename(filename) {
  if (!filename)
    return "<???>";
  var idx = filename.lastIndexOf('/');
  if (idx === -1)
    idx = filename.lastIndexOf('\\');
  return filename.substring(idx + 1);
}

function isAnon(funcName) {
  return funcName === "anon";
}

// func must be function node in ast
function funcname(func) {
  if (func === undefined)
    console.log('WARNING: func undefined in astutil/funcname.');
  else if (func.id === null)
    return "anon";
  else if (!func.id.name) {
    return func.id.id.name
  }
  else

    return func.id.name;
}

// encFunc can be undefined
function encFuncName(encFunc) {
  if (encFunc === undefined) {
    return "global";
  } else if (encFunc.id === null)
    return "anon";
  // privateMethod
  else if (!encFunc.id.name)
    return encFunc.id.id.name
  return encFunc.id.name
}

/* Pretty-print position. */
function ppPos(nd) {
  return basename(nd.attr.enclosingFile) + "@" + nd.loc.start.line + ":" + nd.range[0] + "-" + nd.range[1];
}


/* Parse a single source file and return its ast
Args:
    fname - A string, the name of the source file
      src - A string, the source code
 
Return:
    If succeeded, return an ast node of type 'Program'.
    If failed, return null.
*/
function buildProgram(fname, src) {
  // trim hashbang
  src = trimHashbangPrep(src);
  if (fname.endsWith('ts')) {
    try {
      src = ts2js(fname, src);
    } catch (error) {
      errorLog(error, `failed to transform ${fname} into javascript`)
      return null
    }
  }

  // parse javascript
  let prog;
  try {
    prog = parse(src, fname);
  }
  catch (error) {
    errorLog(error, `fialed to parse ${fname} into AST`);
    return null;
  }
  prog.attr = { filename: fname };
  return prog;
}

/* Build an AST from file name and source code
Args:
    fname - A string, the name of the source file
      src - A string, the source code
 
Return:
    If succeeded, return an ast node of type 'ProgramCollection'.
    If failed, return null.
*/
function astFromSrc(fname, src) {
  const prog = buildProgram(fname, src);
  if (prog === null)
    return null;
  const ast = {
    'type': 'ProgramCollection',
    'programs': [prog],
    'attr': {},
    'code': src
  }
  init(ast);
  return ast;
}


function preProcess(ast, fname) {


  // // 对于匿名函数其处理方案为：<filename,anonymousFun_id,loc>
  // if (nd.type === 'FunctionExpression'  && !nd.id && (parent.type === 'ParenthesizedExpression' || parent.type === 'CallExpression')) {
  //   nd.id = {
  //     name: nd.attr.enclosingFile + ' anonymousFunction_' + anonymousID++ + ':<' + nd.loc.start.line + ',' + nd.loc.start.column + '>'
  //   }
  // }
  let anonymousID = 0
  traverse(ast, {
    enter(path) {
      if (path.node.type === 'MethodDefinition' && path.node.key.type == 'PrivateName') {
        path.node.key['name'] = path.node.key.id.name
      }
      if ((path.type === 'FunctionExpression' ||
        path.type === 'ArrowFunctionExpression') && !path.node.id) {
        if (path.parentKey !== 'init') { // 忽略函数赋值和对象属性的值为函数表达式的情况，因为这两类函数都是有名字的函数
          if (path.parentKey !== 'arguments') {
            path.node.id = {
              type: 'Identifier',
              name: fname + '-anonymous' + anonymousID++ + '-<' + path.node.loc.start.line + ',' + path.node.loc.start.column + '>',
              range: path.node.range,
              loc: path.node.loc,
              functionType: path.type
            };
          } else {
            path.node.id = {
              type: 'Identifier',
              name: fname + '-anonymous' + anonymousID++ + '-argumentKey' + path.key + '-<' + path.node.loc.start.line + ',' + path.node.loc.start.column + '>',
              range: path.node.range,
              loc: path.node.loc,
              functionType: path.type
            };
          }
        }
      }
    },
  });
}
/* Returns an ast node of type 'Program'
*/
function parse(src, fname) {
  const ast = parser.parse(src, {
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    errorRecovery: true,
    attachComment: false,
    createParenthesizedExpressions: true,
    sourceType: "unambiguous",
    ranges: true,
    jsx: true,
    plugins: [
      "estree",
      "flow",
      "jsx",
      "decoratorAutoAccessors",
      "doExpressions",
      "exportDefaultFrom",
      "functionBind",
      "importAssertions",
      "regexUnicodeSets",
      ["decorators", { decoratorsBeforeExport: false }]
    ]
  })
  preProcess(ast, fname)
  return ast.program;
}



// cf is used by getFunctions
const cf = funcObj => {
  return funcObj.file + ':' +
    funcObj.name + ':' +
    funcObj.range[0] + ':' +
    funcObj.range[1] + ':' +
    (funcObj.charRange[1] - funcObj.charRange[0]);
};

/* Return a list of objects storing function info in root
 
Args:
    root - An ast node of type 'ProgramCollection',
         - the output of astFromSrc function,
         - thus, root.programs.length is equal to 1
    src  - A string, the corresponding source code of `root`
 
Returns:
    A list of objects, each with the following properties
    {
        'name': a valid function name | 'anon' | 'global',
        'file': a valid file name,
        'range': a list of two integers,
        'code': code of the function | null (for global context),
        'encFuncName': a valid function name | 'anon' | 'global' | null (for global context),
        'cf': a string representing the colon format id
    }
*/
function getFunctions(root, src) {
  const funcs = [];
  const funcNodes = root.attr.functions;

  for (let i = 0; i < funcNodes.length; ++i) {
    const fn = funcNodes[i];

    // funcName
    let funcName = funcname(fn);

    // startLine && endLine
    let startLine = fn.loc.start['line'];
    let endLine = fn.loc.end['line'];

    // name, file and range are for colon format id
    // code and encFuncName are added for trackFunctions
    funcs.push({
      'name': funcName,
      'file': fn.attr.enclosingFile,
      'range': [startLine, endLine],
      'charRange': fn.range,
      'code': src.substring(fn.range[0], fn.range[1]),
      'encFuncName': encFuncName(fn.attr.enclosingFunction)
    });
  }

  // Add 'cf' property
  funcs.forEach(funcObj => {
    funcObj['cf'] = cf(funcObj);
  });

  // Create a fake function object for global context
  let prog = root.programs[0];
  funcs.push({
    'name': 'global',
    'file': prog.attr.filename,
    'range': [prog.loc.start['line'], prog.loc.end['line']],
    'charRange': null,
    'code': null,
    'encFuncName': null,
    'cf': prog.attr.filename + ':global'
  });

  return funcs;
}

/* Check if nd is an assignment to module.exports
 
Args:
    nd - an ast node
 
Returns:
    true if nd represents an assignment to module.exports, false otherwise
 
Relevant docs:
 
    interface MemberExpression {
        type: 'MemberExpression';
        computed: boolean;
        object: Expression;
        property: Expression;
    }
*/
function isModuleExports(nd) {
  if (nd.type !== 'AssignmentExpression')
    return false;

  let left = nd.left;

  if (left.type !== 'MemberExpression')
    return false;

  let object = left.object;
  let property = left.property;

  if (object.type !== 'Identifier' || property.type !== 'Identifier')
    return false;

  return object.name === 'module' && property.name === 'exports';
}

/*
Args:
       nd - an ast node
  fn_name - a function name to compare to
 
Returns: true if nd represents a call to fn_name, false otherwise
 
Relevant docs:
 
    interface CallExpression {
        type: 'CallExpression';
        callee: Expression;
        arguments: ArgumentListElement[];
    }
*/
function isCallTo(nd, fn_name) {
  if (nd.type !== 'CallExpression')
    return false;

  let callee = nd.callee;

  if (callee.type !== 'Identifier')
    return false;

  return callee.name === fn_name
}

/*
Args:
       fn - an ast node representing a FunctionDeclaration
 
Returns:
    A list containing all of the ReturnStatement nodes' values in fn's body
 
Relevant docs:
 
    interface FunctionDeclaration {
        type: 'FunctionDeclaration';
        id: Identifier | null;
        params: FunctionParameter[];
        body: BlockStatement;
        generator: boolean;
        async: boolean;
        expression: false;
    }
 
    interface BlockStatement {
        type: 'BlockStatement';
        body: StatementListItem[];
    }
 
    interface ReturnStatement {
        type: 'ReturnStatement';
        argument: Expression | null;
    }
*/
function getReturnValues(fn) {
  let lst = [];
  let fn_body = fn.body;
  /* There're two cases here:
  Case 1. fn_body is of type 'BlockStatement'
      this is the most common case, for example
      const f = () => {return 1;};
  Case 2. fn_body is not of type 'BlockStatement'
      this case is covered by test case:
          tests/import-export/define/arrow-func-no-block-statement-require.truth
      const f = () => 1;
 
      Esprima output:
      {
          "type": "Program",
          "body": [
              {
                  "type": "VariableDeclaration",
                  "declarations": [
                      {
                          "type": "VariableDeclarator",
                          "id": {
                              "type": "Identifier",
                              "name": "f"
                          },
                          "init": {
                              "type": "ArrowFunctionExpression",
                              "id": null,
                              "params": [],
                              "body": {
                                  "type": "Literal",
                                  "value": 1,
                                  "raw": "1"
                              },
                              "generator": false,
                              "expression": true,
                              "async": false
                          }
                      }
                  ],
                  "kind": "const"
              }
          ],
          "sourceType": "script"
      }
  */
  if (fn_body.type === 'BlockStatement') {
    let block = fn_body.body;
    for (var i = 0; i < block.length; i++)
      if (block[i].type === 'ReturnStatement')
        lst.push(block[i].argument);
  }
  else {
    lst.push(fn_body);
  }
  return lst;
}

/*
Args:
    nd - An ast node
 
Returns:
    A boolean, true if nd is a function declaration
    or function expression or arrow function expression,
    false otherwise.
*/
function isFunction(nd) {
  return nd.type === 'FunctionDeclaration' ||
    nd.type === 'FunctionExpression' ||
    nd.type === 'ArrowFunctionExpression'
}

module.exports.visit = visit;
module.exports.visitWithState = visitWithState;
module.exports.init = init;
module.exports.ppPos = ppPos;
module.exports.funcname = funcname;
module.exports.encFuncName = encFuncName;
module.exports.astFromFiles = astFromFiles;
module.exports.astFromSrc = astFromSrc;
module.exports.parse = parse;
module.exports.getFunctions = getFunctions;
module.exports.isAnon = isAnon;
module.exports.isModuleExports = isModuleExports;
module.exports.isCallTo = isCallTo;
module.exports.getReturnValues = getReturnValues;
module.exports.isFunction = isFunction;
module.exports.cf = cf;
