from formatter.gml_model.graph import Graph


class ExtendedGraph(Graph):
    def __init__(self):
        super().__init__()
        self.__quantities = []
        self.__arrange_by_horizontal = "time"
        self.__arrange_by_vertical = "time"

    @property
    def quantities(self):
        return self.__quantities

    @property
    def arrange_by_horizontal(self):
        return self.__arrange_by_horizontal

    @arrange_by_horizontal.setter
    def arrange_by_horizontal(self, arrange_by_horizontal):
        self.__arrange_by_horizontal = arrange_by_horizontal

    @property
    def arrange_by_vertical(self):
        return self.__arrange_by_vertical

    @arrange_by_vertical.setter
    def arrange_by_vertical(self, arrange_by_vertical):
        self.__arrange_by_vertical = arrange_by_vertical

    def add_quantity(self, quantity):
        self.__quantities.append(quantity)

