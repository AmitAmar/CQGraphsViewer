from .gml_model.edge import Edge
from .gml_model.graph import Graph
from .gml_model.node import Node
from .cq.parser.cq_parser import *


def convert_cq_to_gml(raw_cq_output):
    graph = Graph()
    cq_states = parse_cq_states(raw_cq_output)
    states = {state.state_id: state for state in cq_states}

    for state in cq_states:
        handle_state(graph, state, states)

    return graph


def handle_state(graph, state, states):
    state_id = state.state_id
    # Create Node:
    graph.add_node(Node(state.state_id, state.time, state.parameters))

    # Create Edges:
    for successor in state.successor_states:
        changed_quantities = find_changed_quantities(source=state, target=states[successor])
        graph.add_edge(Edge(state_id, successor, changed_quantities))


def find_changed_quantities(source, target):
    changed_quantities = ""

    for source_param, target_param in zip(source.parameters, target.parameters):
        if source_param != target_param:
            changed_quantities += source_param.name + ","

    return changed_quantities[:-1]
