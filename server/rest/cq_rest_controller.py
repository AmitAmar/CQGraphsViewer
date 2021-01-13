import functools

from flask import jsonify

from formatter import cq_formatter
from utils.general_utils import read_data
from .bands_comparator import BandComparator

# get-graph
NODES = 'nodes'
EDGES = 'edges'
ARRANGE_BY_HORIZONTAL = 'arrange_by_horizontal'
ARRANGE_BY_VERTICAL = 'arrange_by_vertical'
COLOR_SPECIFIC_FIELD_NAME = 'color_specific_field_name'
COLOR_SPECIFIC_FIELD_VALUE = 'color_specific_field_value'

KEY = 'key'

# Nodes:
TIME_KEY = 'time'
PARAMETERS_KEY = 'parameters'
CATEGORY = 'category'

#Nodes Categories
SIMPLE_CATEGORY = 'simple'
SIMPLE_LIGHTED_CATEGORY = 'simpleLighted'
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


def create_nodes_list(nodes, user_graph):
    nodes_list = []
    arrange_by_horizontal = user_graph.arrange_by_horizontal
    arrange_by_vertical = user_graph.arrange_by_vertical

    rows = get_nodes_bands(nodes, arrange_by_horizontal)
    columns = get_nodes_bands(nodes, arrange_by_vertical)

    for node in nodes:
        row = get_node_location(arrange_by_horizontal, rows, node)
        col = get_node_location(arrange_by_vertical, columns, node)

        current_node = {KEY: f"Q{node.node_id}",
                        TIME_KEY: str(node.time),
                        PARAMETERS_KEY: parse_parameters(node.parameters),
                        'row': row + 1,
                        'col': col + 1}

        if user_graph.color_specific_field_name == 'time':
            if node.time == user_graph.color_specific_field_value:
                current_node[CATEGORY] = SIMPLE_LIGHTED_CATEGORY
            else:
                current_node[CATEGORY] = SIMPLE_CATEGORY

        else:
            if node.parameters_dict[user_graph.color_specific_field_name]['value'] == user_graph.color_specific_field_value:
                current_node[CATEGORY] = SIMPLE_LIGHTED_CATEGORY
            else:
                current_node[CATEGORY] = SIMPLE_CATEGORY

        nodes_list.append(current_node)

    for index, row in enumerate(rows):
        nodes_list.append({'text': row, 'row': index + 1, CATEGORY: "RowHeader"})

    for index, col in enumerate(columns):
        nodes_list.append({'text': col, 'col': index + 1, CATEGORY: "ColumnHeader"})

    return nodes_list


def get_node_location(arrange_by_field, bands, node):
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
    raw_quantities_ranges = bands_dict.values()
    quantities_ranges = []
    final_result = []

    for q_range in raw_quantities_ranges:
        q_range = q_range[1:-1]
        current_range = q_range.split()
        quantities_ranges.append(current_range)

    final_result = list(quantities_ranges[0])

    for current_range in quantities_ranges:
        for index, current_mag in enumerate(current_range):
            if current_mag not in final_result:
                final_result.insert(index, current_mag)

    return final_result


def create_edges_list(edges):
    edges_list = []
    nodes_with_parent = set()

    for index, edge in enumerate(edges):
        current_edge = {KEY: index,
                        FROM_KEY: f"Q{edge.source}",
                        TO_KEY: f"Q{edge.target}",
                        TEXT_KEY: edge.changed_quantities,
                        CATEGORY: SIMPLE_CATEGORY,
                        'curviness': 4}
        nodes_with_parent.add(edge.target)
        edges_list.append(current_edge)

    return edges_list


def get_graph(user_graph):
    # TODO: create a wizard for choosing the input file
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs'
    cq_data_path = 'cq_data_2.txt'
    # cq_data_path = 'cq_data.txt'

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

    nodes_list = create_nodes_list(nodes, user_graph)
    edges_list = create_edges_list(edges)

    return jsonify({NODES: nodes_list,
                    EDGES: edges_list,
                    ARRANGE_BY_HORIZONTAL: user_graph.arrange_by_horizontal,
                    ARRANGE_BY_VERTICAL: user_graph.arrange_by_vertical,
                    COLOR_SPECIFIC_FIELD_NAME: user_graph.color_specific_field_name,
                    COLOR_SPECIFIC_FIELD_VALUE: user_graph.color_specific_field_value})


def get_quantities(user_graph):
    quantities_result = []

    for quantity in user_graph.quantities:
        quantity = str(quantity)
        quantity = quantity[0: quantity.index('"')]
        quantities_result.append({QUANTITIES_NAME_KEY: str(quantity).strip().upper()})

    return jsonify(quantities_result)


def arrange_by(layout, field, user_graph):
    if layout == 'horizontal':
        user_graph.arrange_by_horizontal = field
    elif layout == 'vertical':
        user_graph.arrange_by_vertical = field
    return jsonify(field)

def plot(name, user_graph):
    print("Plot : ", name)

    return jsonify(name)


def get_table(user_graph):
    rows = []

    for node in user_graph.nodes:
        current_row = {'index': node.node_id, 'time': node.time}

        for param_name, param_value in node.parameters_dict.items():
            current_row[param_name.upper()] = param_value.value

        rows.append(current_row)

    return jsonify(rows)