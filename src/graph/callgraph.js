
var graph = require('./graph'),
    dftc = require('./dftc.js'),
    flowgraph = require('./flowgraph');

// extract a call graph from a flow graph by collecting all function vertices that are inversely reachable from a callee vertex
function extractCG(ast, flow_graph) {
    var edges = new graph.Graph(), nativeVisitTag = true
    escaping = [], unknown = [];

    var reach = dftc.reachability(flow_graph);

    /* fn is a flow graph node of type 'FuncVertex' */
    function processFuncVertex(fn) {
        var r = reach.getReachable(fn);
        r.forEach(function (nd) {
            if (nd.type === 'UnknownVertex')
                escaping[escaping.length] = fn;
            else if (nd.type === 'CalleeVertex') {
                if (nd.call.callee.type === 'MemberExpression') {
                    // console.log(ast);
                    // console.log(nd);
                    // if(nd.callee.type==='Identifer'){
                    checkPath(ast.attr.modeMap, nd.call.callee.object.name, fn.func.attr.enclosingFile, fn.func.id.name)
                    // }
                    debugger
                }

                edges.addEdge(nd, fn);
            }

        });
    }

    function checkPath(nodeMap, path, enclosingFile, funcName) {
        let map = nodeMap.get(enclosingFile)

        while (map.has(path)) {
            map = map.get(path)
        }

        //    if(map.has())

    }

    /*
    ast.attr.functions.forEach(function (fn) {
        processFuncVertex(flowgraph.funcVertex(fn));
    });
    */

    flow_graph.iterNodes(function (nd) {
        if (nd.type === 'FuncVertex') {
            // 处理调用链的访问，如果该函数有在调用链的路径上被声明，
            // 则从调用链上直接取值，并且跳过对原生的函数节点处理
            processFuncVertex(nd);
        }
    });

    console.log(flow_graph);
    if (nativeVisitTag) {
        flowgraph.getNativeVertices().forEach(processFuncVertex);
    }


    var unknown_r = reach.getReachable(flowgraph.unknownVertex());
    unknown_r.forEach(function (nd) {
        if (nd.type === 'CalleeVertex')
            unknown[unknown.length] = nd;
    });

    return {
        edges: edges,
        escaping: escaping,
        unknown: unknown,
        fg: flow_graph
    };
}

exports.extractCG = extractCG;

