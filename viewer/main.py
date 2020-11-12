import os
import networkx as nx
from utils.general_utils import load_user_config

CONFIG_FILE_PATH = "../conf/config.ini"
USER_PREFERENCES_CONFIG_SECTION = "USER_PREFERENCES"


def main():
    config = load_user_config(CONFIG_FILE_PATH, USER_PREFERENCES_CONFIG_SECTION)
    gml_file = config["GML_OUTPUT_PATH"]
    results_dir = config["OUTPUT_DIRECTORY_PATH"]
    gml = nx.read_gml(os.path.join(results_dir,gml_file), label = 'id')

    print(gml)


if __name__ == '__main__':
    main()
