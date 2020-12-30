from formatter.gml_model.graph import Graph


class ExtendedGraph(Graph):
    def __init__(self):
        super().__init__()
        self.__quantities = []
        self.__layout = ""
        self.__arrange_by_field = ""

    @property
    def quantities(self):
        return self.__quantities

    @property
    def layout(self):
        return self.__layout

    @property
    def arrange_by_field(self):
        return self.__arrange_by_field

    @layout.setter
    def layout(self, new_layout):
        self.__layout = new_layout

    @arrange_by_field.setter
    def arrange_by_field(self, new_arrange_by_field):
        self.__arrange_by_field = new_arrange_by_field

    def add_quantity(self, quantity):
        self.__quantities.append(quantity)

