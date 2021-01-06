from formatter.gml_model.graph import Graph


class ExtendedGraph(Graph):
    def __init__(self):
        super().__init__()
        self.__quantities = []
        self.__is_horizontal = True
        self.__arrange_by = "time"

    @property
    def quantities(self):
        return self.__quantities

    @property
    def is_horizontal(self):
        return self.__is_horizontal

    @property
    def arrange_by(self):
        return self.__arrange_by

    @is_horizontal.setter
    def is_horizontal(self, is_horizontal):
        self.__is_horizontal = is_horizontal

    @arrange_by.setter
    def arrange_by(self, new_arrange_by):
        self.__arrange_by = new_arrange_by

    def add_quantity(self, quantity):
        self.__quantities.append(quantity)

