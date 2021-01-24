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
    # TODO: TAKE FROM INPUT PATH!!!!
    input_dir_path = r'C:\Users\AXA1124\PycharmProjects\CQFormatter\inputs\constraints'
    # constraints_data_path = 'constraints_1.txt'
    constraints_data_path = 'constraints_2.txt'

    consts = parse_file(os.path.join(input_dir_path, constraints_data_path))

    return create_nodes_and_edges(consts)


def create_nodes_and_edges(consts):
    nodes_list = []
    edges_list = []

    for index, const in enumerate(consts):
        # Adding nodes:
        for quantity in const.quantities:
            nodes_list.append({KEY: quantity,
                               COLOR: QUANTITY_COLOR,
                               TEXT: quantity})

        if not const.is_one_to_one():
            nodes_list.append({KEY: const.relation + "_" + str(index),
                               COLOR: RELATION_COLOR,
                               TEXT: const.relation})

        # Adding edges:
        if const.is_one_to_one():
            edges_list.append({FROM: const.quantities[0],
                               TO: const.quantities[1],
                               TEXT: const.relation,
                               CURVINESS: 4})
        else:
            for quantity in const.quantities[: -1]:
                edges_list.append({FROM: quantity,
                                   TO: const.relation + "_" + str(index),
                                   CURVINESS: 4})

            edges_list.append({FROM: const.relation + "_" + str(index),
                               TO: const.quantities[-1],
                               CURVINESS: 4})

    return nodes_list, edges_list
