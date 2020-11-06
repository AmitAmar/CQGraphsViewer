import re
from utils.general_utils import is_not_empty
from cq_model.state import State
from gml_model.node import Node
from gml_model.edge import Edge
from gml_model.graph import Graph

NONE_VALUE = 'none'

TIME_PATTERN = "Time\s*=\s(.*)\n"
PREDECESSOR_STATE_PATTERN = "Predecessor states\s*:\s(.*)\n"
SUCCESSOR_STATES_PATTERN = "Successor states\s*:\s(.*)\n"

time_pattern = re.compile(TIME_PATTERN)
predecessor_state_pattern = re.compile(PREDECESSOR_STATE_PATTERN)
successor_states_pattern = re.compile(SUCCESSOR_STATES_PATTERN)


def convert_to_gml(raw_cq_output):
    graph = Graph()
    cq_states = parse_cq_states(raw_cq_output)

    return ""


def parse_cq_states(raw_cq_output):
    cq_states = list()
    cq_states_raw = raw_cq_output.split("State")
    for raw_str in cq_states_raw:
        current_state = State()
        if is_not_empty(raw_str):
            raw_str = raw_str.strip()
            init_id(current_state, raw_str)
            init_time(current_state, raw_str)
            init_predecessor_state(current_state, raw_str)
            init_successor_states(current_state, raw_str)
            init_parameters(current_state, raw_str)
            cq_states.append(current_state)
            print(current_state)

    return cq_states


def init_id(current_state, raw_str):
    state_id = int(raw_str[0])
    current_state.set_id(state_id)


def init_time(current_state, raw_str):
    current_time = time_pattern.findall(raw_str)[0]
    current_state.set_time(current_time)


def init_predecessor_state(current_state, raw_str):
    pre_state = predecessor_state_pattern.findall(raw_str)[0]

    if pre_state.isnumeric():
        current_state.set_predecessor_state(int(pre_state))


def init_successor_states(current_state, raw_str):
    raw_successors = successor_states_pattern.findall(raw_str)[0].strip()

    if raw_successors == NONE_VALUE:
        return

    successors = raw_successors.split()

    for successor in successors:
        current_state.add_successor_state(int(successor))


def init_parameters(current_state, raw_str):
    pass