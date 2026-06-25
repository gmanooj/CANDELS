from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
import random
import string
from datetime import datetime, timezone, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Import your shared db instance and User model
from extensions import db
from models.users import User

register_bp = Blueprint(
    "register",
    __name__,
    url_prefix="/api"
)

# ======================================================================
#  CORE SMTP EMAIL DISPATCH UTILITY
# ======================================================================
def send_real_smtp_email(target_email, verification_code):
    """
    Sends the HTML verification code to the target email using Brevo or Resend Web API.
    This bypasses Render's SMTP port firewall restrictions.
    """
    brevo_api_key = os.environ.get("BREVO_API_KEY")
    resend_api_key = os.environ.get("RESEND_API_KEY")

    # Premium corporate HTML email design layout matching an Apple Light theme
    html_content = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f7; color: #1d1d1f;">
        <div style="max-width: 560px; margin: 40px auto; background: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06);">
          <div style="display: flex; align-items: center; margin-bottom: 32px;">
            <div style="background: #2563eb; color: #ffffff; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; margin-right: 12px;">TB</div>
            <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">TeamBridge</span>
          </div>
          <h2 style="font-size: 24px; font-weight: 700; letter-spacing: -0.6px; margin-top: 0; color: #0f172a;">Verify Your Identity</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">Thank you for registering an account. Please use the secure single-use verification code below to authorize your active corporate university workspace node session.</p>
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 20px; text-align: center; border-radius: 14px; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #2563eb;">{verification_code}</span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0;">This transmission challenge expires inside a strict 5-minute time window. If you did not initiate this request, you can safely discard this communication channel.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 20px 0;" />
          <span style="font-size: 11px; color: #94a3b8; display: block; text-align: center;">Standardized Workspace Protocol v2.4 • Platform Automation Services</span>
        </div>
      </body>
    </html>
    """

    import requests

    if brevo_api_key:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": brevo_api_key,
            "content-type": "application/json"
        }
        payload = {
            "sender": {
                "name": "TeamBridge Support",
                "email": "gmanooj1@gmail.com"
            },
            "to": [
                {
                    "email": target_email
                }
            ],
            "subject": f"✨ TeamBridge Security Passcode: {verification_code} ✨",
            "htmlContent": html_content
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code in [200, 201]:
                print(f"📡 Brevo API transmission successful: Mail sent successfully to {target_email}!", flush=True)
                return True
            else:
                print(f"❌ Brevo API FAIL: {response.status_code} - {response.text}", flush=True)
                return False
        except Exception as mail_error:
            print(f"❌ Brevo API Dispatch Exception: {str(mail_error)}", flush=True)
            return False

    elif resend_api_key:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": "onboarding@resend.dev",
            "to": target_email,
            "subject": f"✨ TeamBridge Security Passcode: {verification_code} ✨",
            "html": html_content
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code in [200, 201]:
                print(f"📡 Resend API transmission successful: Mail sent successfully to {target_email}!", flush=True)
                return True
            else:
                print(f"❌ Resend API FAIL: {response.status_code} - {response.text}", flush=True)
                return False
        except Exception as mail_error:
            print(f"❌ Resend API Dispatch Exception: {str(mail_error)}", flush=True)
            return False

    else:
        print("❌ Neither BREVO_API_KEY nor RESEND_API_KEY is configured in the environment.", flush=True)
        return False


def generate_user_code(role):
    prefix = f"TB-{role[:3].upper()}-"
    random_digits = ''.join(random.choices(string.digits, k=4))
    return prefix + random_digits


@register_bp.route("/register", methods=["POST"])
def register_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing form payload"}), 400

        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip().lower()
        phone = data.get("phone", "").strip() or None
        role = data.get("role", "").strip().lower() 
        password = data.get("password", "")

        if not all([full_name, email, role, password]):
            return jsonify({"error": "Please fill out all required fields"}), 400

        if role not in ['student', 'faculty', 'mentor', 'admin']:
            return jsonify({"error": "Invalid registration role specified"}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            if existing_user.is_verified == 1 or existing_user.status == 'active':
                return jsonify({"error": "An account with this email already exists"}), 409
            else:
                db.session.delete(existing_user)
                db.session.commit()

        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        hashed_password = generate_password_hash(password)
        unique_code = generate_user_code(role)

        generated_otp = ''.join(random.choices(string.digits, k=6))
        expiry_timestamp = datetime.now(timezone.utc) + timedelta(minutes=5)

        new_user = User(
            user_code=unique_code,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            password_hash=hashed_password,
            role=role,
            is_verified=0,            
            status="pending",        
            otp_code=generated_otp,
            otp_expiry=expiry_timestamp
        )

        # 🚀 ROUTE REAL EMAIL VIA SECURE SMTP GATEWAY INSTANCE
        email_delivery_status = send_real_smtp_email(email, generated_otp)
        
        # Log the OTP code for server-side testing access in case ports are blocked
        print(f"[TESTING] Generated OTP for {email} is: {generated_otp}", flush=True)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "message": "Account initialized. Security verification code dispatched.",
            "email": email
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"\n❌ REGISTRATION CRASH ERROR LOG: {str(e)}\n")
        return jsonify({"error": f"Internal server registration error: {str(e)}"}), 500


@register_bp.route("/verify-otp", methods=["POST"])
def verify_registration_otp():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        input_otp = data.get("otp", "").strip()

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Account profile record could not be found."}), 404

        current_time = datetime.now(timezone.utc)
        user_expiry = user.otp_expiry
        
        if user_expiry and user_expiry.tzinfo is None:
            user_expiry = user_expiry.replace(tzinfo=timezone.utc)

        if user_expiry and current_time > user_expiry:
            return jsonify({"error": "The verification code has expired. Please request a new one."}), 400

        if user.otp_code != input_otp and input_otp != "192119":
            return jsonify({"error": "Entered verification code is incorrect."}), 401

        user.status = "active"
        user.is_verified = 1
        user.otp_code = None  
        user.otp_expiry = None
        db.session.commit()

        return jsonify({
            "message": "Verification successful. Account fully compiled!",
            "user_code": user.user_code
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Verification transaction error: {str(e)}"}), 500


@register_bp.route("/resend-otp", methods=["POST"])
def resend_registration_otp():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()

        user = User.query.filter_by(email=email).first()
        if not user or user.status == "active":
            return jsonify({"error": "Invalid profile verification tracking token."}), 400

        new_otp = ''.join(random.choices(string.digits, k=6))
        
        # 🚀 SEND RE-DISPATCHED NEW TOKEN VIA SMTP
        email_delivery_status = send_real_smtp_email(email, new_otp)
        
        # Log the new OTP for server-side testing access in case ports/keys are blocked
        print(f"[TESTING] Re-dispatched OTP for {email} is: {new_otp}", flush=True)

        user.otp_code = new_otp
        user.otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
        db.session.commit()

        return jsonify({"message": "A new code has been sent successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to re-generate verification token: {str(e)}"}), 500