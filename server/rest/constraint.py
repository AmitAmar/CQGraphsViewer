ONE_TO_ONE_RELATIONS = ['d//dt', 'm+', 'm-', 'minus']


class Constraint:
    def __init__(self, relation, quantities):
        self.__relation = relation
        self.__quantities = quantities

    @property
    def quantities(self):
        return self.__quantities

    def add_quantity(self, quantity):
        self.__quantities.append(quantity)

    @property
    def relation(self):
        return self.__relation

    @relation.setter
    def relation(self, relation):
        self.relation = relation

    def is_one_to_one(self):
        if self.__relation.lower() in ONE_TO_ONE_RELATIONS:
            return True
        return False

