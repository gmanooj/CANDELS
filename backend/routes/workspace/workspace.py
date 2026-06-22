import os
import json
from datetime import datetime
import time
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, socketio
from flask_socketio import join_room, leave_room
from sqlalchemy import text
from models.workspace import WorkspaceDocument, WorkspacePresentation, SystemRequest

workspace_bp = Blueprint('workspace_bp', __name__, url_prefix='/api/workspace')

def check_user_membership(team_code, user_code):
    try:
        row = db.session.execute(
            text("""
                SELECT 1 FROM teams t
                LEFT JOIN team_memberships tm ON t.id = tm.team_id AND tm.approval_status = 'Approved'
                WHERE t.team_code = :team_code AND (tm.user_code = :user_code OR t.leader_code = :user_code OR t.faculty_code = :user_code)
            """),
            {"team_code": team_code, "user_code": user_code}
        ).fetchone()
        return row is not None
    except Exception as e:
        print("Failed to check user membership:", e)
        return False


@socketio.on('join_chat')
def handle_join_chat(data):
    room = data.get('team_code')
    if room:
        join_room(f"chat_{room}")

@socketio.on('leave_chat')
def handle_leave_chat(data):
    room = data.get('team_code')
    if room:
        leave_room(f"chat_{room}")


def log_workspace_activity(team_code, user_email, focused_file):
    try:
        db.session.execute(
            text("""
                INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                VALUES (:team, :user, :file, 0, 0)
            """),
            {
                "team": team_code,
                "user": user_email,
                "file": focused_file
            }
        )
    except Exception as e:
        print("Failed to log activity heartbeat:", e)

# Base path where the web application will generate active file structures
STORAGE_BASE_DIR = os.path.abspath("D:/TeamBridge_Workspaces")

@workspace_bp.route('/status', methods=['GET'])
def get_workspace_status():
    """Checks if the workspace has been initialized for the given team code."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"status": "error", "message": "Missing team_code parameter."}), 400

    try:
        # 1. Fetch team information to get project name and subject
        team = db.session.execute(
            text("SELECT project_name, subject FROM teams WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if not team:
            return jsonify({"status": "error", "message": f"Team {team_code} not found."}), 404

        project_name, subject = team

        # 2. Check if workplace stack configuration exists (meaning initialized)
        stack = db.session.execute(
            text("SELECT languages, frontend_framework, backend_framework, database_type FROM workspace_stacks WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if stack:
            languages, frontend, backend, database = stack
            return jsonify({
                "status": "success",
                "is_initialized": True,
                "project_name": project_name,
                "subject": subject,
                "stack": {
                    "languages": languages.split(",") if languages else [],
                    "frontend": frontend,
                    "backend": backend,
                    "database": database
                }
            }), 200
        else:
            return jsonify({
                "status": "success",
                "is_initialized": False,
                "project_name": project_name,
                "subject": subject
            }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@workspace_bp.route('/initialize', methods=['POST'])
def initialize_workspace():
    """Initializes the custom workspace stack structure for a team."""
    data = request.json or {}
    team_code = data.get('team_code')
    
    # Tech stack details from the frontend
    frontend_tech = data.get('frontend', 'None')
    backend_tech = data.get('backend', 'None')
    database_tech = data.get('database', 'None')
    languages = data.get('languages', [])
    
    # Comma-separate languages list for database storage
    languages_str = ",".join(languages)

    if not team_code:
        return jsonify({"status": "error", "message": "Missing team_code parameter."}), 400

    try:
        # Fetch team info to verify it exists
        team = db.session.execute(
            text("SELECT project_name, subject FROM teams WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if not team:
            return jsonify({"status": "error", "message": f"Team {team_code} not found."}), 404

        project_name, subject = team

        # Check if already initialized
        exists = db.session.execute(
            text("SELECT workspace_id FROM workspace_stacks WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if exists:
            return jsonify({"status": "error", "message": "Workspace already initialized."}), 400

        # Insert stack info into workspace_stacks using correct database columns
        db.session.execute(
            text("""
                INSERT INTO workspace_stacks (team_code, languages, frontend_framework, backend_framework, database_type)
                VALUES (:code, :langs, :front, :back, :db_type)
            """),
            {
                "code": team_code,
                "langs": languages_str,
                "front": frontend_tech,
                "back": backend_tech,
                "db_type": database_tech
            }
        )
        
        # Scaffolding Engine: Physical File Generation Setup on Server Filesystem
        project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
        
        # Ensure structural directories
        os.makedirs(os.path.join(project_dir, 'frontend'), exist_ok=True)
        os.makedirs(os.path.join(project_dir, 'backend'), exist_ok=True)
        os.makedirs(os.path.join(project_dir, 'database'), exist_ok=True)
        os.makedirs(os.path.join(project_dir, 'documentation'), exist_ok=True)

        # Scaffolding based on dynamic stack parameters
        if frontend_tech != 'None':
            pkg_content = {
                "name": f"{project_name.lower().replace(' ', '-')}-frontend",
                "version": "1.0.0",
                "dependencies": {
                    "react": "^18.2.0" if frontend_tech == "React" else "^3.2.0",
                    "react-dom": "^18.2.0" if frontend_tech == "React" else ""
                }
            }
            with open(os.path.join(project_dir, 'frontend', 'package.json'), 'w', encoding='utf-8') as f:
                json.dump(pkg_content, f, indent=4)
                
            os.makedirs(os.path.join(project_dir, 'frontend', 'src'), exist_ok=True)
            app_content = (
                "import React from 'react';\n\n"
                "export default function App() {\n"
                "    return (\n"
                "        <div style={{ padding: 20 }}>\n"
                f"            <h1>Welcome to {project_name} Frontend</h1>\n"
                "        </div>\n"
                "    );\n"
                "}\n"
            )
            with open(os.path.join(project_dir, 'frontend', 'src', 'App.jsx'), 'w', encoding='utf-8') as f:
                f.write(app_content)

        if backend_tech != 'None':
            if backend_tech == 'Flask' or 'Python' in languages:
                app_py = (
                    "from flask import Flask, jsonify\n\n"
                    "app = Flask(__name__)\n\n"
                    "@app.route('/api/status')\n"
                    "def status():\n"
                    "    return jsonify({\"status\": \"online\"})\n\n"
                    "if __name__ == '__main__':\n"
                    "    app.run(port=5000)\n"
                )
                with open(os.path.join(project_dir, 'backend', 'app.py'), 'w', encoding='utf-8') as f:
                    f.write(app_py)
                with open(os.path.join(project_dir, 'backend', 'requirements.txt'), 'w', encoding='utf-8') as f:
                    f.write("Flask>=3.0.0\n")
            elif backend_tech == 'Express' or 'Node' in backend_tech:
                server_js = (
                    "const express = require('express');\n"
                    "const app = express();\n\n"
                    "app.get('/api/status', (req, res) => res.json({ status: 'online' }));\n\n"
                    "app.listen(5000, () => console.log('Backend active on port 5000'));\n"
                )
                with open(os.path.join(project_dir, 'backend', 'server.js'), 'w', encoding='utf-8') as f:
                    f.write(server_js)
                with open(os.path.join(project_dir, 'backend', 'package.json'), 'w', encoding='utf-8') as f:
                    json.dump({"dependencies": {"express": "^4.18.2"}}, f, indent=4)

        if database_tech != 'None':
            schema_sql = (
                f"-- Database Schema for {project_name}\n"
                f"CREATE DATABASE IF NOT EXISTS {project_name.lower().replace(' ', '_')};\n"
                f"USE {project_name.lower().replace(' ', '_')};\n\n"
                "CREATE TABLE IF NOT EXISTS users (\n"
                "    id INT AUTO_INCREMENT PRIMARY KEY,\n"
                "    email VARCHAR(255) NOT NULL UNIQUE,\n"
                "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n"
                ");\n"
            )
            with open(os.path.join(project_dir, 'database', 'schema.sql'), 'w', encoding='utf-8') as f:
                f.write(schema_sql)

        # Generate config file
        config_payload = {
            "team_code": team_code,
            "project_name": project_name,
            "stack": {
                "languages": languages,
                "frontend": frontend_tech,
                "backend": backend_tech,
                "database": database_tech
            }
        }
        with open(os.path.join(project_dir, 'teambridge.config'), 'w', encoding='utf-8') as f:
            json.dump(config_payload, f, indent=4)

        # Generate README.md
        readme_content = (
            f"# {project_name}\n\n"
            f"Welcome to your automatically provisioned workspace environment!\n\n"
            f"## Configuration Details\n"
            f"- **Team Code:** {team_code}\n"
            f"- **Frontend:** {frontend_tech}\n"
            f"- **Backend:** {backend_tech}\n"
            f"- **Database:** {database_tech}\n"
            f"- **Languages:** {', '.join(languages)}\n"
        )
        with open(os.path.join(project_dir, 'README.md'), 'w', encoding='utf-8') as f:
            f.write(readme_content)

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Workspace initialized successfully."
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@workspace_bp.route('/heartbeat', methods=['POST'])
def process_activity_heartbeat():
    """Saves continuous activity metrics (keystrokes, cursor motions) into the monitoring stream."""
    data = request.json or {}
    user_email = data.get('user_email')
    focused_file = data.get('focused_file', 'README.md')
    is_typing = data.get('is_typing', False)
    team_code = data.get('team_code')

    if not user_email:
        return jsonify({"status": "error", "message": "Telemetry tracking parameters incomplete."}), 400

    try:
        if not team_code:
            # Look up team_code from team_memberships for this user email
            row = db.session.execute(
                text("""
                    SELECT t.team_code FROM users u
                    JOIN team_memberships tm ON u.user_code = tm.user_code
                    JOIN teams t ON tm.team_id = t.id
                    WHERE u.email = :email
                    LIMIT 1
                """),
                {"email": user_email}
            ).fetchone()
            if not row:
                row = db.session.execute(
                    text("SELECT team_code FROM teams t JOIN users u ON t.leader_code = u.user_code WHERE u.email = :email LIMIT 1"),
                    {"email": user_email}
                ).fetchone()
            if row:
                team_code = row[0]
            else:
                team_code = "UNKNOWN"

        keystrokes = 12 if is_typing else 0
        active_seconds = 30
        
        db.session.execute(
            text("""
                INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                VALUES (:team, :user, :file, :keystrokes, :seconds)
            """),
            {
                "team": team_code,
                "user": user_email,
                "file": focused_file,
                "keystrokes": keystrokes,
                "seconds": active_seconds
            }
        )
        db.session.commit()
        return jsonify({"status": "success", "message": "Telemetry heartbeat processed."}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@workspace_bp.route('/tasks', methods=['GET'])
def get_workspace_tasks():
    """Fetches all tasks dynamically from the workspace_tasks table."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        query = text("""
            SELECT t.id, t.title, t.category, t.priority, t.status, t.assigned_to,
                   u.first_name, u.last_name
            FROM workspace_tasks t
            LEFT JOIN users u ON t.assigned_to = u.user_code
            WHERE t.team_code = :code
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        tasks_list = []
        for r in rows:
            tasks_list.append({
                "id": int(r[0]),
                "title": r[1],
                "category": r[2] or "General",
                "priority": r[3] or "Medium",
                "status": r[4] or "To Do",
                "assigned_to": r[5] or "",
                "assignee_name": f"{r[6]} {r[7]}".strip() if r[6] else "Unassigned",
                "done": r[4] == "Done"
            })
        return jsonify({"tasks": tasks_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/tasks', methods=['POST'])
def create_workspace_task():
    """Creates a new task in the database for the given team workspace."""
    data = request.json or {}
    team_code = data.get('team_code')
    title = data.get('title')
    category = data.get('category', 'General')
    priority = data.get('priority', 'Medium')
    status = data.get('status', 'To Do')
    assigned_to = data.get('assigned_to', None)
    email = data.get('email', 'unknown@teambridge.edu')
    
    if not team_code or not title:
        return jsonify({"error": "Missing team_code or title parameter."}), 400
        
    try:
        # Verify if requester is the leader of the team
        leader_check = db.session.execute(
            text("""
                SELECT 1 FROM teams t
                JOIN users u ON t.leader_code = u.user_code
                WHERE t.team_code = :team_code AND u.email = :email
            """),
            {"team_code": team_code, "email": email}
        ).fetchone()
        if not leader_check:
            return jsonify({"error": "Unauthorized: Only the team leader can create tasks."}), 403

        # Verify assignee is not faculty/mentor
        if assigned_to:
            assignee_role = db.session.execute(
                text("SELECT role FROM users WHERE user_code = :user_code"),
                {"user_code": assigned_to}
            ).fetchone()
            if assignee_role and assignee_role[0].lower() in ['faculty', 'mentor']:
                return jsonify({"error": "Unauthorized: Faculty/Mentors cannot be assigned tasks."}), 400

        db.session.execute(
            text("""
                INSERT INTO workspace_tasks (team_code, title, category, priority, status, assigned_to)
                VALUES (:code, :title, :category, :priority, :status, :assigned_to)
            """),
            {
                "code": team_code,
                "title": title,
                "category": category,
                "priority": priority,
                "status": status,
                "assigned_to": assigned_to if assigned_to else None
            }
        )
        log_workspace_activity(team_code, email, f"Task Created: '{title}'")
        db.session.commit()
        return jsonify({"status": "success", "message": "Task created successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/tasks', methods=['PUT'])
def update_workspace_task():
    """Updates status or assignment on a task dynamically."""
    data = request.json or {}
    task_id = data.get('id')
    status = data.get('status')
    assigned_to = data.get('assigned_to')
    email = data.get('email', 'unknown@teambridge.edu')
    
    if not task_id:
        return jsonify({"error": "Missing task id parameter."}), 400
        
    try:
        # Fetch task details for logging
        task_info = db.session.execute(
            text("SELECT team_code, title, status, assigned_to FROM workspace_tasks WHERE id = :id"),
            {"id": task_id}
        ).fetchone()
        
        if not task_info:
            return jsonify({"error": "Task not found."}), 404
            
        team_code, title, old_status, old_assigned = task_info

        # Verify assignee is not faculty/mentor
        if assigned_to:
            assignee_role = db.session.execute(
                text("SELECT role FROM users WHERE user_code = :user_code"),
                {"user_code": assigned_to}
            ).fetchone()
            if assignee_role and assignee_role[0].lower() in ['faculty', 'mentor']:
                return jsonify({"error": "Unauthorized: Faculty/Mentors cannot be assigned tasks."}), 400
        
        updates = []
        params = {"id": task_id}
        if status is not None:
            updates.append("status = :status")
            params["status"] = status
        if assigned_to is not None:
            updates.append("assigned_to = :assigned_to")
            params["assigned_to"] = assigned_to if assigned_to else None
            
        if not updates:
            return jsonify({"error": "No update parameter provided."}), 400
            
        sql = f"UPDATE workspace_tasks SET {', '.join(updates)} WHERE id = :id"
        db.session.execute(text(sql), params)
        
        log_msg = f"Task Updated: '{title}'"
        if status is not None and status != old_status:
            log_msg = f"Task Status Change: '{title}' moved to '{status}'"
        elif assigned_to is not None and assigned_to != old_assigned:
            log_msg = f"Task Assigned: '{title}' assigned to '{assigned_to}'"
        log_workspace_activity(team_code, email, log_msg)
            
        db.session.commit()
        return jsonify({"status": "success", "message": "Task updated successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/tasks', methods=['DELETE'])
def delete_workspace_task():
    """Removes a task from the database."""
    task_id = request.args.get('id')
    email = request.args.get('email', 'unknown@teambridge.edu')
    if not task_id:
        return jsonify({"error": "Missing task id parameter."}), 400
    try:
        task_info = db.session.execute(
            text("SELECT team_code, title FROM workspace_tasks WHERE id = :id"),
            {"id": task_id}
        ).fetchone()
        
        if not task_info:
            return jsonify({"error": "Task not found."}), 404
            
        team_code, title = task_info
        
        # Verify if requester is the leader of the team
        leader_check = db.session.execute(
            text("""
                SELECT 1 FROM teams t
                JOIN users u ON t.leader_code = u.user_code
                WHERE t.team_code = :team_code AND u.email = :email
            """),
            {"team_code": team_code, "email": email}
        ).fetchone()
        if not leader_check:
            return jsonify({"error": "Unauthorized: Only the team leader can delete tasks."}), 403
            
        db.session.execute(text("DELETE FROM workspace_tasks WHERE id = :id"), {"id": task_id})
        log_workspace_activity(team_code, email, f"Task Deleted: '{title}'")
            
        db.session.commit()
        return jsonify({"status": "success", "message": "Task deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/members', methods=['GET'])
def get_team_members():
    """Lists all approved members/students bound to this team workspace."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        query = text("""
            SELECT u.user_code, u.first_name, u.last_name, u.profile_image, u.email, t.leader_code, u.role
            FROM team_memberships tm
            JOIN users u ON tm.user_code = u.user_code
            JOIN teams t ON tm.team_id = t.id
            WHERE t.team_code = :code AND tm.approval_status = 'Approved'
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        members_list = []
        for r in rows:
            user_code = r[0]
            leader_code = r[5]
            db_role = r[6]
            if user_code == leader_code:
                role = "Leader"
            elif db_role in ['faculty', 'mentor']:
                role = db_role.capitalize()
            else:
                role = "Student"
            members_list.append({
                "user_code": user_code,
                "name": f"{r[1]} {r[2]}".strip(),
                "photo": r[3] or "",
                "email": r[4],
                "role": role
            })
        return jsonify({"members": members_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/reports', methods=['GET'])
def get_reports_data():
    """Builds reports metrics dynamically using user telemetry heartbeats."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        # Fetch actual approved members first
        query_m = text("""
            SELECT u.user_code, u.first_name, u.last_name, u.profile_image, u.email, t.leader_code, u.role
            FROM team_memberships tm
            JOIN users u ON tm.user_code = u.user_code
            JOIN teams t ON tm.team_id = t.id
            WHERE t.team_code = :code AND tm.approval_status = 'Approved'
        """)
        members = db.session.execute(query_m, {"code": team_code}).fetchall()
        
        # If members list is empty, let's include the team leader directly
        if not members:
            query_l = text("""
                SELECT u.user_code, u.first_name, u.last_name, u.profile_image, u.email, t.leader_code, u.role
                FROM teams t
                JOIN users u ON t.leader_code = u.user_code
                WHERE t.team_code = :code
            """)
            members = db.session.execute(query_l, {"code": team_code}).fetchall()

        members_report = []
        colors = ['#0052FF', '#30d158', '#ff9500', '#af52de', '#ff2d55']
        
        for i, r in enumerate(members):
            user_code = r[0]
            first_name = r[1]
            last_name = r[2]
            photo = r[3]
            email = r[4]
            leader_code = r[5]
            db_role = r[6]
            
            if user_code == leader_code:
                role = "Leader"
            elif db_role in ['faculty', 'mentor']:
                role = db_role.capitalize()
            else:
                role = "Student"
            
            # Query real telemetry heartbeats
            hb_data = db.session.execute(
                text("""
                    SELECT SUM(active_seconds) as active_sec, SUM(keystrokes_count) as keys_cnt, COUNT(DISTINCT focused_file) as files_cnt
                    FROM activity_heartbeats
                    WHERE team_code = :code AND user_id = :email
                """),
                {"code": team_code, "email": email}
            ).fetchone()
            
            active_sec = float(hb_data[0] or 0.0)
            keys_cnt = int(hb_data[1] or 0)
            files_cnt = int(hb_data[2] or 0)
            
            hours_worked = round(active_sec / 3600.0, 2)
            
            # Query completed tasks count
            task_data = db.session.execute(
                text("""
                    SELECT 
                        COUNT(*) as total_tasks,
                        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done_tasks
                    FROM workspace_tasks
                    WHERE team_code = :code AND assigned_to = :user_code
                """),
                {"code": team_code, "user_code": user_code}
            ).fetchone()
            
            total_tasks = int(task_data[0] or 0)
            done_tasks = int(task_data[1] or 0)
            
            # Auto-detect performance score and anomalies
            telemetry_anomaly = False
            anomaly_reason = ""
            
            if role in ["Faculty", "Mentor"]:
                score = None
                progress = 0
            else:
                # Telemetry anomaly checking (guards against scripting and idling loopholes)
                if keys_cnt > 1000 and files_cnt == 0:
                    telemetry_anomaly = True
                    anomaly_reason = "High keyboard activity detected with zero file modifications (keystroke scripting loophole)."
                elif hours_worked > 4.0 and keys_cnt < 20:
                    telemetry_anomaly = True
                    anomaly_reason = "High active time logged with minimal keyboard input (session idling loophole)."

                base_score = 45 if role == "Leader" else 30
                score = base_score + (done_tasks * 15) + (hours_worked * 10) + (keys_cnt * 0.02)
                
                if telemetry_anomaly:
                    score = max(10, int(score - 30)) # Apply 30 point grading penalty

                score = min(100, int(score))
                progress = score
                
                # Save or Update performance score to database for students/leaders only
                score_record = db.session.execute(
                    text("SELECT id FROM workspace_performance_scores WHERE team_code = :team AND user_code = :user"),
                    {"team": team_code, "user": user_code}
                ).fetchone()
                
                if score_record:
                    db.session.execute(
                        text("""
                            UPDATE workspace_performance_scores 
                            SET score = :score, work_hours = :hours, updated_at = NOW() 
                            WHERE id = :id
                        """),
                        {"score": score, "hours": hours_worked, "id": score_record[0]}
                    )
                else:
                    db.session.execute(
                        text("""
                            INSERT INTO workspace_performance_scores (team_code, user_code, score, work_hours, updated_at)
                            VALUES (:team, :user, :score, :hours, NOW())
                        """),
                        {"team": team_code, "user": user_code, "score": score, "hours": hours_worked}
                    )
            
            initials = f"{first_name[0] if first_name else ''}{last_name[0] if last_name else ''}".upper()
            
            # Format report item
            members_report.append({
                "user_code": user_code,
                "name": f"{first_name} {last_name}".strip(),
                "initials": initials if initials else "ST",
                "commits": int(active_sec / 120.0) + (1 if keys_cnt > 0 else 0),
                "lines": f"+{keys_cnt * 3}",
                "hours": hours_worked,
                "progress": progress,
                "performance_score": score,
                "completed_tasks": done_tasks,
                "total_tasks": total_tasks,
                "files_count": files_cnt,
                "color": colors[i % len(colors)],
                "photo": photo or "",
                "role": role,
                "telemetry_anomaly": telemetry_anomaly,
                "anomaly_reason": anomaly_reason
            })
            
        db.session.commit()
        
        return jsonify({
            "members": members_report,
            "total_commits": sum(m["commits"] for m in members_report),
            "total_lines": sum(int(m["lines"].replace('+', '')) for m in members_report),
            "total_hours": sum(m["hours"] for m in members_report)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/documents', methods=['GET'])
def get_workspace_documents():
    """Fetches all documents linked to the team workspace."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        query = text("""
            SELECT d.id, d.document_name, d.document_url, d.created_at, u.first_name, u.last_name, d.content_buffer, d.file_path
            FROM workspace_documents d
            LEFT JOIN users u ON d.uploaded_by = u.user_code
            WHERE d.team_code = :code
            ORDER BY d.created_at DESC
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        docs = []
        for r in rows:
            docs.append({
                "id": int(r[0]),
                "name": r[1],
                "url": r[2],
                "created_at": r[3].strftime("%Y-%m-%d %H:%M:%S") if r[3] else "",
                "uploaded_by_name": f"{r[4]} {r[5]}".strip() if r[4] else "Unknown",
                "content_buffer": r[6] or "",
                "file_path": r[7] or ""
            })
        return jsonify({"documents": docs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/documents', methods=['POST'])
def create_workspace_document():
    """Links a new document (e.g. DOCX) to the team workspace."""
    data = request.json or {}
    team_code = data.get('team_code')
    document_name = data.get('document_name')
    document_url = data.get('document_url')
    email = data.get('email')
    
    if not team_code or not document_name or not document_url or not email:
        return jsonify({"error": "Missing required document parameter."}), 400
        
    try:
        # Look up user code from email
        user = db.session.execute(
            text("SELECT user_code FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        if not user:
            return jsonify({"error": "User not found."}), 404
        user_code = user[0]
        
        db.session.execute(
            text("""
                INSERT INTO workspace_documents (team_code, document_name, document_url, uploaded_by, created_at)
                VALUES (:code, :name, :url, :uploaded_by, NOW())
            """),
            {
                "code": team_code,
                "name": document_name,
                "url": document_url,
                "uploaded_by": user_code
            }
        )
        log_workspace_activity(team_code, email, f"Linked Doc: '{document_name}'")
        db.session.commit()
        return jsonify({"status": "success", "message": "Document link created successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/documents', methods=['DELETE'])
def delete_workspace_document():
    """Deletes a linked document from the team workspace."""
    doc_id = request.args.get('id')
    email = request.args.get('email', 'unknown@teambridge.edu')
    if not doc_id:
        return jsonify({"error": "Missing document ID."}), 400
    try:
        doc_info = db.session.execute(
            text("SELECT team_code, document_name FROM workspace_documents WHERE id = :id"),
            {"id": doc_id}
        ).fetchone()
        
        db.session.execute(text("DELETE FROM workspace_documents WHERE id = :id"), {"id": doc_id})
        
        if doc_info:
            team_code, document_name = doc_info
            log_workspace_activity(team_code, email, f"Removed Doc: '{document_name}'")
            
        db.session.commit()
        return jsonify({"status": "success", "message": "Document link removed."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/activities', methods=['GET'])
def get_workspace_activities():
    """Generates an activity stream of file changes and document uploads for faculty transparency."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        # Fetch file edit heartbeats
        query = text("""
            SELECT h.focused_file, h.keystrokes_count, h.active_seconds, h.sync_timestamp,
                   u.first_name, u.last_name, u.email
            FROM activity_heartbeats h
            JOIN users u ON h.user_id = u.email
            WHERE h.team_code = :code
            ORDER BY h.sync_timestamp DESC
            LIMIT 20
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        activities = []
        for r in rows:
            activities.append({
                "type": "file_edit",
                "file": r[0],
                "keystrokes": r[1],
                "active_seconds": r[2],
                "timestamp": r[3].strftime("%Y-%m-%d %H:%M:%S") if r[3] else "",
                "user_name": f"{r[4]} {r[5]}".strip(),
                "email": r[6]
            })
            
        # Fetch document links
        doc_query = text("""
            SELECT d.document_name, d.document_url, d.created_at, u.first_name, u.last_name
            FROM workspace_documents d
            JOIN users u ON d.uploaded_by = u.user_code
            WHERE d.team_code = :code
            ORDER BY d.created_at DESC
            LIMIT 10
        """)
        doc_rows = db.session.execute(doc_query, {"code": team_code}).fetchall()
        for r in doc_rows:
            activities.append({
                "type": "document_link",
                "doc_name": r[0],
                "doc_url": r[1],
                "timestamp": r[2].strftime("%Y-%m-%d %H:%M:%S") if r[2] else "",
                "user_name": f"{r[3]} {r[4]}".strip()
            })
            
        # Sort combined activities by timestamp desc
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify({"activities": activities[:25]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def extract_docx_text(filepath):
    import zipfile
    import xml.etree.ElementTree as ET
    try:
        with zipfile.ZipFile(filepath) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in root.findall('.//w:p', namespaces):
                texts = [t.text for t in p.findall('.//w:t', namespaces) if t.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n\n'.join(paragraphs)
    except Exception as e:
        print("Failed to extract docx text:", e)
        return ""


@workspace_bp.route('/upload', methods=['POST'])
def upload_workspace_document():
    """Allows uploading a physical file (pdf, docx, doc, png, etc.) to the workspace."""
    from flask import send_from_directory
    import uuid
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400
        
    file = request.files['file']
    team_code = request.form.get('team_code')
    email = request.form.get('email')
    
    if not team_code or not email or file.filename == '':
        return jsonify({"error": "Missing team_code, email or file filename."}), 400
        
    try:
        # Generate a safe unique filename to avoid overwrites
        original_filename = file.filename
        file_ext = os.path.splitext(original_filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        
        # Ensure upload folder exists
        upload_folder_base = os.path.abspath("D:/TeamBridge_Workspaces/uploaded_documents")
        team_upload_dir = os.path.join(upload_folder_base, team_code)
        os.makedirs(team_upload_dir, exist_ok=True)
        
        file_path = os.path.join(team_upload_dir, unique_filename)
        file.save(file_path)
        
        # Return a safe download URL mapping to the local serving route
        document_url = f"http://localhost:5000/api/workspace/uploaded-file?team_code={team_code}&filename={unique_filename}"
        
        # Resolve user_code
        user = db.session.execute(
            text("SELECT user_code FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        if not user:
            return jsonify({"error": "User not found."}), 404
        user_code = user[0]
        
        # Read text file content into buffer if text/markdown/docx
        content_buffer = ""
        if file_ext.lower() in ['.txt', '.md']:
            try:
                with open(file_path, 'r', encoding='utf-8') as tf:
                    content_buffer = tf.read()
            except Exception:
                pass
        elif file_ext.lower() == '.docx':
            try:
                content_buffer = extract_docx_text(file_path)
            except Exception:
                pass

        local_path = request.form.get('local_path')

        # Save to database
        db.session.execute(
            text("""
                INSERT INTO workspace_documents (team_code, document_name, document_url, uploaded_by, created_at, content_buffer, file_path)
                VALUES (:code, :name, :url, :uploaded_by, NOW(), :buffer, :file_path)
            """),
            {
                "code": team_code,
                "name": original_filename,
                "url": document_url,
                "uploaded_by": user_code,
                "buffer": content_buffer,
                "file_path": local_path if local_path else f"uploaded_documents/{team_code}/{unique_filename}"
            }
        )
        log_workspace_activity(team_code, email, f"Uploaded Doc: '{original_filename}'")
        db.session.commit()
        
        return jsonify({"status": "success", "message": "File uploaded and linked successfully."}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/uploaded-file', methods=['GET'])
def get_uploaded_document():
    """Serves the uploaded document file directly."""
    from flask import send_from_directory
    team_code = request.args.get('team_code')
    filename = request.args.get('filename')
    if not team_code or not filename:
        return jsonify({"error": "Missing team_code or filename parameter."}), 400
        
    upload_folder_base = os.path.abspath("D:/TeamBridge_Workspaces/uploaded_documents")
    team_upload_dir = os.path.join(upload_folder_base, team_code)
    try:
        return send_from_directory(team_upload_dir, filename)
    except Exception as e:
        return jsonify({"error": "File not found or access denied."}), 404

@workspace_bp.route('/chat', methods=['GET'])
def get_workspace_chat_messages():
    """Fetches all active chat messages and auto-purges any messages older than 30 days."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        # 1. Automatically purge chat data older than 1 month (30 days)
        db.session.execute(
            text("DELETE FROM workspace_chat_messages WHERE created_at < NOW() - INTERVAL 30 DAY")
        )
        db.session.commit()

        # 2. Query active chat messages
        query = text("""
            SELECT id, sender_code, sender_name, encrypted_text, DATE_FORMAT(created_at, '%H:%i') as sent_time
            FROM workspace_chat_messages
            WHERE team_code = :code
            ORDER BY created_at ASC
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        
        messages = []
        for r in rows:
            messages.append({
                "id": int(r[0]),
                "sender_code": r[1],
                "sender": r[2],
                "text": r[3],
                "time": r[4] or ""
            })
        return jsonify({"messages": messages}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/chat', methods=['POST'])
def save_workspace_chat_message():
    """Persists a client-side encrypted message to the DB and updates the cloud storage backup log file."""
    data = request.json or {}
    team_code = data.get('team_code')
    email = data.get('email')
    encrypted_text = data.get('text')

    if not team_code or not email or not encrypted_text:
        return jsonify({"error": "Missing required chat parameters."}), 400

    try:
        # 1. Fetch sender info
        sender = db.session.execute(
            text("SELECT user_code, first_name, last_name FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        
        if not sender:
            return jsonify({"error": "Sender not found."}), 404
        user_code, first_name, last_name = sender
        sender_name = f"{first_name} {last_name}".strip()

        # 2. Insert encrypted message into DB
        db.session.execute(
            text("""
                INSERT INTO workspace_chat_messages (team_code, sender_code, sender_name, encrypted_text, created_at)
                VALUES (:team_code, :user_code, :sender_name, :text, NOW())
            """),
            {
                "team_code": team_code,
                "user_code": user_code,
                "sender_name": sender_name,
                "text": encrypted_text
            }
        )
        db.session.commit()

        # Emit the message via Socket.IO in real-time
        try:
            new_id = db.session.execute(text("SELECT LAST_INSERT_ID()")).scalar()
            socketio.emit('new_chat', {
                "id": int(new_id) if new_id else int(time.time()),
                "sender_code": user_code,
                "sender": sender_name,
                "text": encrypted_text,
                "time": datetime.now().strftime("%H:%M")
            }, to=f"chat_{team_code}")
        except Exception as socket_err:
            print("Failed to emit chat socket event:", socket_err)

        # 3. Purge older chats in DB
        db.session.execute(
            text("DELETE FROM workspace_chat_messages WHERE created_at < NOW() - INTERVAL 30 DAY")
        )
        db.session.commit()

        # 4. Sync chats backup file in the cloud storage (simulated folder)
        backup_dir = os.path.abspath(f"D:/TeamBridge_Workspaces/uploaded_documents/{team_code}")
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"chats_{team_code}_backup.json")

        # Recycle simulated cloud storage backup if it has crossed 30 days
        import time
        if os.path.exists(backup_path):
            mtime = os.path.getmtime(backup_path)
            if (time.time() - mtime) > 30 * 86400: # 30 days threshold
                try:
                    os.remove(backup_path)
                except Exception:
                    pass

        # Load all active messages for this project
        query = text("""
            SELECT sender_code, sender_name, encrypted_text, created_at
            FROM workspace_chat_messages
            WHERE team_code = :code
            ORDER BY created_at ASC
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        
        backup_data = []
        for r in rows:
            backup_data.append({
                "sender_code": r[0],
                "sender_name": r[1],
                "encrypted_text": r[2],
                "created_at": r[3].strftime("%Y-%m-%d %H:%M:%S") if r[3] else ""
            })

        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=4)

        return jsonify({"status": "success", "message": "Encrypted message saved and synchronized to cloud backup."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/implementation', methods=['GET'])
def get_workspace_implementations():
    """Fetches uploaded project implementation details."""
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    try:
        query = text("""
            SELECT i.id, i.image_url, i.title, i.category, i.created_at, u.first_name, u.last_name,
                   i.grade_score, i.grading_feedback, i.graded_at, gr.first_name, gr.last_name
            FROM workspace_implementations i
            LEFT JOIN users u ON i.uploaded_by = u.user_code
            LEFT JOIN users gr ON i.graded_by = gr.user_code
            WHERE i.team_code = :code
            ORDER BY i.created_at DESC
        """)
        rows = db.session.execute(query, {"code": team_code}).fetchall()
        implementations = []
        for r in rows:
            implementations.append({
                "id": int(r[0]),
                "url": r[1],
                "title": r[2],
                "category": r[3] or "General",
                "created_at": r[4].strftime("%Y-%m-%d %H:%M:%S") if r[4] else "",
                "uploaded_by_name": f"{r[5]} {r[6]}".strip() if r[5] else "Unknown",
                "grade_score": r[7] if r[7] is not None else None,
                "grading_feedback": r[8] or "",
                "graded_at": r[9].strftime("%Y-%m-%d %H:%M:%S") if r[9] else "",
                "graded_by_name": f"{r[10]} {r[11]}".strip() if r[10] else ""
            })
        return jsonify({"implementations": implementations}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/implementation/upload', methods=['POST'])
def upload_workspace_implementation():
    """Allows uploading project implementation gallery showcase screenshots."""
    import uuid
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request."}), 400
        
    file = request.files['file']
    team_code = request.form.get('team_code')
    title = request.form.get('title')
    category = request.form.get('category', 'General')
    email = request.form.get('email')
    
    if not team_code or not email or not title or file.filename == '':
        return jsonify({"error": "Missing required upload parameters."}), 400
        
    try:
        # Save image securely with prefix to keep in direct uploads folder
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"impl_{uuid.uuid4().hex}{file_ext}"
        
        upload_folder_base = os.path.abspath("D:/TeamBridge_Workspaces/uploaded_documents")
        team_upload_dir = os.path.join(upload_folder_base, team_code)
        os.makedirs(team_upload_dir, exist_ok=True)
        
        file_path = os.path.join(team_upload_dir, unique_filename)
        file.save(file_path)
        
        image_url = f"http://localhost:5000/api/workspace/uploaded-file?team_code={team_code}&filename={unique_filename}"
        
        # Resolve user_code
        user = db.session.execute(
            text("SELECT user_code FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        if not user:
            return jsonify({"error": "User not found."}), 404
        user_code = user[0]
        
        # Insert implementation details into DB
        db.session.execute(
            text("""
                INSERT INTO workspace_implementations (team_code, image_url, title, category, uploaded_by, created_at)
                VALUES (:team_code, :image_url, :title, :category, :user_code, NOW())
            """),
            {
                "team_code": team_code,
                "image_url": image_url,
                "title": title,
                "category": category,
                "user_code": user_code
            }
        )
        log_workspace_activity(team_code, email, f"Uploaded Implementation Showcase: '{title}'")
        db.session.commit()
        
        return jsonify({"status": "success", "message": "Implementation showcase screenshot uploaded successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/comments', methods=['GET'])
def get_workspace_code_comments():
    """Fetches line-by-line review comments inside workspace files."""
    team_code = request.args.get('team_code')
    file_path = request.args.get('file_path')
    if not team_code or not file_path:
        return jsonify({"error": "Missing team_code or file_path parameter."}), 400
    try:
        query = text("""
            SELECT id, line_number, comment_text, created_by, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
            FROM workspace_code_comments
            WHERE team_code = :team_code AND file_path = :file_path
            ORDER BY line_number ASC, created_at ASC
        """)
        rows = db.session.execute(query, {"team_code": team_code, "file_path": file_path}).fetchall()
        comments = []
        for r in rows:
            comments.append({
                "id": int(r[0]),
                "line_number": int(r[1]),
                "text": r[2],
                "created_by": r[3],
                "created_at": r[4]
            })
        return jsonify({"comments": comments}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/comments', methods=['POST'])
def add_workspace_code_comment():
    """Creates a new code review comment inside workspace files."""
    data = request.json or {}
    team_code = data.get('team_code')
    file_path = data.get('file_path')
    line_number = data.get('line_number')
    comment_text = data.get('comment_text')
    email = data.get('email')
    
    if not team_code or not file_path or line_number is None or not comment_text or not email:
        return jsonify({"error": "Missing required comment parameters."}), 400
        
    try:
        db.session.execute(
            text("""
                INSERT INTO workspace_code_comments (team_code, file_path, line_number, comment_text, created_by, created_at)
                VALUES (:team_code, :file_path, :line_number, :comment_text, :created_by, NOW())
            """),
            {
                "team_code": team_code,
                "file_path": file_path,
                "line_number": int(line_number),
                "comment_text": comment_text,
                "created_by": email
            }
        )
        db.session.commit()
        
        # Emit real-time notification to update code comments on active client IDEs
        try:
            socketio.emit('comment_added', {
                "file_path": file_path,
                "line_number": int(line_number)
            }, to=f"chat_{team_code}")
        except Exception:
            pass
            
        return jsonify({"status": "success", "message": "Code review comment added successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/implementation/grade', methods=['POST'])
def grade_workspace_implementation():
    """Allows faculty guides to grade milestone uploads."""
    data = request.json or {}
    implementation_id = data.get('implementation_id')
    grade_score = data.get('grade_score')
    grading_feedback = data.get('grading_feedback', '')
    email = data.get('email')
    
    if not implementation_id or grade_score is None or not email:
        return jsonify({"error": "Missing required grading parameters."}), 400
        
    try:
        # Verify grader role is supervisor
        grader = db.session.execute(
            text("SELECT user_code, role FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        
        if not grader or grader[1].lower() not in ['faculty', 'mentor']:
            return jsonify({"error": "Unauthorized: Only faculty members can grade milestones."}), 403
            
        user_code = grader[0]
        
        db.session.execute(
            text("""
                UPDATE workspace_implementations
                SET grade_score = :grade_score,
                    grading_feedback = :grading_feedback,
                    graded_by = :user_code,
                    graded_at = NOW()
                WHERE id = :id
            """),
            {
                "grade_score": int(grade_score),
                "grading_feedback": grading_feedback,
                "user_code": user_code,
                "id": int(implementation_id)
            }
        )
        db.session.commit()
        return jsonify({"status": "success", "message": "Milestone successfully graded."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/files', methods=['GET'])
@jwt_required()
def get_files_tree():
    """Lists files recursively in D:/TeamBridge_Workspaces/team_{team_code}."""
    user_code = get_jwt_identity()
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
        
    if not check_user_membership(team_code, user_code):
        return jsonify({"error": "Access Denied: You are not authorized for this workspace."}), 403

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    if not os.path.exists(project_dir):
        return jsonify({"files": []}), 200

    try:
        file_list = []
        ignored = {'.git', 'node_modules', '__pycache__', '.teambridge', 'venv', 'env'}
        
        # Load custom ignored folders and profile settings
        profile = "University/Capstone Mode"
        settings_row = db.session.execute(
            text("SELECT preset_profile, ignored_folders FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()
        if settings_row:
            profile = settings_row[0]
            if settings_row[1]:
                ignored.update(f.strip() for f in settings_row[1].split(',') if f.strip())

        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in ignored]
            for file in files:
                # Corporate Mode restrictions
                if profile == "Corporate/R&D Mode":
                    lower_file = file.lower()
                    if lower_file.endswith('.log') or 'keystroke' in lower_file or 'proprietary' in lower_file:
                        continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, project_dir).replace('\\', '/')
                file_list.append(rel_path)
        return jsonify({"files": file_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/file-content', methods=['GET'])
@jwt_required()
def get_file_content():
    """Loads file content from the server filesystem, blocking sensitive files on web."""
    user_code = get_jwt_identity()
    team_code = request.args.get('team_code')
    file_path = request.args.get('path')
    if not team_code or not file_path:
        return jsonify({"error": "Missing parameters."}), 400

    if not check_user_membership(team_code, user_code):
        return jsonify({"error": "Access Denied: You are not authorized for this workspace."}), 403

    clean_path = os.path.normpath(file_path.replace('\\', '/'))
    if clean_path.startswith('..') or os.path.isabs(clean_path):
        return jsonify({"error": "Invalid file path."}), 400

    # Strict Web protection checks
    is_sensitive = (
        clean_path.endswith('.env') or 
        clean_path.endswith('.key') or 
        'secret' in clean_path.lower() or 
        'password' in clean_path.lower() or 
        'credential' in clean_path.lower()
    )
    if is_sensitive:
        return jsonify({"error": "Access Denied: Web reading locked for credentials security."}), 403

    # Load settings to check custom ignored folders and profile restrictions
    try:
        settings_row = db.session.execute(
            text("SELECT preset_profile, ignored_folders FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()
        if settings_row:
            profile = settings_row[0]
            ignored_folders_str = settings_row[1]
            ignored_list = [f.strip() for f in ignored_folders_str.split(',') if f.strip()]
            
            # Check if any ignored folder is a component of clean_path
            path_parts = clean_path.replace('\\', '/').split('/')
            if any(ignored in path_parts for ignored in ignored_list):
                return jsonify({"error": "Access Denied: Path is ignored under active workspace settings."}), 403

            if profile == "Corporate/R&D Mode":
                lower_path = clean_path.lower()
                is_corp_sensitive = (
                    lower_path.endswith('.log') or
                    'log' in path_parts or
                    'keystroke' in lower_path or
                    'proprietary' in lower_path
                )
                if is_corp_sensitive:
                    return jsonify({"error": "Access Denied: Corporate/R&D Mode blocks access to logs and proprietary files."}), 403
    except Exception as e:
        print("Settings check failed in get_file_content:", e)

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    full_path = os.path.join(project_dir, clean_path)

    if not os.path.exists(full_path):
        return jsonify({"error": "File does not exist."}), 404

    try:
        with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        last_modified = os.stat(full_path).st_mtime
        return jsonify({"content": content, "last_modified": last_modified}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/file-content', methods=['POST'])
@jwt_required()
def save_file_content():
    """Saves web editor changes to the server filesystem and notifies other users."""
    user_code = get_jwt_identity()
    data = request.json or {}
    team_code = data.get('team_code')
    file_path = data.get('path')
    content = data.get('content')
    client_last_modified = data.get('last_modified')
    email = data.get('email', 'unknown@teambridge.edu')

    if not team_code or not file_path or content is None:
        return jsonify({"error": "Missing required parameters."}), 400

    if not check_user_membership(team_code, user_code):
        return jsonify({"error": "Access Denied: You are not authorized for this workspace."}), 403

    # Verify write permissions (block faculty guides from writing)
    user_role = db.session.execute(
        text("SELECT role FROM users WHERE user_code = :user_code"),
        {"user_code": user_code}
    ).fetchone()
    if user_role and user_role[0].lower() in ['faculty', 'mentor']:
        return jsonify({"error": "Access Denied: Supervisors have read-only access to this workspace."}), 403

    clean_path = os.path.normpath(file_path.replace('\\', '/'))
    if clean_path.startswith('..') or os.path.isabs(clean_path):
        return jsonify({"error": "Invalid file path."}), 400

    # Strict Web protection checks
    is_sensitive = (
        clean_path.endswith('.env') or 
        clean_path.endswith('.key') or 
        'secret' in clean_path.lower() or 
        'password' in clean_path.lower() or 
        'credential' in clean_path.lower()
    )
    if is_sensitive:
        return jsonify({"error": "Access Denied: Web saving locked for credentials security."}), 403

    # Load settings to check custom ignored folders and profile restrictions
    try:
        settings_row = db.session.execute(
            text("SELECT preset_profile, ignored_folders FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()
        if settings_row:
            profile = settings_row[0]
            ignored_folders_str = settings_row[1]
            ignored_list = [f.strip() for f in ignored_folders_str.split(',') if f.strip()]
            
            # Check if any ignored folder is a component of clean_path
            path_parts = clean_path.replace('\\', '/').split('/')
            if any(ignored in path_parts for ignored in ignored_list):
                return jsonify({"error": "Access Denied: Path is ignored under active workspace settings."}), 403

            if profile == "Corporate/R&D Mode":
                lower_path = clean_path.lower()
                is_corp_sensitive = (
                    lower_path.endswith('.log') or
                    'log' in path_parts or
                    'keystroke' in lower_path or
                    'proprietary' in lower_path
                )
                if is_corp_sensitive:
                    return jsonify({"error": "Access Denied: Corporate/R&D Mode blocks saving logs and proprietary files."}), 403
    except Exception as e:
        print("Settings check failed in save_file_content:", e)

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    full_path = os.path.join(project_dir, clean_path)

    # Overwrite collision check
    if os.path.exists(full_path) and client_last_modified is not None:
        server_last_modified = os.stat(full_path).st_mtime
        if server_last_modified - float(client_last_modified) > 0.1:
            return jsonify({
                "status": "conflict",
                "message": "Write Conflict: This file has been modified by another teammate since you loaded it. Please backup your changes, reload, and merge."
            }), 409

    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        new_last_modified = os.stat(full_path).st_mtime

        # Log workspace activity in database
        db.session.execute(
            text("""
                INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                VALUES (:team, :user, :file, 1, 10)
            """),
            {
                "team": team_code,
                "user": email,
                "file": clean_path.replace('\\', '/')
            }
        )
        db.session.commit()

        # Emit Socket.IO event to update other clients
        try:
            socketio.emit('file_updated', {
                "team_code": team_code,
                "file_path": clean_path.replace('\\', '/'),
                "updated_by": email
            }, to=f"chat_{team_code}")
        except Exception:
            pass

        return jsonify({
            "status": "success",
            "message": "File saved successfully.",
            "last_modified": new_last_modified
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/file-content', methods=['DELETE'])
@jwt_required()
def delete_file():
    """Deletes a file from the server workspace filesystem."""
    user_code = get_jwt_identity()
    team_code = request.args.get('team_code')
    file_path = request.args.get('path')
    email = request.args.get('email', 'unknown@teambridge.edu')

    if not team_code or not file_path:
        return jsonify({"error": "Missing parameters."}), 400

    if not check_user_membership(team_code, user_code):
        return jsonify({"error": "Access Denied: You are not authorized for this workspace."}), 403

    # Verify write permissions (block faculty guides from deleting)
    user_role = db.session.execute(
        text("SELECT role FROM users WHERE user_code = :user_code"),
        {"user_code": user_code}
    ).fetchone()
    if user_role and user_role[0].lower() in ['faculty', 'mentor']:
        return jsonify({"error": "Access Denied: Supervisors have read-only access to this workspace."}), 403

    clean_path = os.path.normpath(file_path.replace('\\', '/'))
    if clean_path.startswith('..') or os.path.isabs(clean_path):
        return jsonify({"error": "Invalid file path."}), 400

    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    full_path = os.path.join(project_dir, clean_path)

    if not os.path.exists(full_path):
        return jsonify({"error": "File does not exist."}), 404

    try:
        if os.path.isdir(full_path):
            import shutil
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)

        # Log workspace activity in database
        db.session.execute(
            text("""
                INSERT INTO activity_heartbeats (team_code, user_id, focused_file, keystrokes_count, active_seconds)
                VALUES (:team, :user, :file, 0, 0)
            """),
            {
                "team": team_code,
                "user": email,
                "file": "Deleted file: " + clean_path.replace('\\', '/')
            }
        )
        db.session.commit()

        # Emit delete notification
        try:
            socketio.emit('file_updated', {
                "team_code": team_code,
                "file_path": clean_path.replace('\\', '/'),
                "deleted": True,
                "updated_by": email
            }, to=f"chat_{team_code}")
        except Exception:
            pass

        return jsonify({"status": "success", "message": "File deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/settings', methods=['GET'])
def get_workspace_settings():
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400

    try:
        row = db.session.execute(
            text("SELECT preset_profile, max_file_size_mb, allowed_extensions, ignored_folders FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if not row:
            # Create default settings row
            default_profile = "University/Capstone Mode"
            default_max_size = 2.0
            default_exts = ".py,.js,.jsx,.ts,.tsx,.css,.html,.json,.md,.txt,.config,.docx,.doc,.pdf"
            default_ignored = ".git,node_modules,__pycache__,.teambridge,venv,env"
            
            db.session.execute(
                text("""
                    INSERT INTO workspace_settings (team_code, preset_profile, max_file_size_mb, allowed_extensions, ignored_folders)
                    VALUES (:code, :profile, :max_size, :exts, :ignored)
                """),
                {
                    "code": team_code,
                    "profile": default_profile,
                    "max_size": default_max_size,
                    "exts": default_exts,
                    "ignored": default_ignored
                }
            )
            db.session.commit()
            
            return jsonify({
                "status": "success",
                "settings": {
                    "team_code": team_code,
                    "preset_profile": default_profile,
                    "max_file_size_mb": default_max_size,
                    "allowed_extensions": default_exts,
                    "ignored_folders": default_ignored
                }
            }), 200

        return jsonify({
            "status": "success",
            "settings": {
                "team_code": team_code,
                "preset_profile": row[0],
                "max_file_size_mb": float(row[1]),
                "allowed_extensions": row[2],
                "ignored_folders": row[3]
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/settings', methods=['POST'])
def save_workspace_settings():
    data = request.json or {}
    team_code = data.get('team_code')
    user_email = data.get('user_email')
    
    if not team_code or not user_email:
        return jsonify({"error": "Missing team_code or user_email."}), 400

    try:
        # Check permissions: user must be Leader or Faculty for this team code
        team = db.session.execute(
            text("SELECT leader_code, faculty_code FROM teams WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if not team:
            return jsonify({"error": "Team workspace not found."}), 404

        leader_code, faculty_code = team

        user = db.session.execute(
            text("SELECT user_code FROM users WHERE email = :email"),
            {"email": user_email}
        ).fetchone()

        if not user:
            return jsonify({"error": "User profile not found."}), 404

        user_code = user[0]

        if user_code != leader_code and user_code != faculty_code:
            return jsonify({"error": "Access Denied: Only Team Leaders or Faculty can modify workspace sync settings."}), 403

        # Update or Insert settings
        preset_profile = data.get('preset_profile', 'University/Capstone Mode')
        max_file_size_mb = float(data.get('max_file_size_mb', 2.0))
        allowed_extensions = data.get('allowed_extensions', '')
        ignored_folders = data.get('ignored_folders', '')

        # Check if row exists
        row = db.session.execute(
            text("SELECT team_code FROM workspace_settings WHERE team_code = :code"),
            {"code": team_code}
        ).fetchone()

        if row:
            db.session.execute(
                text("""
                    UPDATE workspace_settings 
                    SET preset_profile = :profile, max_file_size_mb = :max_size, 
                        allowed_extensions = :exts, ignored_folders = :ignored
                    WHERE team_code = :code
                """),
                {
                    "code": team_code,
                    "profile": preset_profile,
                    "max_size": max_file_size_mb,
                    "exts": allowed_extensions,
                    "ignored": ignored_folders
                }
            )
        else:
            db.session.execute(
                text("""
                    INSERT INTO workspace_settings (team_code, preset_profile, max_file_size_mb, allowed_extensions, ignored_folders)
                    VALUES (:code, :profile, :max_size, :exts, :ignored)
                """),
                {
                    "code": team_code,
                    "profile": preset_profile,
                    "max_size": max_file_size_mb,
                    "exts": allowed_extensions,
                    "ignored": ignored_folders
                }
            )
        db.session.commit()

        return jsonify({"status": "success", "message": "Workspace settings saved successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/git/diff', methods=['GET'])
def get_git_diff():
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code parameter."}), 400
    
    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    if not os.path.exists(project_dir):
        return jsonify({"error": "Workspace directory not initialized."}), 404
        
    try:
        import subprocess
        git_dir = os.path.join(project_dir, ".git")
        if not os.path.exists(git_dir):
            subprocess.run(["git", "init"], cwd=project_dir, capture_output=True, check=True)
            subprocess.run(["git", "config", "user.name", "TeamBridge User"], cwd=project_dir, capture_output=True, check=True)
            subprocess.run(["git", "config", "user.email", "developer@teambridge.io"], cwd=project_dir, capture_output=True, check=True)
            subprocess.run(["git", "add", "."], cwd=project_dir, capture_output=True, check=True)
            subprocess.run(["git", "commit", "-m", "Initial Scaffolding"], cwd=project_dir, capture_output=True, check=True)
            
        diff_res = subprocess.run(["git", "diff", "HEAD"], cwd=project_dir, capture_output=True, text=True)
        diff_text = diff_res.stdout
        
        status_res = subprocess.run(["git", "status", "-s"], cwd=project_dir, capture_output=True, text=True)
        status_text = status_res.stdout
        
        untracked = []
        for line in status_text.splitlines():
            if line.startswith("??"):
                untracked.append(line[3:])
                
        return jsonify({
            "status": "success",
            "diff": diff_text or "No uncommitted changes in workspace.",
            "untracked": untracked
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/git/commit', methods=['POST'])
def commit_git_changes():
    data = request.json or {}
    team_code = data.get('team_code')
    message = data.get('message')
    email = data.get('email', 'unknown@teambridge.edu')
    
    if not team_code or not message:
        return jsonify({"error": "Missing team_code or commit message."}), 400
        
    project_dir = os.path.join(STORAGE_BASE_DIR, f"team_{team_code}")
    if not os.path.exists(project_dir):
        return jsonify({"error": "Workspace directory not initialized."}), 404
        
    try:
        import subprocess
        git_dir = os.path.join(project_dir, ".git")
        if not os.path.exists(git_dir):
            subprocess.run(["git", "init"], cwd=project_dir, capture_output=True, check=True)
            subprocess.run(["git", "config", "user.name", "TeamBridge User"], cwd=project_dir, capture_output=True, check=True)
            subprocess.run(["git", "config", "user.email", "developer@teambridge.io"], cwd=project_dir, capture_output=True, check=True)

        status_res = subprocess.run(["git", "status", "--porcelain"], cwd=project_dir, capture_output=True, text=True)
        if not status_res.stdout.strip():
            return jsonify({
                "status": "success",
                "message": "No changes to commit, directory is clean."
            }), 200

        subprocess.run(["git", "add", "-A"], cwd=project_dir, capture_output=True, check=True)
        
        commit_res = subprocess.run(
            ["git", "commit", "-m", f"{message} (by {email})"],
            cwd=project_dir,
            capture_output=True,
            text=True
        )
        
        log_workspace_activity(team_code, email, f"Git Commit: '{message}'")
        
        return jsonify({
            "status": "success",
            "message": "Commit created successfully.",
            "git_output": commit_res.stdout
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/board-columns', methods=['GET'])
def get_board_columns():
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code."}), 400
    try:
        rows = db.session.execute(
            text("SELECT column_name FROM workspace_board_columns WHERE team_code = :code ORDER BY position ASC"),
            {"code": team_code}
        ).fetchall()
        if not rows:
            return jsonify({"columns": ['To Do', 'In Progress', 'Done']}), 200
        return jsonify({"columns": [r[0] for r in rows]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workspace_bp.route('/board-columns', methods=['POST'])
def save_board_columns():
    data = request.json or {}
    team_code = data.get('team_code')
    columns = data.get('columns', [])
    if not team_code:
        return jsonify({"error": "Missing team_code."}), 400
    try:
        # Delete existing columns
        db.session.execute(
            text("DELETE FROM workspace_board_columns WHERE team_code = :code"),
            {"code": team_code}
        )
        # Insert new columns
        for idx, col in enumerate(columns):
            db.session.execute(
                text("INSERT INTO workspace_board_columns (team_code, column_name, position) VALUES (:code, :name, :pos)"),
                {"code": team_code, "name": col, "pos": idx}
            )
        db.session.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/presentations', methods=['GET'])
def get_presentations():
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code."}), 400
    try:
        presentations = WorkspacePresentation.query.filter_by(team_code=team_code).all()
        return jsonify({
            "presentations": [
                {
                    "id": p.id,
                    "team_code": p.team_code,
                    "presentation_name": p.presentation_name,
                    "markdown_content": p.markdown_content,
                    "created_by": p.created_by,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None
                } for p in presentations
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/presentations', methods=['POST'])
def save_presentation():
    data = request.json or {}
    team_code = data.get('team_code')
    presentation_name = data.get('presentation_name')
    markdown_content = data.get('markdown_content')
    email = data.get('email', 'student@teambridge.edu')
    
    if not team_code or not presentation_name:
        return jsonify({"error": "Missing required fields (team_code, presentation_name)."}), 400
        
    try:
        presentation = WorkspacePresentation.query.filter_by(
            team_code=team_code, presentation_name=presentation_name
        ).first()
        
        if presentation:
            presentation.markdown_content = markdown_content
            presentation.updated_at = datetime.utcnow()
        else:
            presentation = WorkspacePresentation(
                team_code=team_code,
                presentation_name=presentation_name,
                markdown_content=markdown_content,
                created_by=email
            )
            db.session.add(presentation)
            
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Presentation saved successfully.",
            "presentation": {
                "id": presentation.id,
                "presentation_name": presentation.presentation_name,
                "markdown_content": presentation.markdown_content
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/documents/sync', methods=['POST'])
def sync_document():
    data = request.json or {}
    team_code = data.get('team_code')
    document_name = data.get('document_name')
    content_buffer = data.get('content_buffer')
    file_path = data.get('file_path')
    email = data.get('email', 'student@teambridge.edu')
    
    if not team_code or not document_name:
        return jsonify({"error": "Missing required fields (team_code, document_name)."}), 400
        
    try:
        doc = WorkspaceDocument.query.filter_by(
            team_code=team_code, document_name=document_name
        ).first()
        
        if doc:
            doc.content_buffer = content_buffer
            doc.last_modified_at = datetime.utcnow()
            if file_path:
                doc.file_path = file_path
        else:
            doc = WorkspaceDocument(
                team_code=team_code,
                document_name=document_name,
                document_url="",
                uploaded_by=email,
                file_path=file_path,
                content_buffer=content_buffer,
                version_string='1.0',
                owner_code=email.split('@')[0]
            )
            db.session.add(doc)
            
        db.session.commit()
        
        socketio.emit('document_update', {
            "team_code": team_code,
            "document_name": document_name,
            "content_buffer": content_buffer,
            "updated_by": email
        }, room=f"chat_{team_code}")
        
        return jsonify({
            "status": "success",
            "message": "Document synced successfully.",
            "document": {
                "id": doc.id,
                "document_name": doc.document_name,
                "content_buffer": doc.content_buffer
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@workspace_bp.route('/documents/download', methods=['GET'])
def download_workspace_document():
    team_code = request.args.get('team_code')
    file_path = request.args.get('path')
    if not team_code or not file_path:
        return jsonify({"error": "Missing team_code or path parameter."}), 400
        
    clean_path = os.path.normpath(file_path.replace('\\', '/'))
    if clean_path.startswith('..') or os.path.isabs(clean_path):
        return jsonify({"error": "Invalid file path."}), 400
        
    project_dir = os.path.join("D:/TeamBridge_Workspaces", f"team_{team_code}")
    full_path = os.path.join(project_dir, clean_path)
    
    canonical_proj = os.path.realpath(project_dir)
    canonical_dest = os.path.realpath(full_path)
    try:
        if os.path.commonpath([canonical_proj, canonical_dest]) != canonical_proj:
            return jsonify({"error": "Path traversal blocked."}), 403
    except ValueError:
        return jsonify({"error": "Invalid path resolution."}), 403
        
    if not os.path.exists(full_path):
        return jsonify({"error": "File not found."}), 404
        
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)
    return send_from_directory(directory, filename, as_attachment=True)


@workspace_bp.route('/system-requests', methods=['POST'])
def create_system_request():
    data = request.json or {}
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')
    priority = data.get('priority', 'Normal')
    
    if not email or not subject or not message:
        return jsonify({"error": "Missing required fields (email, subject, message)."}), 400
        
    try:
        req = SystemRequest(
            email=email,
            subject=subject,
            message=message,
            priority=priority
        )
        db.session.add(req)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "System request submitted successfully.",
            "request_id": req.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

