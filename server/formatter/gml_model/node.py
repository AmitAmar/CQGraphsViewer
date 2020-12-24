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

    @property
    def parameters(self):
        return self.__parameters

    def __str__(self):
        result = "\n\tnode [\n"

        result += f"\t\t id {self.__node_id}\n"
        result += f"\t\t time \"{self.__time}\"\n"

        for param in self.__parameters:
            result += f"\t\t {param}\n"

        result += "\n\t]"
        return result
