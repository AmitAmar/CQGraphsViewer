import re
from server.utils.general_utils import read_data
from server.rest.constraint import Constraint

CONSTRAINS_PATTERN = r"\(\(.*?\)"


def parse_file(path):
    data = read_data(path)
    const_pattern = re.compile(CONSTRAINS_PATTERN)
    raw_consts = const_pattern.findall(data)
    consts = []

    for const in raw_consts:
        # 1.  ((M+  amount  level) --> M+  amount  level
        const = const.replace('(', '').replace(')', '')

        # 2.  M+  amount  level --> [M+, amount, level]
        parts = const.split()
        current_const = Constraint(parts[0], parts[1:])
        consts.append(current_const)

    return consts
