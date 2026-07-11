import os
# pyrefly: ignore [missing-import]
from config import Config
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from extensions import db  # 🛠️ FIXED: Routing db through extensions
from models.users import User
from flask_jwt_extended import create_access_token

login_bp = Blueprint(
    "login",
    __name__,
    url_prefix="/api"
)

GOOGLE_CLIENT_ID = "1013028712991-mtu8me83bblfi3nqd423e8jvsl6u15cm.apps.googleusercontent.com"


def generate_user_jwt(user):
    # Use flask_jwt_extended to generate tokens compatible with @jwt_required()
    additional_claims = {
        "user_context": {
            "user_code": user.user_code,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role
        }
    }
    return create_access_token(
        identity=user.user_code,
        additional_claims=additional_claims,
        expires_delta=timedelta(days=1)
    )


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
            # Use a session with a timeout to prevent hanging for 600+ seconds
            import requests as stdlib_requests
            session = stdlib_requests.Session()
            session.timeout = 10  # 10 second timeout for Google's token verification endpoint
            google_transport = google_requests.Request(session=session)
            
            id_info = id_token.verify_oauth2_token(
                token, 
                google_transport, 
                GOOGLE_CLIENT_ID
            )
            google_email = id_info.get("email")
            
        except ValueError as ve:
            return jsonify({"error": "Invalid Google credential security integrity token"}), 401
        except Exception as google_err:
            return jsonify({"error": f"Google token verification failed: {str(google_err)}"}), 502

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
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Google Single-Sign-On core error occurred: {str(e)}"}), 500