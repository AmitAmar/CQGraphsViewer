from flask import jsonify

from formatter import cq_formatter
from utils.general_utils import read_data

NODES = 'nodes'
EDGES = 'edges'

QUANTITIES_NAME_KEY = 'name'

KEY = 'key'
FROM_KEY = 'from'
TO_KEY = 'to'
TEXT_KEY = 'text'

PARAMETERS_KEY = 'parameters'
TIME_KEY = 'time'

CATEGORY = 'category'
SIMPLE_CATEGORY = 'simple'

CONFIG_FILE_PATH = r"rest_conf\config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"


def parse_parameters(params):
    raw_params = ""

    for param in params:
        param = str(param)
        param = param.replace('"', '')
        raw_params += param + "\n"

    return raw_params


def create_nodes_json(nodes):
    nodes_list = []

    for node in nodes:
        current_node = {KEY: f"Q{node.node_id}",
                        TIME_KEY: str(node.time),
                        PARAMETERS_KEY: parse_parameters(node.parameters),
                        CATEGORY: SIMPLE_CATEGORY}

        nodes_list.append(current_node)

    times = get_node_times(nodes)

    nodes_list.append({KEY: "_BANDS", CATEGORY: "Bands", 'itemArray': [{'text': time} for time in times]})

    return nodes_list


def get_node_times(nodes):
    times = []
    for node in nodes:
        if node.time not in times:
            times.append(node.time)
    return times


def create_edges_json(edges):
    edges_list = []

    for index, edge in enumerate(edges):
        current_edge = {KEY: index,
                        FROM_KEY: f"Q{edge.source}",
                        TO_KEY: f"Q{edge.target}",
                        TEXT_KEY: edge.changed_quantities,
                        CATEGORY: SIMPLE_CATEGORY}
        edges_list.append(current_edge)

    return edges_list


def get_graph(user_graph):
    # TODO: create a wizard for choosing the input file
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs'
    cq_data_path = 'cq_data_2.txt'

    raw_cq_data = read_data(input_dir_path, cq_data_path)
    gml = cq_formatter.convert_cq_to_gml(raw_cq_data)

    # Init quantities:

    params = gml.nodes[0].parameters

    user_graph.quantities.clear()
    for param in params:
        user_graph.add_quantity(param)

    nodes_json = create_nodes_json(gml.nodes)
    edges_json = create_edges_json(gml.edges)

    return jsonify({NODES: nodes_json, EDGES: edges_json})


def get_quantities(user_graph):
    quantities_result = []

    for quantity in user_graph.quantities:
        quantity = str(quantity)
        quantity = quantity[0: quantity.index('"')]
        quantities_result.append({QUANTITIES_NAME_KEY: str(quantity)})

    return jsonify(quantities_result)


def arrange_by(field, user_graph):
    user_graph.arrange_by = field
    print("arrange by : ", field)

    return jsonify(field)


def plot(name, user_graph):
    print("Plot : ", name)

    return jsonify(name)
