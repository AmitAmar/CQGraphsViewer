from flask import Flask, jsonify
from flask_cors import CORS

from rest import cq_rest_controller
from rest.extented_graph import ExtendedGraph

HOSTNAME = 'localhost'
PORT = 8080

app = Flask(__name__)

cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

user_graph = ExtendedGraph()


@app.route('/get-graph', methods=['GET'])
def get_graph():
    return cq_rest_controller.get_graph(user_graph)


@app.route('/get-quantities', methods=['GET'])
def get_quantities():
    return cq_rest_controller.get_quantities(user_graph)


@app.route('/arranged-by/<field>', methods=['POST'])
def arrange_by(field):
    return cq_rest_controller.arrange_by(field, user_graph)



if __name__ == '__main__':
    app.run(host=HOSTNAME, port=PORT)
