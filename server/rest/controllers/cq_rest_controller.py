import functools

from flask import jsonify

from cq_formatter import cq_formatter_manager
from utils.general_utils import read_data
from rest.bands_comparator import BandComparator
from rest.rest_util import parse_parameters, get_cq_file_path, generate_colors

DIRECTION_ORDER = ['dec', 'std', 'inc']

KEY = 'key'
TEXT = 'text'
CATEGORY = 'category'

# get-graph
NODES = 'nodes'
EDGES = 'edges'
ARRANGE_BY_HORIZONTAL = 'arrange_by_horizontal'
ARRANGE_BY_VERTICAL = 'arrange_by_vertical'
COLOR_SPECIFIC_FIELD_NAME = 'color_specific_field_name'

# Nodes:
TIME_KEY = 'Time'
PARAMETERS_KEY = 'parameters'

# Colors:
DEFAULT_NODE_COLOR = "lightblue"
COLOR = "color"

COL = 'col'
ROW = 'row'

# Nodes Categories
SIMPLE_CATEGORY = 'simple'
DETAILED_CATEGORY = 'detailed'

# Edge:
FROM_KEY = 'from'
TO_KEY = 'to'
TEXT_KEY = 'text'
QUANTITIES_NAME_KEY = 'name'
CURVINESS = 'curviness'


# CellTableLayout Categories:
ROW_HEADER_CATEGORY = "RowHeader"
COLUMN_HEADER_CATEGORY = "ColumnHeader"

# Config:
CONFIG_FILE_PATH = r"rest_conf\config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"

# Layouts:
VERTICAL = 'vertical'
HORIZONTAL = 'horizontal'

# Table:
TABLE_INDEX_FIELD = 'index'


def create_nodes_list(user_graph):
    nodes = user_graph.nodes
    nodes_list = []
    arrange_by_horizontal = user_graph.arrange_by_horizontal
    arrange_by_vertical = user_graph.arrange_by_vertical

    rows = user_graph.quantities_options[arrange_by_horizontal]
    columns = user_graph.quantities_options[arrange_by_vertical]

    for node in nodes:
        row = get_node_location(arrange_by_horizontal, rows, node)
        col = get_node_location(arrange_by_vertical, columns, node)

        current_node = {KEY: f"Q{node.node_id}",
                        TIME_KEY: str(node.time),
                        PARAMETERS_KEY: parse_parameters(node.parameters),
                        ROW: row,
                        COL: col,
                        CATEGORY: SIMPLE_CATEGORY}

        if user_graph.color_specific_field_name is not None:
            specific_field_values = user_graph.quantities_options[user_graph.color_specific_field_name]

            colors = generate_colors(len(specific_field_values))
            init_node_color(current_node, node, specific_field_values, user_graph, colors)
        else:
            current_node[COLOR] = DEFAULT_NODE_COLOR

        nodes_list.append(current_node)

    for index, row in enumerate(rows):
        nodes_list.append({TEXT: row, ROW: index + 1, CATEGORY: ROW_HEADER_CATEGORY})

    for index, col in enumerate(columns):
        nodes_list.append({TEXT: col, COL: index + 1, CATEGORY: COLUMN_HEADER_CATEGORY})

    return nodes_list


def init_node_color(current_node, node, specific_field_values, user_graph, colors):
    if user_graph.color_specific_field_name == TIME_KEY:
        current_node[COLOR] = colors[specific_field_values.index(node.time)]
    else:
        current_node_value = node.parameters_dict[user_graph.color_specific_field_name.lower()].value
        current_node[COLOR] = colors[specific_field_values.index(current_node_value)]


def get_node_location(arrange_by_field, bands, node):
    if arrange_by_field == TIME_KEY:
        band = bands.index(node.time) + 1
    else:
        band = bands.index(node.parameters_dict[arrange_by_field.lower()].value) + 1

    return band


def get_nodes_bands(nodes, arrange_by_field):
    if arrange_by_field == TIME_KEY:
        return get_time_bands(nodes)

    bands_dict = {}
    for node in nodes:
        field = node.parameters_dict[arrange_by_field.lower()].value

        if field not in bands_dict:
            bands_dict[field] = node.parameters_dict[arrange_by_field.lower()].quantity_space

    magnitudes_orders = get_magnitudes_order(bands_dict)
    bands = list(bands_dict.keys())
    band_comparator = BandComparator(magnitudes_orders, DIRECTION_ORDER)
    bands.sort(key=functools.cmp_to_key(band_comparator.compare))

    return bands


def get_time_bands(nodes):
    bands = []

    for node in nodes:
        field = node.time
        if field not in bands:
            bands.append(field)

    return bands


def get_magnitudes_order(bands_dict):
    raw_quantities_ranges = bands_dict.values()
    quantities_ranges = []

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
                        CURVINESS: 4}
        nodes_with_parent.add(edge.target)
        edges_list.append(current_edge)

    return edges_list


def get_graph(user_graph):
    return jsonify({NODES: create_nodes_list(user_graph),
                    EDGES: create_edges_list(user_graph.edges),
                    ARRANGE_BY_HORIZONTAL: user_graph.arrange_by_horizontal,
                    ARRANGE_BY_VERTICAL: user_graph.arrange_by_vertical,
                    COLOR_SPECIFIC_FIELD_NAME: user_graph.color_specific_field_name})


def init_user_graph(user_graph):
    gml = get_gml_graph()

    user_graph.nodes = gml.nodes
    user_graph.edges = gml.edges

    # Init quantities:
    params = user_graph.nodes[0].parameters
    user_graph.quantities.clear()

    for param in params:
        quantity = str(param)
        quantity = quantity[0: quantity.index('"')]
        quantity = str(quantity).strip().capitalize()
        user_graph.add_quantity(quantity)

    # Init Quantities options:
    time_options = get_nodes_bands(user_graph.nodes, TIME_KEY)
    user_graph.quantities_options[TIME_KEY] = time_options

    for quantity in user_graph.quantities:
        quantity_options = get_nodes_bands(user_graph.nodes, quantity)
        user_graph.quantities_options[quantity] = quantity_options


def get_gml_graph():
    raw_cq_data = read_data(get_cq_file_path())
    gml = cq_formatter_manager.convert_cq_to_gml(raw_cq_data)
    return gml


def get_quantities(user_graph):
    quantities_result = []

    for quantity in user_graph.quantities:
        quantities_result.append({QUANTITIES_NAME_KEY: quantity})

    return jsonify(quantities_result)


def arrange_by(layout, field, user_graph):
    if layout == HORIZONTAL:
        user_graph.arrange_by_horizontal = field
    elif layout == VERTICAL:
        user_graph.arrange_by_vertical = field
    return jsonify(field)


def get_table(user_graph):
    rows = []

    for node in user_graph.nodes:
        current_row = {TABLE_INDEX_FIELD: node.node_id, TIME_KEY: node.time}

        for param_name, param_value in node.parameters_dict.items():
            current_row[param_name.capitalize()] = param_value.value

        rows.append(current_row)

    return jsonify(rows)


def get_quantities_options(user_graph):
    return jsonify(user_graph.quantities_options)


def set_specific_magnitude(field, user_graph):
    user_graph.color_specific_field_name = field
    return jsonify(field)
