from flask import Flask, jsonify, request
import mongodb
from mongodb.connection import get_db

app = Flask(__name__)

# users

@app.post("/login")
def login():
    return jsonify({"error": "Not implemented yet"}), 501

@app.post("/add_user")
def add_user():
    return jsonify({"error": "Not implemented yet"}), 501


# projects

@app.get("/get_user_projects_list")
def get_user_projects_list():
    return jsonify({"error": "Not implemented yet"}), 501

@app.get("/get_project_info")
def get_project_info():
    return jsonify({"error": "Not implemented yet"}), 501

@app.post("/create_project")
def create_project():
    return jsonify({"error": "Not implemented yet"}), 501

@app.post("/join_project")
def join_project():
    return jsonify({"error": "Not implemented yet"}), 501

# hw sets

@app.get("/get_all_hw_names")
def get_all_hw_names():
    # collection = get_db()["hardwareSets"]
    # documents = collection.find({}, {"_id": 0, "name": 1})
    # names = [document["name"] for document in documents]
    return jsonify({"error": "Not implemented yet"}), 501

@app.get("/get_hw_info")
def get_hw_info():
    return jsonify({"error": "Not implemented yet"}), 501

@app.post("/check_out")
def check_out():
    return jsonify({"error": "Not implemented yet"}), 501

@app.post("/check_in")
def check_in():
    return jsonify({"error": "Not implemented yet"}), 501



if __name__ == "__main__":
    app.run(debug=True)