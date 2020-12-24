from flask import Flask
from flask_cors import CORS

from rest import cq_rest_controller

HOSTNAME = 'localhost'
PORT = 8080

app = Flask(__name__)

cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


@app.route('/get-graph', methods=['GET'])
def get_graph():
    return cq_rest_controller.get_graph()


if __name__ == '__main__':
    app.run(host=HOSTNAME, port=PORT)
