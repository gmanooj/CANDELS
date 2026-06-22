import os
import jwt
from flask import Blueprint, request, jsonify
from extensions import db
from sqlalchemy import text
from config import Config

workspace_isolated_bp = Blueprint('workspace_isolated_bp', __name__)

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", Config.JWT_SECRET_KEY)

def validate_user_token(expected_email):
    """
    Decodes the Bearer token from the Authorization header and verifies it matches expected_email.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return False, "Access Denied: Missing or malformed authentication token."
        
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_context = payload.get("user_context", {})
        token_email = user_context.get("email")
        if not token_email or token_email.lower().strip() != expected_email.lower().strip():
            return False, "Access Denied: Session token does not match identity requirements."
        return True, token_email
    except jwt.ExpiredSignatureError:
        return False, "Access Denied: Authentication token has expired."
    except Exception as e:
        return False, f"Access Denied: Invalid authentication token. Details: {str(e)}"

@workspace_isolated_bp.route('/my-projects', methods=['POST'])
def get_user_workspaces():
    """
    Dynamically fetches all active project environments for a logged-in user.
    NO HARDCODING: Resolves data across team_memberships, teams, and workspace_stacks.
    """
    data = request.json or {}
    user_email = data.get('user_email')  # Retrieved dynamically from user context session

    if not user_email:
        return jsonify({"status": "error", "message": "Unauthorized: Session user email missing."}), 401

    # Security check: validate token matches expected email
    is_valid, err_msg = validate_user_token(user_email)
    if not is_valid:
        return jsonify({"status": "error", "message": err_msg}), 401

    try:
        query = text("""
            SELECT 
                t.id AS team_id,
                t.team_code,
                t.project_name,
                t.leader_code,
                t.faculty_code,
                ws.languages,
                ws.frontend_framework,
                ws.backend_framework,
                ws.database_type,
                u.user_code
            FROM users u
            LEFT JOIN team_memberships tm ON u.user_code = tm.user_code AND tm.approval_status = 'Approved'
            LEFT JOIN teams t ON tm.team_id = t.id OR t.leader_code = u.user_code OR t.faculty_code = u.user_code
            LEFT JOIN workspace_stacks ws ON t.team_code = ws.team_code
            WHERE u.email = :email AND t.id IS NOT NULL
        """)
        
        result = db.session.execute(query, {"email": user_email}).fetchall()
        
        user_projects = []
        for row in result:
            role = "Student"
            if row.user_code == row.leader_code:
                role = "Leader"
            elif row.user_code == row.faculty_code:
                role = "Faculty"
                
            user_projects.append({
                "workspace_id": row.team_id,
                "team_code": row.team_code,
                "project_title": row.project_name,
                "role_in_team": role,
                "stack": {
                    "language": row.languages,
                    "frontend": row.frontend_framework,
                    "backend": row.backend_framework,
                    "database": row.database_type
                }
            })
            
        return jsonify({
            "status": "success",
            "user": user_email,
            "projects": user_projects
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@workspace_isolated_bp.route('/verify-permissions', methods=['POST'])
def verify_workspace_permissions():
    """
    Dynamically enforces access rules (Read/Write vs Read-Only) based on roles in the database.
    """
    data = request.json or {}
    team_code = data.get('team_code')
    user_email = data.get('user_email')

    if not team_code or not user_email:
        return jsonify({"status": "error", "message": "Missing validation requirements."}), 400

    # Security check: validate token matches expected email
    is_valid, err_msg = validate_user_token(user_email)
    if not is_valid:
        return jsonify({"status": "error", "message": err_msg}), 401

    try:
        # Get user
        user = db.session.execute(
            text("SELECT user_code, role FROM users WHERE email = :email"),
            {"email": user_email}
        ).fetchone()
        
        if not user:
            return jsonify({"status": "error", "message": "Access Denied: User not found."}), 404
            
        user_code, user_role_type = user
        
        # Get team
        team = db.session.execute(
            text("SELECT id, leader_code, faculty_code FROM teams WHERE team_code = :team"),
            {"team": team_code}
        ).fetchone()
        
        if not team:
            return jsonify({"status": "error", "message": "Access Denied: Team not found."}), 404
            
        team_id, leader_code, faculty_code = team
        
        # Check membership
        membership = db.session.execute(
            text("SELECT approval_status FROM team_memberships WHERE team_id = :team_id AND user_code = :user_code"),
            {"team_id": team_id, "user_code": user_code}
        ).fetchone()
        
        # Determine specific workspace role
        role = None
        if user_code == leader_code:
            role = "Leader"
        elif user_code == faculty_code:
            role = "Faculty"
        elif membership and membership[0] == "Approved":
            role = "Student"
            
        # Deny access if they are not in the team and not the faculty assigned
        if not role:
            return jsonify({"status": "error", "message": "Access Denied: You have no ties to this team workspace."}), 403
            
        # Define permissions matrix
        if role in ['Leader', 'Student']:
            permissions = {"read": True, "write": True, "mode": "editor"}
        elif role == 'Faculty':
            permissions = {"read": True, "write": False, "mode": "viewer"}
        else:
            permissions = {"read": True, "write": False, "mode": "public"}

        return jsonify({
            "status": "success",
            "team_code": team_code,
            "role": role,
            "permissions": permissions
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500