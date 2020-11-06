import re
from utils.general_utils import is_not_empty
from cq_model.state import State

TIME_PATTERN = "Time\s*=\s(.*)\n"



def convert_to_gml(raw_cq_output):
    cq_states = list()

    cq_states_raw = raw_cq_output.split("State")

    for raw_str in cq_states_raw:
        current_state = State()
        if is_not_empty(raw_str):
            raw_str = raw_str.strip()
            init_id(current_state, raw_str)
            init_time(current_state, raw_str)

            print(current_state)

    return ""


def init_id(current_state, raw_str):
    state_id = int(raw_str[0])
    current_state.set_id(state_id)


def init_time(current_state, raw_str):
    time_pattern = re.compile(TIME_PATTERN)
    current_time = time_pattern.findall(raw_str)[0]
    current_state.set_time(current_time)