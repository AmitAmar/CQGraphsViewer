from flask import jsonify

from formatter import cq_formatter
from utils.general_utils import read_data


NODES = 'nodes'
EDGES = 'edges'
IS_HORIZONTAL = 'is_horizontal'

KEY = 'key'

BAND_KEY = 'band'
QUANTITIES_NAME_KEY = 'name'

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


def create_nodes_json(nodes, arrange_by_field):
    nodes_list = []
    bands = get_nodes_bands(nodes, arrange_by_field)
    nodes_bands = {}

    if arrange_by_field != 'time':
        nodes.sort(key=lambda curr_node : curr_node.parameters_dict[arrange_by_field.lower()].value)


    for node in nodes:
        if arrange_by_field == 'time':
            band = bands.index(node.time)
        else:
            band = bands.index(node.parameters_dict[arrange_by_field.lower()].value)

        current_node = {KEY: f"Q{node.node_id}",
                        TIME_KEY: str(node.time),
                        PARAMETERS_KEY: parse_parameters(node.parameters),
                        BAND_KEY: band,
                        CATEGORY: SIMPLE_CATEGORY}
        nodes_bands[node.node_id] = band
        nodes_list.append(current_node)


    nodes_list.sort(key=lambda curr_node : curr_node[BAND_KEY])



    nodes_list.append({KEY: "_BANDS", CATEGORY: "Bands", 'itemArray': [{'text': band} for band in bands]})

    return nodes_list, nodes_bands


def get_nodes_bands(nodes, arrange_by_field):
    bands = []
    for node in nodes:
        field = ""
        if arrange_by_field.lower() == 'time':
            field = node.time
        else:
            field = node.parameters_dict[arrange_by_field.lower()].value

        if field not in bands:
            bands.append(field)

    return bands


def create_edges_json(nodes, edges, nodes_bands):
    edges_list = []
    nodes_with_parent = set()

    for index, edge in enumerate(edges):
        current_edge = {KEY: index,
                        FROM_KEY: f"Q{edge.source}",
                        TO_KEY: f"Q{edge.target}",
                        TEXT_KEY: edge.changed_quantities,
                        CATEGORY: SIMPLE_CATEGORY}
        nodes_with_parent.add(edge.target)
        edges_list.append(current_edge)

    new_index = len(edges)
    #create dummy edges:

    # nodes_without_parent = [node_id for node_id in range(0, len(nodes)) if node_id not in nodes_with_parent]
    #
    # for node_without_parent in nodes_without_parent:
    #     if nodes_bands[node_without_parent] != 0:
    #         edges_list.append({KEY: new_index,
    #                            FROM_KEY: f"Q0",
    #                            TO_KEY: f"Q{node_without_parent}",
    #                            TEXT_KEY: '',
    #                            CATEGORY: "dummy"})
    #     else:
    #         edges_list.append({KEY: new_index,
    #                            FROM_KEY: f"",
    #                            TO_KEY: f"Q{node_without_parent}",
    #                            TEXT_KEY: '',
    #                            CATEGORY: "dummy"})
    #     new_index +=1


    return edges_list


def get_graph(user_graph):
    # TODO: create a wizard for choosing the input file
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs'
    cq_data_path = 'cq_data.txt'

    raw_cq_data = read_data(input_dir_path, cq_data_path)
    gml = cq_formatter.convert_cq_to_gml(raw_cq_data)

    # Init quantities:

    nodes = gml.nodes

    params = nodes[0].parameters

    user_graph.quantities.clear()
    for param in params:
        user_graph.add_quantity(param)

    nodes_json, nodes_bands = create_nodes_json(nodes, user_graph.arrange_by)
    edges_json = create_edges_json(nodes, gml.edges, nodes_bands)

    return jsonify({NODES: nodes_json, EDGES: edges_json, IS_HORIZONTAL: user_graph.is_horizontal, 'arrange_by' : user_graph.arrange_by})


def get_quantities(user_graph):
    quantities_result = []

    for quantity in user_graph.quantities:
        quantity = str(quantity)
        quantity = quantity[0: quantity.index('"')]
        quantities_result.append({QUANTITIES_NAME_KEY: str(quantity)})

    return jsonify(quantities_result)


def arrange_by(field, user_graph):
    parts = field.split("_")
    user_graph.is_horizontal = parts[0].lower() == 'horizontal'
    user_graph.arrange_by = parts[1]

    print("arrange by : ", user_graph.arrange_by)
    print("is_horizontal : ", user_graph.is_horizontal)

    if 'horizontal' in field:
        user_graph.is_horizontal = True
    else:
        user_graph.is_horizontal = False

    return jsonify(field)


def plot(name, user_graph):
    print("Plot : ", name)

    return jsonify(name)
