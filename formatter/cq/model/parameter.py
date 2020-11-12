class Parameter:
    def __init__(self, name, value, quantity_space):
        self.__name = name
        self.__value = value
        self.__quantity_space = quantity_space

    @property
    def name(self):
        return self.__name

    @property
    def value(self):
        return self.__value

    @property
    def quantity_space(self):
        return self.__quantity_space

    def __str__(self):
        return f"{self.__name}\t\"{self.__value}\t{self.__quantity_space}\""

    def __repr__(self):
        return self.__str__()

    def __eq__(self, other):
        if type(other) is type(self):
            return self.__members() == other.__members()
        else:
            return False

    def __members(self):
        return self.__name, self.__value, self.__quantity_space


