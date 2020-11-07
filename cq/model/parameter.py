class Parameter:
    def __init__(self, name, value, quantity_space):
        self.__name = name
        self.__value = value
        self.__quantity_space = quantity_space

    def __str__(self):
        return f"{self.__name}\t{self.__value}\t{self.__quantity_space}"