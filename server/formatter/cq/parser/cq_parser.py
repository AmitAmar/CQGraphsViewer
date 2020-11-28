import re
from server.utils.general_utils import is_not_empty
from server.formatter.cq.model.state import State
from server.formatter.cq.model.parameter import Parameter

CQ_STATE_PREFIX = "State"

NONE_VALUE = 'none'

ID_PATTERN = "(\d+)\s*Time"
TIME_PATTERN = "Time\s*=\s(.*)\n"
PREDECESSOR_STATE_PATTERN = "Predecessor states\s*:\s(.*)\n"
SUCCESSOR_STATES_PATTERN = "Successor states\s*:\s(.*)\n"
PARAMETERS_PATTERN = "Quantity Space((?:\n(?:.|\n)*))"
SINGLE_PARAMETER_PATTERN = "(\w*)\s*(\(.*\))\s*(\(.*\))"

id_pattern = re.compile(ID_PATTERN)
time_pattern = re.compile(TIME_PATTERN)
predecessor_state_pattern = re.compile(PREDECESSOR_STATE_PATTERN)
successor_states_pattern = re.compile(SUCCESSOR_STATES_PATTERN)
parameters_pattern = re.compile(PARAMETERS_PATTERN)
single_parameter_pattern = re.compile(SINGLE_PARAMETER_PATTERN)


def parse_cq_states(raw_cq_output):
    cq_states = list()
    cq_states_raw = raw_cq_output.split(CQ_STATE_PREFIX)

    for raw_str in cq_states_raw:
        raw_str = raw_str.strip()
        if is_not_empty(raw_str):
            current_state = State()
            init_id(current_state, raw_str)
            init_time(current_state, raw_str)
            init_predecessor_state(current_state, raw_str)
            init_successor_states(current_state, raw_str)
            init_parameters(current_state, raw_str)
            cq_states.append(current_state)

    return cq_states


def init_id(current_state, raw_str):
    state_id = id_pattern.findall(raw_str)[0]
    current_state.state_id = int(state_id)


def init_time(current_state, raw_str):
    current_time = time_pattern.findall(raw_str)[0]
    current_state.time = current_time


def init_predecessor_state(current_state, raw_str):
    pre_state = predecessor_state_pattern.findall(raw_str)[0]

    if pre_state.isnumeric():
        current_state.predecessor_state = int(pre_state)


def init_successor_states(current_state, raw_str):
    raw_successors = successor_states_pattern.findall(raw_str)[0].strip()

    if raw_successors == NONE_VALUE:
        return

    successors = raw_successors.split()

    for successor in successors:
        current_state.add_successor_state(int(successor))


def init_parameters(current_state, raw_str):
    raw_successors = parameters_pattern.findall(raw_str)
    parameters = raw_successors[0].split("\n")

    for param in parameters:
        param = param.strip()
        if is_not_empty(param):
            params_chunks = single_parameter_pattern.findall(param)[0]

            current_parameter = Parameter(params_chunks[0], params_chunks[1], params_chunks[2])
            current_state.add_parameter(current_parameter)