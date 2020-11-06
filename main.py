"""
    A program that converts CQ output into GML (Graph Modelling Language) Format

    Written by Amit Amar (2020)
"""
import os
import cq_formatter
from configparser import ConfigParser

CONFIG_FILE_PATH = "config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"


def load_user_config():
    config_object = ConfigParser()
    config_object.read(CONFIG_FILE_PATH)
    user_preferences = config_object[USER_PREFERENCES_CONFIG_SECTION]
    return user_preferences


def init_results_directory(results_directory_path):
    if not os.path.isdir(results_directory_path):
        os.makedirs(results_directory_path)


def read_data(input_dir_path, input_cq_path):
    with open(os.path.join(input_dir_path,input_cq_path)) as in_file:
        data = in_file.read()

    return data


def write_results(results_dir, output_path, gml):
    with open(os.path.join(results_dir,output_path), mode='w') as out_file:
        out_file.write(gml)


def main():
    # Read configurations:
    user_preferences = load_user_config()
    results_dir_path = user_preferences["RESULTS_DIRECTORY_PATH"]
    input_dir_path = user_preferences["INPUT_DIRECTORY_PATH"]
    cq_data_path = user_preferences["CQ_DATA_PATH"]
    gml_output_path = user_preferences["GML_OUTPUT_PATH"]

    init_results_directory(results_dir_path)
    raw_cq_data = read_data(input_dir_path, cq_data_path)
    gml = cq_formatter.convert_to_gml(raw_cq_data)
    write_results(results_dir_path, gml_output_path, gml)


if __name__ == '__main__':
    main()
