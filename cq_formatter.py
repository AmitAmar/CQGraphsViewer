from cq.parser.cq_parser import *
from gml_model.graph import Graph
from gml_model.node import Node
from gml_model.edge import Edge


def convert_cq_to_gml(raw_cq_output):
    graph = Graph()
    cq_states = parse_cq_states(raw_cq_output)

    for state in cq_states:
        handle_state(graph, state)

    return str(graph)


def handle_state(graph, state):
    state_id = state.state_id
    # Create Node:
    graph.add_node(Node(state.state_id, state.time, state.parameters))

    # Create Edges:
    for successor in state.successor_states:
        graph.add_edge(Edge(state_id, successor))

