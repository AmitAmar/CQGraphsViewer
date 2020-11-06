from utils.general_utils import auto_str
from collections import namedtuple

Parameter = namedtuple('Parameter', ['name',
                                     'value',
                                     'quantity_space'])

@auto_str
class State:
    def __init__(self):
        self.state_id = None
        self.time = None
        self.predecessor_states = None
        self.successor_states = list()
        self.parameters = list()

    def __str__(self):
        return f"State: {self.time},\n" \
               f" predecessor_states = {self.predecessor_states},\n"\
               f"successor_states = {self.successor_states},\n"\
               f"parameters = {self.parameters}"

    def set_predecessor_state(self, pre_state):
        self.predecessor_states = pre_state

    def add_successor_state(self, successor_state):
        self.successor_states.append(successor_state)

    def add_parameter(self, parameter):
        self.parameters.append(parameter)

    def set_time(self, time):
        self.time = time

    def set_id(self, state_id):
        self.state_id = state_id