class Edge:
    """
        Represent a edge in GML format
    """
    def __init__(self, source, target, changed_quantities):
        self.__source = source
        self.__target = target
        self.__changed_quantities = changed_quantities

    @property
    def source(self):
        return self.__source

    @property
    def target(self):
        return self.__target

    @property
    def changed_quantities(self):
        return self.__changed_quantities

    def __str__(self):
        result = "\n\tedge [\n"

        result += f"\t\t source {self.__source}\n"
        result += f"\t\t target {self.__target}\n"
        result += f"\t\t changed_quantities \"{self.__changed_quantities}\""

        result += "\n\t]"
        return result
