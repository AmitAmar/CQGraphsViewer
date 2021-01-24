from flask import Flask
from flask_cors import CORS

from rest import cq_rest_controller, quantities_dependencies_rest_controller
from rest.extented_graph import ExtendedGraph

HOSTNAME = 'localhost'
PORT = 8080

app = Flask(__name__)

cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

user_graph = ExtendedGraph()


# Home Page:
@app.route('/get-graph', methods=['GET'])
def get_graph():
    return cq_rest_controller.get_graph(user_graph)


@app.route('/get-quantities', methods=['GET'])
def get_quantities():
    return cq_rest_controller.get_quantities(user_graph)


@app.route('/arranged-by/<field>', methods=['POST'])
def arrange_by(field):
    layout, field = field.split("_")
    return cq_rest_controller.arrange_by(layout, field, user_graph)


@app.route('/set-specific-magnitude/<field>', methods=['POST'])
def set_specific_magnitude(field):
    return cq_rest_controller.set_specific_magnitude(field, user_graph)


@app.route('/get-table', methods=['GET'])
def get_table():
    return cq_rest_controller.get_table(user_graph)


@app.route('/get-quantities-options', methods=['GET'])
def get_quantities_options():
    return cq_rest_controller.get_quantities_options(user_graph)


# Plot B:
@app.route('/get-plot-b-graph', methods=['GET'])
def get_plot_b_graph():
    return quantities_dependencies_rest_controller.get_graph()


if __name__ == '__main__':
    app.run(host=HOSTNAME, port=PORT)
