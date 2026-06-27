# 📄 Location: d:/Ptojects/TeamBridge/backend/routes/cli.py

from flask import Blueprint, request, jsonify
from extensions import db, socketio
from models.users import User
from werkzeug.security import check_password_hash
from sqlalchemy import text
from flask_socketio import emit
from routes.workspace.workspace import extract_docx_text
import secrets
import os
import base64
import hashlib

cli_bp = Blueprint('cli_bp', __name__, url_prefix='/api/cli')
STORAGE_BASE_DIR = os.path.abspath("D:/TeamBridge_Workspaces")

def register_or_update_document_record(team_code, rel_path, content_b64, email):
    ext = os.path.splitext(rel_path)[1].lower()
    if ext not in ['.docx', '.doc', '.pdf', '.txt', '.md']:
        return

    doc_name = os.path.basename(rel_path)
    
    content_str = ""
    if ext in ['.txt', '.md']:
        try:
            content_str = base64.b64decode(content_b64).decode('utf-8')
        except Exception:
            content_str = "[Binary or unreadable text content]"
    elif ext == '.docx':
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
                tmp.write(base64.b64decode(content_b64))
                tmp_path = tmp.name
            try:
                content_str = extract_docx_text(tmp_path)
            finally:
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
        except Exception as e:
            print("Failed to extract docx text during record sync:", e)
            content_str = "[Failed to parse Word Document text]"
    else:
        content_str = f"[Local Document File: {rel_path}]"

    try:
        user_code = email
        user_row = db.session.execute(
            text("SELECT user_code FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        if user_row:
            user_code = user_row[0]
            
        clean_rel_path = rel_path.replace('\\', '/')
        doc = db.session.execute(
            text("""
                SELECT id, document_url, file_path FROM workspace_documents 
                WHERE team_code = :team 
                AND (
                    document_name = :name 
                    OR file_path = :path 
                    OR REPLACE(file_path, '\\\\', '/') LIKE CONCAT('%', :clean_path)
                )
            """),
            {"team": team_code, "name": doc_name, "path": rel_path, "clean_path": clean_rel_path}
        ).fetchone()
        
        doc_url = f"http://localhost:5000/api/workspace/documents/download?team_code={team_code}&path={rel_path}"
        
        if doc:
            db.session.execute(
                text("""
                    UPDATE workspace_documents 
                    SET content_buffer = :buffer, last_modified_at = NOW() 
                    WHERE id = :id
                """),
                {"buffer": content_str, "id": doc[0]}
            )
            
            stored_url = doc[1]
            if stored_url and "filename=" in stored_url:
                from urllib.parse import urlparse, parse_qs
                try:
                    parsed = urlparse(stored_url)
                    qparams = parse_qs(parsed.query)
                    filename = qparams.get('filename', [None])[0]
                    if filename:
                        server_file_path = os.path.join("D:/TeamBridge_Workspaces/uploaded_documents", team_code, filename)
                        with open(server_file_path, 'wb') as sf:
                            sf.write(base64.b64decode(content_b64))
                except Exception as fe:
                    print("Failed to sync file content to server physical file:", fe)
        else:
            db.session.execute(
                text("""
                    INSERT INTO workspace_documents (team_code, document_name, document_url, uploaded_by, created_at, file_path, content_buffer, version_string, owner_code, last_modified_at)
                    VALUES (:team, :name, :url, :uploaded_by, NOW(), :path, :buffer, '1.0', :owner, NOW())
                """),
                {
                    "team": team_code,
                    "name": doc_name,
                    "url": doc_url,
                    "uploaded_by": user_code,
                    "path": rel_path,
                    "buffer": content_str,
                    "owner": user_code
                }
            )
        db.session.commit()
        
        socketio.emit('document_update', {
            "team_code": team_code,
            "document_name": doc_name,
            "file_path": doc[2] if (doc and doc[2]) else rel_path,
            "content_buffer": content_str,
            "updated_by": email
        }, to=f"chat_{team_code}")
    except Exception as e:
        print("Failed to sync local document event to database:", e)

def check_cli_token():
    """Helper to validate the CLI token header and return the user's email."""
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    if not token:
        token = request.headers.get('X-CLI-Token')
    
    if not token:
        return None
        
    try:
        if token.startswith("tb_live_"):
            token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
            query = text("""
                SELECT user_id FROM user_api_keys 
                WHERE key_hash = :key_hash AND is_active = 1 
                AND (expires_at IS NULL OR expires_at > NOW())
            """)
            row = db.session.execute(query, {"key_hash": token_hash}).fetchone()
            if row:
                db.session.execute(
                    text("UPDATE user_api_keys SET last_used_at = NOW() WHERE key_hash = :key_hash"),
                    {"key_hash": token_hash}
                )
                db.session.commit()
                return row[0]
        else:
            query = text("""
                SELECT user_id FROM cli_auth_tokens 
                WHERE auth_token = :token AND (expires_at IS NULL OR expires_at > NOW())
            """)
            row = db.session.execute(query, {"token": token}).fetchone()
            if row:
                return row[0]
    except Exception as e:
        print("CLI token database lookup failed:", e)
        
    return None

# =====================================================================
# 🔐 AUTHENTICATION ENDPOINTS
# =====================================================================

@cli_bp.route('/login', methods=['POST'])
def cli_login():
    """Handles terminal credential checks, generates unique device tokens, and saves them."""
    data = request.json or {}
    email = data.get('email', '').strip()        
    password = data.get('password', '').strip()  
    device_name = data.get('device_name', 'Terminal Device')
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Missing credentials"}), 400

    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"status": "error", "message": "Invalid email address or password"}), 401

        is_valid = False
        try:
            is_valid = check_password_hash(user.password_hash, password)
        except Exception:
            is_valid = False

        if not is_valid:
            return jsonify({"status": "error", "message": "Invalid email address or password"}), 401
            
        if user.status != "active":
            return jsonify({"status": "error", "message": f"Your account status is currently: {user.status}"}), 403

        generated_token = f"tb_cli_{secrets.token_hex(24)}"
        
        db.session.execute(
            text("""
                INSERT INTO cli_auth_tokens (user_id, auth_token, device_name, created_at, expires_at)
                VALUES (:user_id, :token, :device, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
            """),
            {
                "user_id": email,
                "token": generated_token,
                "device": device_name
            }
        )
        db.session.commit()
        
        return jsonify({
            "status": "success", 
            "token": generated_token,
            "message": f"Successfully authenticated {device_name}."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@cli_bp.route('/profile', methods=['GET'])
def cli_get_profile():
    """Returns profile context for the `cn auth whoami` group pipeline."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized token."}), 401
        
    try:
        user = User.query.filter_by(email=user_email).first()
        if not user:
            return jsonify({"status": "error", "message": "User not found."}), 404
            
        return jsonify({
            "status": "success",
            "user": {
                "name": getattr(user, 'name', 'Manoj'), # Fallback tracking name
                "email": user_email,
                "status": user.status
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================================
# 📂 WORKSPACE MANAGEMENT ENDPOINTS
# =====================================================================

@cli_bp.route('/projects', methods=['GET'])
def cli_get_projects():
    """Fetches all active projects the user has access to (Supports `cn workspace list/select`)."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized: Invalid or expired CLI token."}), 401

    try:
        query = text("""
            SELECT 
                t.team_code,
                t.project_name,
                u.user_code,
                t.leader_code,
                t.faculty_code
            FROM users u
            LEFT JOIN team_memberships tm ON u.user_code = tm.user_code AND tm.approval_status = 'Approved'
            LEFT JOIN teams t ON tm.team_id = t.id OR t.leader_code = u.user_code OR t.faculty_code = u.user_code
            WHERE u.email = :email AND t.id IS NOT NULL
        """)
        result = db.session.execute(query, {"email": user_email}).fetchall()
        
        projects = []
        seen = set()
        for row in result:
            if row.team_code in seen:
                continue
            seen.add(row.team_code)
            role = "Student"
            if row.user_code == row.leader_code:
                role = "Leader"
            elif row.user_code == row.faculty_code:
                role = "Faculty"
                
            projects.append({
                "team_code": row.team_code,
                "project_title": row.project_name,
                "role": role
            })
            
        return jsonify({
            "status": "success",
            "projects": projects
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@cli_bp.route('/workspace/info', methods=['GET'])
def cli_get_workspace_info():
    """Provides file count and layout diagnostic analytics metadata metrics for `cn workspace info` checks."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"status": "error", "message": "Missing team_code parameter."}), 400
        
    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    file_count = 0
    total_size = 0
    
    if os.path.exists(project_dir):
        for root, _, files in os.walk(project_dir):
            for f in files:
                file_count += 1
                try:
                    total_size += os.path.getsize(os.path.join(root, f))
                except OSError:
                    pass

    return jsonify({
        "status": "success",
        "workspace": {
            "team_code": team_code,
            "total_files": file_count,
            "storage_bytes": total_size,
            "storage_mb": round(total_size / (1024 * 1024), 2)
        }
    }), 200

# =====================================================================
# ⚡ SYNCHRONIZATION PIPELINE ROUTINES
# =====================================================================

@cli_bp.route('/files', methods=['GET'])
def cli_get_files():
    """Recursively returns all workspace files and contents (base64) for the selected team."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized: Invalid or expired CLI token."}), 401

    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"status": "error", "message": "Missing team_code parameter."}), 400

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    if not os.path.exists(project_dir):
        return jsonify({"status": "success", "files": []}), 200

    try:
        file_list = []
        ignored = {'.git', 'node_modules', '__pycache__', '.teambridge', 'venv', 'env'}
        
        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in ignored]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, project_dir).replace('\\', '/')
                try:
                    with open(full_path, 'rb') as f:
                        content_b64 = base64.b64encode(f.read()).decode('utf-8')
                    file_list.append({
                        "path": rel_path,
                        "content": content_b64
                    })
                except Exception as e:
                    print(f"Skipping CLI file read {rel_path}: {e}")
                    
        return jsonify({
            "status": "success",
            "files": file_list
        }), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@cli_bp.route('/upload', methods=['POST'])
def cli_upload_file():
    """Receives a file path and base64 content, writing it to the team's server directory."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized: Invalid or expired CLI token."}), 401

    data = request.json or {}
    team_code = data.get('team_code')
    file_path = data.get('path')
    content_b64 = data.get('content')

    if not team_code or not file_path or content_b64 is None:
        return jsonify({"status": "error", "message": "Missing parameters."}), 400

    is_registered_doc = False
    doc_check = None
    try:
        doc_check = db.session.execute(
            text("SELECT id, document_url FROM workspace_documents WHERE team_code = :team AND file_path = :path"),
            {"team": team_code, "path": file_path}
        ).fetchone()
        if doc_check:
            is_registered_doc = True
    except Exception:
        is_registered_doc = False

    if is_registered_doc:
        content_str = ""
        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.txt', '.md']:
            try:
                content_str = base64.b64decode(content_b64).decode('utf-8')
            except Exception:
                content_str = "[Binary or unreadable text content]"
        elif ext == '.docx':
            try:
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
                    tmp.write(base64.b64decode(content_b64))
                    tmp_path = tmp.name
                try:
                    content_str = extract_docx_text(tmp_path)
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
            except Exception as e:
                print("Failed to extract docx text on HTTP upload sync:", e)
                content_str = "[Failed to parse Word Document text]"
        else:
            content_str = f"[Local Document File: {file_path}]"

        try:
            db.session.execute(
                text("UPDATE workspace_documents SET content_buffer = :buffer, last_modified_at = NOW() WHERE team_code = :team AND file_path = :path"),
                {"buffer": content_str, "team": team_code, "path": file_path}
            )
            db.session.commit()

            stored_url = doc_check[1]
            if stored_url and "filename=" in stored_url:
                from urllib.parse import urlparse, parse_qs
                try:
                    parsed = urlparse(stored_url)
                    qparams = parse_qs(parsed.query)
                    filename = qparams.get('filename', [None])[0]
                    if filename:
                        server_file_path = os.path.join("D:/TeamBridge_Workspaces/uploaded_documents", team_code, filename)
                        with open(server_file_path, 'wb') as sf:
                            sf.write(base64.b64decode(content_b64))
                except Exception as fe:
                    print("Failed to sync file content to server physical file:", fe)

            socketio.emit('document_update', {
                "team_code": team_code,
                "document_name": os.path.basename(file_path),
                "file_path": file_path,
                "content_buffer": content_str,
                "updated_by": user_email
            }, to=f"chat_{team_code}")

            return jsonify({"status": "success", "message": f"Document {file_path} synchronized successfully."}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500

    clean_path = os.path.normpath(file_path.replace('\\', '/'))
    if clean_path.startswith('..') or os.path.isabs(clean_path):
        return jsonify({"status": "error", "message": "Invalid file path."}), 400

    ignored_folders = {'.git', 'node_modules', '__pycache__', '.teambridge', 'venv', 'env'}
    path_parts = clean_path.split(os.sep)
    if any(ignored in path_parts for ignored in ignored_folders):
        return jsonify({"status": "success", "message": "Ignored pattern file upload skipped."}), 200

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    full_path = os.path.join(project_dir, clean_path)

    canonical_proj = os.path.realpath(project_dir)
    canonical_dest = os.path.realpath(full_path)
    try:
        if os.path.commonpath([canonical_proj, canonical_dest]) != canonical_proj:
            return jsonify({"status": "error", "message": "Security Violation: Path traversal outside root."}), 403
    except ValueError:
        return jsonify({"status": "error", "message": "Security Violation: Invalid path resolution."}), 403

    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'wb') as f:
            f.write(base64.b64decode(content_b64))

        db.session.execute(
            text("""
                INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                VALUES (:team, :user, :file, 1, 10)
            """),
            {
                "team": team_code,
                "user": user_email,
                "file": clean_path.replace('\\', '/')
            }
        )
        db.session.commit()

        try:
            socketio.emit('file_updated', {
                "team_code": team_code,
                "file_path": clean_path.replace('\\', '/'),
                "updated_by": user_email
            }, to=f"chat_{team_code}")
        except Exception as se:
            print("Failed to emit file_updated Socket.IO event:", se)

        try:
            register_or_update_document_record(team_code, clean_path.replace('\\', '/'), content_b64, user_email)
        except Exception as de:
            print("Failed document record sync:", de)

        return jsonify({"status": "success", "message": f"File {clean_path} synchronized successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@cli_bp.route('/drop', methods=['POST'])
def cli_drop_file():
    """Deletes a file path from the team's server directory."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized: Invalid or expired CLI token."}), 401

    data = request.json or {}
    team_code = data.get('team_code')
    file_path = data.get('path')

    if not team_code or not file_path:
        return jsonify({"status": "error", "message": "Missing parameters."}), 400

    clean_path = os.path.normpath(file_path.replace('\\', '/'))
    if clean_path.startswith('..') or os.path.isabs(clean_path):
        return jsonify({"status": "error", "message": "Invalid file path."}), 400

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    full_path = os.path.join(project_dir, clean_path)

    canonical_proj = os.path.realpath(project_dir)
    canonical_dest = os.path.realpath(full_path)
    try:
        if os.path.commonpath([canonical_proj, canonical_dest]) != canonical_proj:
            return jsonify({"status": "error", "message": "Security Violation: Path traversal outside root."}), 403
    except ValueError:
        return jsonify({"status": "error", "message": "Security Violation: Invalid path resolution."}), 403

    if not os.path.exists(full_path):
        return jsonify({"status": "error", "message": "File does not exist."}), 404

    try:
        if os.path.isdir(full_path):
            import shutil
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)

        db.session.execute(
            text("""
                INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                VALUES (:team, :user, :file, 0, 0)
            """),
            {
                "team": team_code,
                "user": user_email,
                "file": "Deleted file: " + clean_path.replace('\\', '/')
            }
        )
        db.session.commit()

        try:
            socketio.emit('file_updated', {
                "team_code": team_code,
                "file_path": clean_path.replace('\\', '/'),
                "deleted": True,
                "updated_by": user_email
            }, to=f"chat_{team_code}")
        except Exception as se:
            print("Failed to emit file_deleted Socket.IO event:", se)

        return jsonify({"status": "success", "message": f"Successfully dropped {clean_path} from cloud storage."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@cli_bp.route('/sync', methods=['POST'])
def sync_activity_logs():
    """Receives batched structural activity logs from the CLI client."""
    data = request.json or {}
    heartbeats = data.get('heartbeats', [])
    
    if not heartbeats:
        return jsonify({"status": "success", "message": "No heartbeat records to sync."}), 200

    try:
        for log in heartbeats:
            team_code = log.get('team_code')
            focused_file = log.get('focused_file')
            timestamp = log.get('timestamp')
            keystrokes_increment = log.get('keystrokes_increment', 0)
            active_seconds = log.get('active_seconds', 0)
            
            db.session.execute(
                text("""
                    INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                    VALUES (:team, :user, :file, :keys, :secs)
                """),
                {
                    "team": team_code,
                    "user": log.get('user_id', 'unknown@teambridge.edu'),
                    "file": focused_file,
                    "keys": keystrokes_increment,
                    "secs": active_seconds
                }
            )
            
            print(f"📥 [Server Stored] Team: {team_code} | File: {focused_file} | Time: {timestamp} (Active: {active_seconds}s)")

        db.session.commit()
        return jsonify({
            "status": "success", 
            "message": f"Successfully synchronized {len(heartbeats)} activity logs with TeamBridge database."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================================
# ⚙️ DEVELOPER API CONNECTIONS ACCESS KEYS
# =====================================================================

@cli_bp.route('/keys/generate', methods=['POST'])
def generate_api_key():
    data = request.json or {}
    email = data.get('email') or data.get('user_email')
    device_name = data.get('device_name', 'Developer Machine')
    if not email:
        return jsonify({"status": "error", "message": "Email is required"}), 400
        
    try:
        raw_key = f"tb_live_{secrets.token_hex(24)}"
        key_hash = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
        key_preview = "tb_live_••••"
        
        db.session.execute(
            text("""
                INSERT INTO user_api_keys (user_id, key_hash, key_preview, device_name, created_at, is_active)
                VALUES (:user_id, :key_hash, :key_preview, :device_name, NOW(), 1)
            """),
            {
                "user_id": email,
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
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@cli_bp.route('/keys/list', methods=['GET'])
def list_api_keys():
    email = request.args.get('email') or request.args.get('user_email')
    if not email:
        return jsonify({"status": "error", "message": "Email parameter is required"}), 400
        
    try:
        rows = db.session.execute(
            text("""
                SELECT id, key_preview, device_name, created_at, last_used_at, is_active 
                FROM user_api_keys 
                WHERE user_id = :user_id AND is_active = 1
                ORDER BY created_at DESC
            """),
            {"user_id": email}
        ).fetchall()
        
        keys = []
        for r in rows:
            keys.append({
                "id": int(r[0]),
                "preview": r[1],
                "device_name": r[2],
                "created_at": r[3].strftime("%Y-%m-%d %H:%M:%S") if r[3] else None,
                "last_used_at": r[4].strftime("%Y-%m-%d %H:%M:%S") if r[4] else "Never",
                "is_active": bool(r[5])
            })
        return jsonify({"status": "success", "keys": keys}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@cli_bp.route('/keys/revoke', methods=['POST'])
def revoke_api_key():
    data = request.json or {}
    key_id = data.get('key_id')
    email = data.get('email') or data.get('user_email')
    
    if not key_id or not email:
        return jsonify({"status": "error", "message": "Missing key_id or email"}), 400
        
    try:
        db.session.execute(
            text("UPDATE user_api_keys SET is_active = 0 WHERE id = :id AND user_id = :user_id"),
            {"id": key_id, "user_id": email}
        )
        db.session.commit()
        return jsonify({"status": "success", "message": "Key revoked successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================================
# 📦 BATCH TRANSACTIONS AND BULK STREAM CHANNELS
# =====================================================================

@cli_bp.route('/upload-batch', methods=['POST'])
def cli_upload_batch():
    """Receives a list of files to sync/save inside the team's server directory in a single batch."""
    user_email = check_cli_token()
    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized: Invalid or expired CLI token."}), 401

    data = request.json or {}
    team_code = data.get('team_code')
    files = data.get('files', [])

    if not team_code or not files:
        return jsonify({"status": "error", "message": "Missing team_code or files parameter."}), 400

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    
    max_file_size_bytes = 2 * 1024 * 1024
    ignored_folders = {'.git', 'node_modules', '__pycache__', '.teambridge', 'venv', 'env'}
    allowed_exts = None
    
    try:
        settings_row = db.session.execute(
            text("SELECT max_file_size_mb, allowed_extensions, ignored_folders FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()
        if settings_row:
            max_file_size_bytes = int(settings_row[0] * 1024 * 1024)
            if settings_row[1]:
                allowed_exts = {ext.strip().lower() for ext in settings_row[1].split(',') if ext.strip()}
            if settings_row[2]:
                ignored_folders = {f.strip() for f in settings_row[2].split(',') if f.strip()}
    except Exception as se:
        print("Could not query workspace settings during batch upload:", se)

    success_files = []
    deleted_files = []
    error_files = []

    try:
        for file_item in files:
            file_path = file_item.get('path')
            is_deleted = file_item.get('deleted', False)
            if not file_path:
                continue

            clean_path = os.path.normpath(file_path.replace('\\', '/'))
            if clean_path.startswith('..') or os.path.isabs(clean_path):
                error_files.append({"path": file_path, "error": "Path traversal detected."})
                continue

            path_parts = clean_path.split(os.sep)
            if any(ignored in path_parts for ignored in ignored_folders):
                continue

            full_path = os.path.join(project_dir, clean_path)
            
            canonical_proj = os.path.realpath(project_dir)
            canonical_dest = os.path.realpath(full_path)
            try:
                if os.path.commonpath([canonical_proj, canonical_dest]) != canonical_proj:
                    error_files.append({"path": file_path, "error": "Canonical escape path outside root."})
                    continue
            except ValueError:
                error_files.append({"path": file_path, "error": "Invalid target path."})
                continue

            if is_deleted:
                try:
                    if os.path.exists(full_path):
                        if os.path.isdir(full_path):
                            import shutil
                            shutil.rmtree(full_path)
                        else:
                            os.remove(full_path)
                    
                    db.session.execute(
                        text("""
                            INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                            VALUES (:team, :user, :file, 0, 0)
                        """),
                        {
                            "team": team_code,
                            "user": user_email,
                            "file": "Deleted: " + clean_path.replace('\\', '/')
                        }
                    )
                    deleted_files.append(clean_path.replace('\\', '/'))
                except Exception as de:
                    error_files.append({"path": file_path, "error": f"Failed to drop file: {str(de)}"})
            else:
                content_b64 = file_item.get('content')
                if content_b64 is None:
                    continue

                ext = os.path.splitext(clean_path)[1].lower()
                if allowed_exts and ext not in allowed_exts:
                    error_files.append({"path": file_path, "error": f"Extension {ext} is not whitelisted."})
                    continue

                estimated_size = len(content_b64) * 3 // 4
                if estimated_size > max_file_size_bytes:
                    error_files.append({"path": file_path, "error": f"File size exceeds limit."})
                    continue

                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'wb') as f:
                    f.write(base64.b64decode(content_b64))

                db.session.execute(
                    text("""
                        INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                        VALUES (:team, :user, :file, 1, 10)
                    """),
                    {
                        "team": team_code,
                        "user": user_email,
                        "file": clean_path.replace('\\', '/')
                    }
                )
                success_files.append(clean_path.replace('\\', '/'))
                try:
                    register_or_update_document_record(team_code, clean_path.replace('\\', '/'), content_b64, user_email)
                except Exception as de:
                    print("Failed document record sync in batch:", de)

        db.session.commit()

        if success_files or deleted_files:
            try:
                socketio.emit('file_updated', {
                    "team_code": team_code,
                    "batch": True,
                    "files": success_files,
                    "deleted_files": deleted_files,
                    "updated_by": user_email
                }, to=f"chat_{team_code}")
            except Exception as se:
                print("Failed to emit batch file_updated Socket.IO event:", se)

        return jsonify({
            "status": "success",
            "message": f"Synchronized {len(success_files)} files cleanly, drop executed for {len(deleted_files)}.",
            "success_files": success_files,
            "deleted_files": deleted_files,
            "error_files": error_files
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@socketio.on('cli_file_stream')
def handle_cli_file_stream(data):
    """WebSocket-driven sync engine to process real-time streams."""
    token = data.get('auth_token')
    team_code = data.get('team_code')
    files = data.get('files', [])
    
    if not token or not team_code:
        emit('cli_stream_response', {"status": "error", "message": "Missing authorization or team code."})
        return

    user_email = None
    try:
        if token.startswith("tb_live_"):
            token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
            row = db.session.execute(
                text("SELECT user_id FROM user_api_keys WHERE key_hash = :key_hash AND is_active = 1"),
                {"key_hash": token_hash}
            ).fetchone()
            if row:
                user_email = row[0]
                db.session.execute(
                    text("UPDATE user_api_keys SET last_used_at = NOW() WHERE key_hash = :key_hash"),
                    {"key_hash": token_hash}
                )
                db.session.commit()
        else:
            row = db.session.execute(
                text("SELECT user_id FROM cli_auth_tokens WHERE auth_token = :token"),
                {"token": token}
            ).fetchone()
            if row:
                user_email = row[0]
    except Exception as e:
        emit('cli_stream_response', {"status": "error", "message": f"Database authorization lookup failed: {str(e)}"})
        return

    if not user_email:
        emit('cli_stream_response', {"status": "error", "message": "Unauthorized token or API key."})
        return

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    canonical_proj = os.path.realpath(project_dir)
    
    success_files = []
    deleted_files = []
    error_files = []

    max_file_size_bytes = 2 * 1024 * 1024
    ignored_folders = {'.git', 'node_modules', '__pycache__', '.teambridge', 'venv', 'env'}
    allowed_exts = None
    
    try:
        settings_row = db.session.execute(
            text("SELECT max_file_size_mb, allowed_extensions, ignored_folders FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()
        if settings_row:
            max_file_size_bytes = int(settings_row[0] * 1024 * 1024)
            if settings_row[1]:
                allowed_exts = {ext.strip().lower() for ext in settings_row[1].split(',') if ext.strip()}
            if settings_row[2]:
                ignored_folders = {f.strip() for f in settings_row[2].split(',') if f.strip()}
    except Exception as se:
        print("Could not query workspace settings during WebSocket stream processing:", se)

    try:
        for file_item in files:
            file_path = file_item.get('path')
            is_deleted = file_item.get('deleted', False)
            if not file_path:
                continue

            clean_path = os.path.normpath(file_path.replace('\\', '/'))
            
            is_registered_doc = False
            doc_check = None
            try:
                doc_check = db.session.execute(
                    text("SELECT id, document_url FROM workspace_documents WHERE team_code = :team AND file_path = :path"),
                    {"team": team_code, "path": file_path}
                ).fetchone()
                if doc_check:
                    is_registered_doc = True
            except Exception:
                is_registered_doc = False

            if is_registered_doc:
                content_b64 = file_item.get('content')
                if content_b64 is not None:
                    content_str = ""
                    ext = os.path.splitext(file_path)[1].lower()
                    if ext in ['.txt', '.md']:
                        try:
                            content_str = base64.b64decode(content_b64).decode('utf-8')
                        except Exception:
                            content_str = "[Binary or unreadable text content]"
                    elif ext == '.docx':
                        try:
                            import tempfile
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
                                tmp.write(base64.b64decode(content_b64))
                                tmp_path = tmp.name
                            try:
                                content_str = extract_docx_text(tmp_path)
                            finally:
                                try:
                                    os.remove(tmp_path)
                                except Exception:
                                    pass
                        except Exception as e:
                            print("Failed to extract docx text on WebSocket upload sync:", e)
                            content_str = "[Failed to parse Word Document text]"
                    else:
                        content_str = f"[Local Document File: {file_path}]"

                    try:
                        db.session.execute(
                            text("UPDATE workspace_documents SET content_buffer = :buffer, last_modified_at = NOW() WHERE team_code = :team AND file_path = :path"),
                            {"buffer": content_str, "team": team_code, "path": file_path}
                        )

                        stored_url = doc_check[1]
                        if stored_url and "filename=" in stored_url:
                            from urllib.parse import urlparse, parse_qs
                            try:
                                parsed = urlparse(stored_url)
                                qparams = parse_qs(parsed.query)
                                filename = qparams.get('filename', [None])[0]
                                if filename:
                                    server_file_path = os.path.join("D:/TeamBridge_Workspaces/uploaded_documents", team_code, filename)
                                    with open(server_file_path, 'wb') as sf:
                                        sf.write(base64.b64decode(content_b64))
                            except Exception as fe:
                                print("Failed to sync file content to server physical file:", fe)

                        socketio.emit('document_update', {
                            "team_code": team_code,
                            "document_name": os.path.basename(file_path),
                            "file_path": file_path,
                            "content_buffer": content_str,
                            "updated_by": user_email
                        }, to=f"chat_{team_code}")

                        success_files.append(file_path)
                    except Exception as ex:
                        error_files.append({"path": file_path, "error": f"Failed to sync registered doc: {str(ex)}"})
                continue

            if clean_path.startswith('..') or os.path.isabs(clean_path):
                error_files.append({"path": file_path, "error": "Path traversal attempt blocked."})
                continue

            path_parts = clean_path.split(os.sep)
            if any(ignored in path_parts for ignored in ignored_folders):
                continue

            full_path = os.path.join(project_dir, clean_path)
            canonical_dest = os.path.realpath(full_path)
            
            try:
                if os.path.commonpath([canonical_proj, canonical_dest]) != canonical_proj:
                    error_files.append({"path": file_path, "error": "Symlink escape attempt blocked."})
                    continue
            except ValueError:
                error_files.append({"path": file_path, "error": "Invalid target path."})
                continue

            if is_deleted:
                try:
                    if os.path.exists(full_path):
                        if os.path.isdir(full_path):
                            import shutil
                            shutil.rmtree(full_path)
                        else:
                            os.remove(full_path)
                    
                    db.session.execute(
                        text("""
                            INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                            VALUES (:team, :user, :file, 0, 0)
                        """),
                        {
                            "team": team_code,
                            "user": user_email,
                            "file": "Deleted: " + clean_path.replace('\\', '/')
                        }
                    )
                    deleted_files.append(clean_path.replace('\\', '/'))
                except Exception as de:
                    error_files.append({"path": file_path, "error": f"Failed to drop file: {str(de)}"})
            else:
                content_b64 = file_item.get('content')
                if content_b64 is None:
                    continue

                ext = os.path.splitext(clean_path)[1].lower()
                if allowed_exts and ext not in allowed_exts:
                    error_files.append({"path": file_path, "error": f"Extension {ext} is not allowed."})
                    continue

                estimated_size = len(content_b64) * 3 // 4
                if estimated_size > max_file_size_bytes:
                    error_files.append({"path": file_path, "error": f"File exceeds size limit."})
                    continue

                try:
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, 'wb') as f:
                        f.write(base64.b64decode(content_b64))

                    db.session.execute(
                        text("""
                            INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                            VALUES (:team, :user, :file, 1, 10)
                        """),
                        {
                            "team": team_code,
                            "user": user_email,
                            "file": clean_path.replace('\\', '/')
                        }
                    )
                    success_files.append(clean_path.replace('\\', '/'))
                    try:
                        register_or_update_document_record(team_code, clean_path.replace('\\', '/'), content_b64, user_email)
                    except Exception as de:
                        print("Failed document record sync in WebSocket:", de)
                except Exception as ue:
                    error_files.append({"path": file_path, "error": f"Upload failure: {str(ue)}"})

        db.session.commit()

        if success_files or deleted_files:
            try:
                socketio.emit('file_updated', {
                    "team_code": team_code,
                    "batch": True,
                    "files": success_files,
                    "deleted_files": deleted_files,
                    "updated_by": user_email
                }, to=f"chat_{team_code}")
            except Exception as se:
                print("Failed to broadcast Socket.IO update:", se)

        emit('cli_stream_response', {
            "status": "success",
            "message": f"WebSocket Sync processed successfully. Scaffolds updated: {len(success_files)}, Purges executed: {len(deleted_files)}.",
            "success_files": success_files,
            "deleted_files": deleted_files,
            "error_files": error_files
        })

    except Exception as e:
        db.session.rollback()
        emit('cli_stream_response', {"status": "error", "message": f"Sync processing failure: {str(e)}"})