import os
import jwt
import hashlib
import secrets
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from extensions import db
from config import Config
from models.users import User

settings_bp = Blueprint('settings_bp', __name__, url_prefix='/api/v1')

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", Config.JWT_SECRET_KEY)

def parse_user_agent(ua_string):
    if not ua_string:
        return "Unknown Device"
    ua = ua_string.lower()
    os_name = "Unknown OS"
    if "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "macOS"
    elif "iphone" in ua:
        os_name = "iOS"
    elif "ipad" in ua:
        os_name = "iPadOS"
    elif "android" in ua:
        os_name = "Android"
    elif "linux" in ua:
        os_name = "Linux"
        
    browser_name = "Unknown Browser"
    if "chrome" in ua or "crios" in ua:
        browser_name = "Chrome"
    elif "safari" in ua and "chrome" not in ua:
        browser_name = "Safari"
    elif "firefox" in ua or "fxios" in ua:
        browser_name = "Firefox"
    elif "edge" in ua or "edg" in ua:
        browser_name = "Edge"
    elif "opera" in ua or "opr" in ua:
        browser_name = "Opera"
        
    return f"{browser_name} on {os_name}"

def validate_token_and_session():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, "Access Denied: Missing or malformed authentication token."
        
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_context = payload.get("user_context", {})
        user_code = user_context.get("user_code")
        if not user_code:
            return None, "Access Denied: Invalid user context."
            
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        
        session_row = db.session.execute(
            text("SELECT is_active FROM user_sessions WHERE token_hash = :hash"),
            {"hash": token_hash}
        ).fetchone()
        
        if session_row is None:
            # First time seeing this token, auto-seed it!
            ua_string = request.headers.get("User-Agent", "")
            device_name = parse_user_agent(ua_string)
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip_address and ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()
                
            db.session.execute(text("""
                INSERT INTO user_sessions (user_code, token_hash, device_name, ip_address, is_active)
                VALUES (:uc, :hash, :dev, :ip, 1)
            """), {"uc": user_code, "hash": token_hash, "dev": device_name, "ip": ip_address})
            db.session.commit()
        else:
            if not session_row[0]:
                return None, "Access Denied: This session has been revoked."
                
            # Update last active time
            db.session.execute(text("""
                UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE token_hash = :hash
            """), {"hash": token_hash})
            db.session.commit()
            
        user = User.query.filter_by(user_code=user_code).first()
        if not user:
            return None, "Access Denied: User not found."
            
        return user, None
    except jwt.ExpiredSignatureError:
        return None, "Access Denied: Authentication token has expired."
    except Exception as e:
        return None, f"Access Denied: Invalid authentication token. Details: {str(e)}"

def check_and_migrate_db():
    """Programmatic migration script to add missing settings columns and user_sessions table."""
    try:
        # 1. Create user_sessions table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_code VARCHAR(20) NOT NULL,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                device_name VARCHAR(255) NULL,
                ip_address VARCHAR(45) NULL,
                is_active TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))
        
        # 2. Add columns to users table if they don't exist
        columns_to_add = [
            ("telemetry_sync_mode", "VARCHAR(50) DEFAULT 'Real-time'"),
            ("ignored_extensions", "TEXT NULL"),
            ("notify_on_faculty_review", "INT DEFAULT 1"),
            ("notification_routing", "VARCHAR(255) DEFAULT 'In-app Dashboard'"),
            ("theme", "VARCHAR(20) DEFAULT 'light'"),
            ("ide_font_family", "VARCHAR(50) DEFAULT 'SF Mono'"),
            ("ide_font_size", "INT DEFAULT 13")
        ]
        
        for col_name, col_type in columns_to_add:
            check_col = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_schema = DATABASE() 
                  AND table_name = 'users' 
                  AND column_name = :col
            """), {"col": col_name}).scalar()
            
            if not check_col:
                db.session.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Database migration failed: {str(e)}")

@settings_bp.route('/user/settings', methods=['GET'])
def get_settings():
    user, err = validate_token_and_session()
    if err:
        return jsonify({"status": "error", "message": err}), 401
        
    return jsonify({
        "status": "success",
        "settings": user.to_dict()
    }), 200

@settings_bp.route('/user/settings', methods=['PATCH'])
def update_settings():
    user, err = validate_token_and_session()
    if err:
        return jsonify({"status": "error", "message": err}), 401
        
    data = request.json or {}
    
    try:
        # Account preferences
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'bio' in data:
            user.bio = data['bio']
            
        # Telemetry preferences
        if 'telemetry_sync_mode' in data:
            user.telemetry_sync_mode = data['telemetry_sync_mode']
        if 'ignored_extensions' in data:
            user.ignored_extensions = data['ignored_extensions']
            
        # Notification preferences
        if 'notify_on_faculty_review' in data:
            user.notify_on_faculty_review = int(data['notify_on_faculty_review'])
        if 'notification_routing' in data:
            user.notification_routing = data['notification_routing']
            
        # Appearance preferences
        if 'theme' in data:
            user.theme = data['theme']
        if 'ide_font_family' in data:
            user.ide_font_family = data['ide_font_family']
        if 'ide_font_size' in data:
            user.ide_font_size = int(data['ide_font_size'])
            
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Settings updated successfully.",
            "settings": user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@settings_bp.route('/user/settings/sessions', methods=['GET'])
def get_user_sessions():
    user, err = validate_token_and_session()
    if err:
        return jsonify({"status": "error", "message": err}), 401
        
    try:
        result = db.session.execute(text("""
            SELECT id, device_name, ip_address, created_at, last_active, token_hash
            FROM user_sessions 
            WHERE user_code = :uc AND is_active = 1
            ORDER BY last_active DESC
        """), {"uc": user.user_code}).fetchall()
        
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1]
        current_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        
        sessions = []
        for row in result:
            sessions.append({
                "id": int(row[0]),
                "device_name": row[1] or "Unknown Device",
                "ip_address": row[2] or "Unknown IP",
                "created_at": row[3].isoformat() if row[3] else "",
                "last_active": row[4].isoformat() if row[4] else "",
                "is_current": row[5] == current_hash
            })
            
        return jsonify({"status": "success", "sessions": sessions}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@settings_bp.route('/user/sessions/<int:session_id>', methods=['DELETE'])
def revoke_user_session(session_id):
    user, err = validate_token_and_session()
    if err:
        return jsonify({"status": "error", "message": err}), 401
        
    try:
        session_row = db.session.execute(text("""
            SELECT user_code FROM user_sessions WHERE id = :id AND is_active = 1
        """), {"id": session_id}).fetchone()
        
        if not session_row:
            return jsonify({"status": "error", "message": "Session not found or already inactive."}), 404
            
        if session_row[0] != user.user_code:
            return jsonify({"status": "error", "message": "Unauthorized to revoke this session."}), 403
            
        db.session.execute(text("""
            UPDATE user_sessions SET is_active = 0 WHERE id = :id
        """), {"id": session_id})
        db.session.commit()
        
        return jsonify({"status": "success", "message": "Session successfully revoked."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@settings_bp.route('/cli/key/regenerate', methods=['POST'])
def regenerate_api_key():
    user, err = validate_token_and_session()
    if err:
        return jsonify({"status": "error", "message": err}), 401
        
    data = request.json or {}
    device_name = data.get('device_name', 'Developer Machine')
    
    try:
        # Invalidate old keys in the user_api_keys table
        db.session.execute(
            text("UPDATE user_api_keys SET is_active = 0 WHERE user_id = :user_id"),
            {"user_id": user.email}
        )
        
        # Generate new cryptographic 'tb_live_' hex key
        raw_key = f"tb_live_{secrets.token_hex(24)}"
        key_hash = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
        key_preview = f"tb_live_••••{raw_key[-4:]}"
        
        # Save key details block
        db.session.execute(
            text("""
                INSERT INTO user_api_keys (user_id, key_hash, key_preview, device_name, created_at, is_active)
                VALUES (:user_id, :key_hash, :key_preview, :device_name, NOW(), 1)
            """),
            {
                "user_id": user.email,
                "key_hash": key_hash,
                "key_preview": key_preview,
                "device_name": device_name
            }
        )
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "key": raw_key,
            "preview": key_preview
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
