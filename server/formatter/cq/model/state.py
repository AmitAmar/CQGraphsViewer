from server.utils.general_utils import auto_str,auto_repr
from .parameter import Parameter


@auto_str
@auto_repr
class State:
    def __init__(self):
        self.__state_id = None
        self.__time = None
        self.__predecessor_state = None
        self.__successor_states = list()
        self.__parameters = list()

    def add_successor_state(self, successor_state):
        self.__successor_states.append(successor_state)

    def add_parameter(self, parameter):
        if not isinstance(parameter, Parameter):
            raise TypeError("Expected to Parameter instance, actual type :" + type(parameter))
        self.__parameters.append(parameter)

    @property
    def time(self):
        return self.__time

    @time.setter
    def time(self, time):
        self.__time = time

    @property
    def state_id(self):
        return self.__state_id

    @state_id.setter
    def state_id(self, state_id):
        self.__state_id = state_id

    @property
    def predecessor_state(self):
        return self.__predecessor_state

    @predecessor_state.setter
    def predecessor_state(self, pre_state):
        self.__predecessor_state = pre_state

    @property
    def parameters(self):
        return self.__parameters

    @property
    def successor_states(self):
        return self.__successor_states
