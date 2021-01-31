import os
import os.path as path

import seaborn as sns

from utils.general_utils import load_user_config

COLOR_HEX_PATTERN = '#%02x%02x%02x'

# Config:
USER_PREFERENCES_SECTION = 'USER_PREFERENCES'
project_folder = path.abspath(path.join(__file__, "../../../conf"))
CONFIG_FILE_PATH = path.join(project_folder, 'config.ini')


def parse_parameters(params):
    raw_params = ""

    for param in params:
        param = str(param)
        param = param.replace('"', '')
        raw_params += param + "\n"

    return raw_params


def get_cq_file_path():
    user_preferences = load_user_config(CONFIG_FILE_PATH, USER_PREFERENCES_SECTION)
    input_cq_path = user_preferences["INPUT_CQ_DIRECTORY_PATH"]
    cq_file_name = user_preferences["CQ_FILE"]
    return os.path.join(input_cq_path, cq_file_name)


def get_input_file_path():
    user_preferences = load_user_config(CONFIG_FILE_PATH, USER_PREFERENCES_SECTION)
    input_path = user_preferences["INPUT_DIRECTORY_PATH"]
    file_name = user_preferences["INPUT_FILE"]
    return os.path.join(input_path, file_name)


def generate_colors(n):
    palette = sns.color_palette(None, n)
    colors = []

    for color_rgb in palette:
        int_color_rgb = (int(color_rgb[0] * 255), int(color_rgb[1] * 255), int(color_rgb[2] * 255))
        colors.append(COLOR_HEX_PATTERN % int_color_rgb)

    return colors
