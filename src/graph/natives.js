
var flowgraph = require('./flowgraph')
nativeFlows = require('./harness').nativeFlows;

function addNativeFlowEdges(flow_graph) {
    for (var native in nativeFlows) {
        if (!nativeFlows.hasOwnProperty(native))
            continue;
        var target = nativeFlows[native];
        flow_graph.addEdge(
            flowgraph.nativeVertex(native),
            flowgraph.propVertex({
                type: 'Identifier',
                name: target
            })
        );
    }
    return flow_graph;
}

module.exports.addNativeFlowEdges = addNativeFlowEdges;

