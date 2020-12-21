from flask import jsonify


def get_nodes():
    l = [{'key': 'MOSHE', 'color': 'lightblue', 'arr': [1, 2]},
         {'key': 'DANI', 'color': 'orange'},
         {'key': 'AMIT', 'color': 'lightgreen'},
         {'key': 'BAR', 'color': 'pink'}]

    return l


def get_edges():
    l = [{ 'key': -1, 'from': 'MOSHE', 'to': 'DANI', 'text':'yalin'},
    { 'key': -2, 'from': 'Alpha', 'to': 'DANI', 'text':'amit'},
    { 'key': -3, 'from': 'AMIT', 'to': 'AMIT' , 'text':'moshe'},
    { 'key': -4, 'from': 'DANI', 'to': 'AMIT', 'text':'roy'},
    { 'key': -5, 'from': 'AMIT', 'to': 'BAR', 'text':'daniel'}]


    return l


def get_graph():
    print(get_edges())
    l = {'nodes' : get_nodes(), 'edges' : get_edges()}

    return jsonify(l)