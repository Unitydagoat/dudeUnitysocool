from flask import Flask, request, jsonify, Response, redirect
from datetime import datetime
import requests
import json

app = Flask(__name__)

@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def proxy(path):
    print(request.get_json())

    headers_to_forward = {}
    for header in ["X-EntityToken", "X-SecretKey", "X-Authorization", "Content-Type"]:
        if header in request.headers:
            headers_to_forward[header] = request.headers[header]

    rjson = request.get_json()
    
    print(f"Request body before: {rjson}")
    if rjson.get("AppId") == "the games title id":
        rjson["OculusId"] = "usyer id"
        rjson["CustomId"] = "custom id"
        urls = "https://oawdajdl;kawjdl;ajdl;ajd"
    req = requests.request(
        method=request.method,
        url=urls,
        headers=headers_to_forward,
        json=rjson,
        params=request.args,
        allow_redirects=False
    )

    print(f"Request body after: {request.get_data()}")

    if req.status_code in [301, 302]:
        return redirect(req.headers["Location"], code=req.status_code)

    try:
        response_data = req.json()
        
        print("JSON Response:", response_data)
        return jsonify(response_data), req.status_code
    except ValueError:
        return Response(req.content, status=req.status_code, headers=dict(req.headers))
        
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008)
