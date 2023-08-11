
var graph = require('./graph'),
    natives = require('./natives'),
    flowgraph = require('./flowgraph'),
    callgraph = require('./callgraph');
//给控制流图（Flow Graph）中添加一次性调用（one-shot call）的边
function addOneShotEdges(ast, fg) {
    ast.attr.functions.forEach(function (fn) {
        var parent = fn.attr.parent,
            childProp = fn.attr.childProp;
        // 表示函数是一次性闭包
        // console.log(fn);
        if (childProp === 'callee' && parent &&
            (parent.type === 'CallExpression' || parent.type === 'NewExpression')) {
            parent.attr.oneshot = true;
            //遍历父节点 parent 的参数，并与函数 fn 的形参进行对应关系
            for (var i = 0, nargs = parent.arguments.length; i < nargs; ++i) {
                if (i >= fn.params.length) //对于每个参数位置，如果该位置超过了函数 fn 的形参数量，则跳出循环
                    break;
                // 在控制流图中添加从参数顶点（flowgraph.argVertex(parent, i + 1)）到形参顶点（flowgraph.parmVertex(fn, i + 1)）的边   
                fg.addEdge(flowgraph.argVertex(parent, i + 1), flowgraph.parmVertex(fn, i + 1));
            }
            // 在控制流图中添加从函数返回顶点（flowgraph.retVertex(fn)）到调用结果顶点（flowgraph.resVertex(parent)）的边
            fg.addEdge(flowgraph.retVertex(fn), flowgraph.resVertex(parent));
        } else {
            // console.log(fn);
            // not a one-shot closure
            // 在流图 fg 中添加从未知顶点（flowgraph.unknownVertex()）到每个形参顶点（flowgraph.parmVertex(fn, i)）的边
            for (var i = 0, nparms = fn.params.length; i <= nparms; ++i) {
                // if (i == 0) {
                    // console.log(fn);
                    if(i==0){
                        fg.addEdge(flowgraph.unknownVertex(), flowgraph.parmVertex(fn, i))
                    }else{
                        fg.addEdge(flowgraph.vertexFor(fn.id), flowgraph.parmVertex(fn, i))
                    }
                    
                // } else 
                    // fg.addEdge(flowgraph.funcVertex(fn), flowgraph.parmVertex(fn, i))
                
            }

            // 在流图 fg 中添加从函数返回顶点（flowgraph.retVertex(fn)）到未知顶点（flowgraph.unknownVertex()）的边
            fg.addEdge(flowgraph.retVertex(fn), flowgraph.unknownVertex());
        }
    });

    // set up flow for all other calls
    ast.attr.calls.forEach(function (call) {
        if (!call.attr.oneshot)
            // 在流图 fg 中添加从每个参数顶点（flowgraph.argVertex(call, i)）到未知顶点（flowgraph.unknownVertex()）的边
            for (var i = 0; i <= call.arguments.length; ++i) {
                    if(call.arguments[i] &&( call.arguments[i].type === 'FunctionExpression'|| call.arguments[i].type === 'ArrowFunctionExpression')){
                        // console.log(call);
                        fg.addEdge(flowgraph.argVertex(call, i),flowgraph.vertexFor(call.callee))
                    }
                    fg.addEdge(flowgraph.argVertex(call, i), flowgraph.unknownVertex());
                // fg.addEdge(flowgraph.argVertex(call,i+1), flowgraph.vertexFor(call.callee));
            }

        // 在流图 fg 中添加从未知顶点（flowgraph.unknownVertex()）到调用结果顶点（flowgraph.resVertex(call)）的边
        fg.addEdge(flowgraph.unknownVertex(), flowgraph.resVertex(call));
    });
}


function buildCallGraph(ast) {
    var fg = new graph.FlowGraph();
    natives.addNativeFlowEdges(fg);
    addOneShotEdges(ast, fg);
    flowgraph.addIntraproceduralFlowGraphEdges(ast, fg);
    return callgraph.extractCG(ast, fg);
}

exports.buildCallGraph = buildCallGraph;
