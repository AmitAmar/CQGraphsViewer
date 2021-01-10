import functools

from flask import jsonify

from formatter import cq_formatter
from utils.general_utils import read_data
from .bands_comparator import BandComparator

# get-graph
HORIZONTAL = 'horizontal'
NODES = 'nodes'
EDGES = 'edges'
IS_HORIZONTAL = 'is_horizontal'
ARRANGE_BY = 'arrange_by'

KEY = 'key'

# Nodes:
TIME_KEY = 'time'
PARAMETERS_KEY = 'parameters'
CATEGORY = 'category'
SIMPLE_CATEGORY = 'simple'
DETAILED_CATEGORY = 'detailed'


# Edge:
FROM_KEY = 'from'
TO_KEY = 'to'
TEXT_KEY = 'text'
QUANTITIES_NAME_KEY = 'name'


# Bands:
BAND_KEY = 'band'
BANDS_GOJS_KEY = "_BANDS"
# BANDS_CATEGORY = "Bands"
BANDS_CATEGORY = 'VerticalBands'
BANDS_ITEM_ARRAY = 'itemArray'
BAND_TEXT = 'text'

# Config:
CONFIG_FILE_PATH = r"rest_conf\config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"


def parse_parameters(params):
    raw_params = ""

    for param in params:
        param = str(param)
        param = param.replace('"', '')
        raw_params += param + "\n"

    return raw_params


def create_nodes_list(nodes, arrange_by_field):
    nodes_list = []
    bands = get_nodes_bands(nodes, arrange_by_field)

    for node in nodes:
        band = get_node_band_number(arrange_by_field, bands, node)

        current_node = {KEY: f"Q{node.node_id}",
                        TIME_KEY: str(node.time),
                        PARAMETERS_KEY: parse_parameters(node.parameters),
                        BAND_KEY: band+1,
                        CATEGORY: SIMPLE_CATEGORY}
        nodes_list.append(current_node)

    nodes_list.sort(key=lambda curr_node : curr_node[BAND_KEY])

    item_array = [{'visible': 'false'}]
    item_array.extend([{BAND_TEXT: band} for band in bands])

    nodes_list.insert(0, {KEY: BANDS_GOJS_KEY,
                          CATEGORY: "Bands",
                          BANDS_ITEM_ARRAY: item_array})

    return nodes_list


def get_node_band_number(arrange_by_field, bands, node):
    if arrange_by_field == 'time':
        band = bands.index(node.time)
    else:
        band = bands.index(node.parameters_dict[arrange_by_field.lower()].value)

    return band


def get_nodes_bands(nodes, arrange_by_field):
    if arrange_by_field == 'time':
        bands = []
        for node in nodes:
            field = node.time
            if field not in bands:
                bands.append(field)

        return bands

    bands_dict = {}
    for node in nodes:
        field = node.parameters_dict[arrange_by_field.lower()].value

        if field not in bands_dict:
            bands_dict[field] = node.parameters_dict[arrange_by_field.lower()].quantity_space
            print(field)

    magnitudes_orders = get_magnitudes_order(bands_dict)
    bands = list(bands_dict.keys())

    band_comparator = BandComparator(magnitudes_orders, ['dec', 'std', 'inc'])

    bands.sort(key=functools.cmp_to_key(band_comparator.compare))

    print("-----------")
    print(magnitudes_orders)
    print(bands)
    print("-----------")

    return bands


def get_magnitudes_order(bands_dict):
    longest_quantity_space = max(bands_dict.values(), key=lambda s:len(s))
    longest_quantity_space = longest_quantity_space[1:-1]  # Remove ()

    return longest_quantity_space.split()


def create_edges_list(edges, nodes_list):
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

        for node in nodes_list:
            if node[KEY] == current_edge[TO_KEY]:
                node['parent'] = current_edge[FROM_KEY]

    return edges_list


def get_graph(user_graph):
    # TODO: create a wizard for choosing the input file
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs'
    # cq_data_path = 'cq_data_2.txt'
    cq_data_path = 'cq_data.txt'

    raw_cq_data = read_data(input_dir_path, cq_data_path)
    gml = cq_formatter.convert_cq_to_gml(raw_cq_data)

    # Init quantities:

    nodes = gml.nodes
    edges = gml.edges

    user_graph.nodes = gml.nodes
    user_graph.edges = gml.edges

    params = nodes[0].parameters

    user_graph.quantities.clear()
    for param in params:
        user_graph.add_quantity(param)

    nodes_list = create_nodes_list(nodes, user_graph.arrange_by)
    edges_list = create_edges_list(edges, nodes_list)

    return jsonify({NODES: nodes_list,
                    EDGES: edges_list,
                    IS_HORIZONTAL: user_graph.is_horizontal,
                    ARRANGE_BY: user_graph.arrange_by})


def get_quantities(user_graph):
    quantities_result = []

    for quantity in user_graph.quantities:
        quantity = str(quantity)
        quantity = quantity[0: quantity.index('"')]
        quantities_result.append({QUANTITIES_NAME_KEY: str(quantity).strip()})

    return jsonify(quantities_result)


def arrange_by(field, user_graph):
    parts = field.split("_")
    user_graph.is_horizontal = parts[0].lower() == HORIZONTAL
    user_graph.arrange_by = parts[1]

    print("arrange by : ", user_graph.arrange_by)
    print("is_horizontal : ", user_graph.is_horizontal)

    if HORIZONTAL in field:
        user_graph.is_horizontal = True
    else:
        user_graph.is_horizontal = False

    return jsonify(field)


def plot(name, user_graph):
    print("Plot : ", name)

    return jsonify(name)


def get_table(user_graph):
    rows = []

    for node in user_graph.nodes:
        current_row = {'index': node.node_id}

        for param_name, param_value in node.parameters_dict.items():
            current_row[param_name] = param_value.value

        rows.append(current_row)

    return jsonify(rows)