from flask import jsonify

from formatter import cq_formatter
from utils.general_utils import read_data

CONFIG_FILE_PATH = r"rest_conf\config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"


def parse_parameters(params):
    raw_params = ""

    for param in params:
        param = str(param)
        param = param.replace('"','')
        raw_params += param + "\n"

    return raw_params


def create_nodes_json(nodes):
    nodes_list = []

    for node in nodes:
        current_node = {'key': "State " + str(node.node_id), 'time': str(node.time), 'parameters' : parse_parameters(node.parameters)}
        nodes_list.append(current_node)

    return nodes_list


def create_edges_json(edges):
    edges_list = []

    for index, edge in enumerate(edges):
        current_edge = {'key': index, 'from': "State " + str(edge.source), 'to': "State " + str(edge.target),
                        'text': edge.changed_quantities}
        edges_list.append(current_edge)

    return edges_list


def get_graph():
    # TODO: create a wizard for choosing the input file
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs'
    cq_data_path = 'cq_data.txt'

    raw_cq_data = read_data(input_dir_path, cq_data_path)
    gml = cq_formatter.convert_cq_to_gml(raw_cq_data)

    nodes_json = create_nodes_json(gml.nodes)
    edges_json = create_edges_json(gml.edges)

    l = {'nodes': nodes_json, 'edges': edges_json}

    return jsonify(l)
