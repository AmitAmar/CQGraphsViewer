class Edge:
    """
        Represent a edge in GML format
    """
    def __init__(self, source, target):
        self.__source = source
        self.__target = target

    @property
    def source(self):
        return self.__source

    @property
    def target(self):
        return self.__target

    def __str__(self):
        result = "\n\tedge [\n"

        result += "\n]"
        return result


