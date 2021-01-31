"""
    A program that converts CQ output into GML (Graph Modelling Language) Format

    Written by Amit Amar (2020)
"""
import os

from server.cq_formatter import cq_formatter_manager
from server.utils.general_utils import load_user_config, read_data

CONFIG_FILE_PATH = "conf/config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"


def init_output_directory(results_directory_path):
    if not os.path.isdir(results_directory_path):
        os.makedirs(results_directory_path)


def write_results(results_dir, output_path, gml):
    with open(os.path.join(results_dir, output_path), mode='w') as out_file:
        out_file.write(gml)


def main():
    # Read configurations:
    user_preferences = load_user_config(CONFIG_FILE_PATH, USER_PREFERENCES_CONFIG_SECTION)
    input_dir_path = user_preferences["INPUT_DIRECTORY_PATH"]
    output_dir_path = user_preferences["OUTPUT_DIRECTORY_PATH"]
    cq_data_path = user_preferences["CQ_DATA_PATH"]
    gml_output_path = user_preferences["GML_OUTPUT_PATH"]

    init_output_directory(output_dir_path)
    raw_cq_data = read_data(os.path.join(input_dir_path, cq_data_path))
    gml = cq_formatter_manager.convert_cq_to_gml(raw_cq_data)
    write_results(output_dir_path, gml_output_path, str(gml))


if __name__ == '__main__':
    main()
