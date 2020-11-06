from gml_model.node import Node
from gml_model.edge import Edge


class Graph:
    def __init__(self):
        self.nodes = list()
        self.edges = list()

    def add_node(self, node):
        if node is Node:
            self.nodes.append(node)
        raise TypeError("Expected to Node instance, actual type :" + type(node))

    def add_edge(self, edge):
        if edge is Edge:
            self.edges.append(edge)
        raise TypeError("Expected to Edge instance, actual type :" + type(edge))

    def __str__(self):
        result = ""

        return result