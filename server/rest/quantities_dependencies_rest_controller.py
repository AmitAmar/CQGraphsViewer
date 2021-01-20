from flask import jsonify

NODES = 'nodes'
EDGES = 'edges'

KEY = 'key'
COLOR = 'color'

FROM = 'from'
TO = 'to'


def get_graph():
    nodes_list = [{KEY: "Alpha", COLOR: "lightblue"},
                  {KEY: "Beta", COLOR: "orange"},
                  {KEY: "Gamma", COLOR: "lightgreen"},
                  {KEY: "Delta", COLOR: "pink"}]

    edges_list = [{FROM: "Alpha", TO: "Beta"},
                  {FROM: "Beta", TO: "Gamma"},
                  {FROM: "Delta", TO: "Beta"},
                  {FROM: "Alpha", TO: "Delta"}]

    return jsonify({NODES: nodes_list, EDGES: edges_list})
