import re
from utils.general_utils import is_not_empty
from gml_model.node import Node
from gml_model.graph import Graph
from cq.parser.cq_parser import *


def convert_cq_to_gml(raw_cq_output):
    graph = Graph()
    cq_states = parse_cq_states(raw_cq_output)

    for state in cq_states:
        graph.add_node(Node(state.state_id, state.time, state.parameters))

    print(graph)

    return ""
