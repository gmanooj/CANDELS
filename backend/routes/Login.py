import os
# pyrefly: ignore [missing-import]
import jwt
from config import Config
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from extensions import db  # 🛠️ FIXED: Routing db through extensions
from models.users import User

login_bp = Blueprint(
    "login",
    __name__,
    url_prefix="/api"
)

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", Config.JWT_SECRET_KEY)
GOOGLE_CLIENT_ID = "1013028712991-mtu8me83bblfi3nqd423e8jvsl6u15cm.apps.googleusercontent.com"


def generate_user_jwt(user):
    payload = {
        "exp": datetime.utcnow() + timedelta(days=1),
        "iat": datetime.utcnow(),
        "sub": user.user_code,
        "user_context": {
            "user_code": user.user_code,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role
        }
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")


@login_bp.route("/login", methods=["POST"])
def login_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing login request payload"}), 400

        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Please provide both email and password"}), 400

        user = User.query.filter_by(email=email).first()

        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email address or password"}), 401

        if user.status != "active":
            return jsonify({"error": f"Your account status is currently: {user.status}"}), 403

        token = generate_user_jwt(user)

        return jsonify({
            "message": "Login authorization successfully executed!",
            "token": token,
            "user": {
                "user_code": user.user_code,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Internal infrastructure exception occurred: {str(e)}"}), 500


@login_bp.route("/login/google", methods=["POST"])
def google_login_user():
    try:
        data = request.get_json()
        token = data.get("token")

        if not token:
            return jsonify({"error": "Missing Google identity authentication token"}), 400

        try:
            id_info = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID
            )
            google_email = id_info.get("email")
            
        except ValueError:
            return jsonify({"error": "Invalid Google credential security integrity token"}), 401

        user = User.query.filter_by(email=google_email).first()

        if not user:
            return jsonify({
                "error": f"The Gmail address '{google_email}' is not registered under any TeamBridge profile."
            }), 404

        if user.status != "active":
            return jsonify({"error": f"Access denied. Your profile status is currently: {user.status}"}), 403

        app_token = generate_user_jwt(user)

        return jsonify({
            "message": "Google single sign-on authorization successful!",
            "token": app_token,
            "user": {
                "user_code": user.user_code,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Google Single-Sign-On core error occurred: {str(e)}"}), 500