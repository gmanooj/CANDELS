from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from datetime import datetime
from extensions import db  # 🛠️ FIXED: Routing db through extensions
from models.users import User

forgot_password_bp = Blueprint(
    "forgot_password",
    __name__,
    url_prefix="/api"
)

SECURITY_SECRET_KEY = "teambridge_highly_secure_signing_master_key_string"
serializer = URLSafeTimedSerializer(SECURITY_SECRET_KEY)

@forgot_password_bp.route("/forgot-password/request", methods=["POST"])
def request_password_reset():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request payload"}), 400

        email = data.get("email", "").strip().lower()
        if not email:
            return jsonify({"error": "Please provide a valid email address"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({
                "message": "If the email is registered, a secure reset link has been dispatched."
            }), 200

        token = serializer.dumps(user.email, salt="password-reset-salt")
        reset_link = f"http://localhost:5173/forgot-password?token={token}"

        print("\n" + "="*80)
        print("📧 TEAMBRIDGE OUTGOING SYSTEM RESET EMAIL")
        print(f"To: {user.email}")
        print(f"Click this link to update your password:\n👉 {reset_link}")
        print("="*80 + "\n")

        return jsonify({
            "message": "A secure reset link has been dispatched to your email address!"
        }), 200

    except Exception as e:
        return jsonify({"error": f"Internal system exception occurred: {str(e)}"}), 500


@forgot_password_bp.route("/forgot-password/reset", methods=["POST"])
def reset_password_execution():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing reset request payload"}), 400

        token = data.get("token")
        new_password = data.get("password")

        if not token or not new_password:
            return jsonify({"error": "Missing token authorization or new password entry"}), 400

        try:
            verified_email = serializer.loads(
                token, 
                salt="password-reset-salt", 
                max_age=900
            )
        except SignatureExpired:
            return jsonify({"error": "The password reset token has expired. Please request a new link."}), 401
        except BadSignature:
            return jsonify({"error": "Invalid or tampered security token signature."}), 401

        user = User.query.filter_by(email=verified_email).first()
        if not user:
            return jsonify({"error": "User account matching token data could not be located."}), 404

        if user.status != "active":
            return jsonify({"error": "Account is currently locked or suspended."}), 403

        user.password_hash = generate_password_hash(new_password)
        db.session.commit()

        return jsonify({
            "message": "Password updated successfully! Redirecting to login..."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Password update transaction failed: {str(e)}"}), 500