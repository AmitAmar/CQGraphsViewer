from server.formatter.gml_model.node import Node
from server.formatter.gml_model.edge import Edge


class Graph:
    def __init__(self):
        self.__nodes = list()
        self.__edges = list()

    def add_node(self, node):
        if not isinstance(node, Node):
            raise TypeError("Expected to Node instance, actual type :" + type(node))
        self.__nodes.append(node)

    def add_edge(self, edge):
        if not isinstance(edge, Edge):
            raise TypeError("Expected to Edge instance, actual type :" + type(edge))
        self.__edges.append(edge)

    @property
    def nodes(self):
        return self.__nodes

    @property
    def edges(self):
        return self.__edges

    def __str__(self):
        result = "graph [\n"
        # Load Nodes:

        for node in self.__nodes:
            result += str(node)

        # Load Edges:

        for edge in self.__edges:
            result += str(edge)

        result += "\n]"
        return result
