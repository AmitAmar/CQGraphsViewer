import os
from flask import jsonify
from constraints_formatter.cons_formatter import parse_file


NODES = 'nodes'
EDGES = 'edges'

KEY = 'key'
COLOR = 'color'

RELATION_COLOR = 'lightblue'
QUANTITY_COLOR = 'lightgreen'

FROM = 'from'
TO = 'to'
TEXT = 'text'
CURVINESS = 'curviness'


def get_graph():
    nodes, edges = get_nodes_and_edges()
    return jsonify({NODES: nodes, EDGES: edges})


def get_nodes_and_edges():
    # TODO: create a wizard for choosing the input file
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs'
    constraints_data_path = 'constraints_1.txt'
    # constraints_data_path = 'constraints_2.txt'

    consts = parse_file(os.path.join(input_dir_path, constraints_data_path))

    return create_nodes_list(consts), create_edges_list(consts)


def create_nodes_list(consts):
    nodes = set()
    for const in consts:
        if not const.is_one_to_one():
            nodes.add(const.relation)
    nodes_list = [{KEY: node_name, COLOR: RELATION_COLOR} for node_name in nodes]

    nodes = set()
    for const in consts:
        for quantity in const.quantities:
            nodes.add(quantity)

    nodes_list.extend([{KEY: node_name, COLOR: QUANTITY_COLOR} for node_name in nodes])

    return nodes_list


def create_edges_list(consts):
    edges_list = []

    for const in consts:
        if const.is_one_to_one():
            edges_list.append({FROM: const.quantities[0],
                               TO: const.quantities[1],
                               TEXT: const.relation,
                               CURVINESS: 4})
        # One to Many
        else:
            for quantities in const.quantities[: -1]:
                edges_list.append({FROM: quantities, TO: const.relation})

            edges_list.append({FROM: const.relation, TO: const.quantities[-1]})

    return edges_list
