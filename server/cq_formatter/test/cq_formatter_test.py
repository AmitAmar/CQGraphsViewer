import os
import unittest

from server.cq_formatter.cq_formatter_manager import convert_cq_to_gml
from server.utils.general_utils import read_data

INPUTS_DIRECTORY = "tests_inputs"
OUTPUT_DIRECTORY = "tests_outputs"


class CQFormatterTest(unittest.TestCase):
    def test_format_from_cq_to_gml(self):
        input_files = os.listdir(INPUTS_DIRECTORY)
        output_files = os.listdir(OUTPUT_DIRECTORY)

        for in_file, out_file in zip(input_files, output_files):
            cq_data = read_data(os.path.join(INPUTS_DIRECTORY, in_file))
            self.assertIsNotNone(cq_data)
            gml = str(convert_cq_to_gml(cq_data))
            self.assertIsNotNone(gml)
            self.assertEqual(gml, read_data(os.path.join(OUTPUT_DIRECTORY, out_file)))


if __name__ == '__main__':
    unittest.main()
