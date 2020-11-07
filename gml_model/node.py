class Node:
    """
        Represent a node in GML format
    """

    def __init__(self, node_id, time, parameters):
        self.__node_id = node_id
        self.__time = time
        self.__parameters = parameters

    @property
    def node_id(self):
        return self.__node_id

    @property
    def time(self):
        return self.__time

    def __str__(self):
        result = ""

        return result
