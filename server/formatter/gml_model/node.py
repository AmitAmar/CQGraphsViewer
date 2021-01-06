class Node:
    """
        Represent a node in GML format
    """

    def __init__(self, node_id, time, parameters):
        """
            node_id: int
            time: string
            parameters: list - need to convert into dict
        """
        self.__node_id = node_id
        self.__time = time
        self.__parameters = dict()

        for param in parameters:
            self.__parameters[param.name] = param

    @property
    def node_id(self):
        return self.__node_id

    @property
    def time(self):
        return self.__time

    @property
    def parameters(self):
        return self.__parameters.values()

    @property
    def parameters_dict(self):
        return self.__parameters

    def __str__(self):
        result = "\n\tnode [\n"

        result += f"\t\t id {self.__node_id}\n"
        result += f"\t\t time \"{self.__time}\"\n"

        for param in self.__parameters.values():
            result += f"\t\t {param}\n"

        result += "\n\t]"
        return result
