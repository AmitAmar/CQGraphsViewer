from cq_formatter.gml_model.graph import Graph


class ExtendedGraph(Graph):
    def __init__(self):
        super().__init__()
        self.__quantities = []
        self.__arrange_by_horizontal = "Time"
        self.__arrange_by_vertical = "Time"
        self.__color_specific_field_name = None
        self.__quantities_options = {}

    @property
    def quantities(self):
        return self.__quantities

    def add_quantity(self, quantity):
        self.__quantities.append(quantity)

    @property
    def quantities_options(self):
        return self.__quantities_options

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

    @property
    def color_specific_field_name(self):
        return self.__color_specific_field_name

    @color_specific_field_name.setter
    def color_specific_field_name(self, color_specific_field_name):
        self.__color_specific_field_name = color_specific_field_name



