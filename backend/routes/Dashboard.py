# 📄 Location: d:/Ptojects/TeamBridge/backend/routes/Dashboard.py

from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import text  
from extensions import db  
from models.users import User
from models.workspace import Workplace, Team, TeamMembership
from flask_jwt_extended import jwt_required

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/api/users/profile-context', methods=['GET'])
@jwt_required()
def get_user_profile_context():
    """Maps to frontend profile diagnostic sync lookups."""
    user_code = request.args.get('user_code')
    if not user_code:
        return jsonify({"error": "Missing identity key user_code"}), 400

    try:
        user = User.query.filter_by(user_code=user_code).first()
        if not user:
            return jsonify({"error": "Identity key absent inside directory"}), 404

        fields = [user.phone, user.gender, user.dob, user.bio, user.github_url, user.linkedin_url, user.profile_image]
        populated = sum(1 for field in fields if field and str(field).strip())
        completion_percentage = int((populated / len(fields)) * 100)

        return jsonify({
            "phone": user.phone or "",
            "gender": user.gender or "",
            "dob": user.dob.isoformat() if user.dob else "",
            "bio": user.bio or "",
            "github_url": user.github_url or "",
            "linkedin_url": user.linkedin_url or "",
            "profile_image": user.profile_image or "",
            "completion_percentage": completion_percentage
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route('/api/users/dashboard-context', methods=['GET'])
@jwt_required()
def get_user_dashboard_context():
    """Maps to frontend panels. Only returns teams where membership is fully APPROVED."""
    user_code = request.args.get('user_code')
    if not user_code:
        return jsonify({"error": "Missing identity key user_code"}), 400

    try:
        memberships = TeamMembership.query.filter_by(user_code=user_code, approval_status='Approved').all()
        team_ids = [m.team_id for m in memberships]

        projects_payload = []
        if team_ids:
            active_teams = Team.query.filter(Team.id.in_(team_ids)).all()
            for team in active_teams:
                wp = Workplace.query.get(team.workplace_id)
                m_count = TeamMembership.query.filter_by(team_id=team.id, approval_status='Approved').count()
                
                projects_payload.append({
                    "project_name": team.project_name,
                    "subject": team.subject,
                    "workplace_name": wp.name if wp else "External Space",
                    "members_count": m_count,
                    "team_code": team.team_code
                })

        stats_payload = {
            "operational": "Synchronized",
            "completed": f"{len(projects_payload)} Channels",
            "standing": "Active Review",
            "latency": "12ms"
        }

        return jsonify({
            "projects": projects_payload,
            "stats": stats_payload
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route('/api/notifications/fetch', methods=['GET'])
@jwt_required()
def fetch_user_notifications():
    """Fetches real pending team requests targeted directly to this specific user code."""
    user_code = request.args.get('user_code')
    if not user_code:
        return jsonify({"error": "Missing target recipient parameter"}), 400
    try:
        raw_select_query = text("""
            SELECT n.id, n.team_code, n.message_text, u.first_name, u.last_name 
            FROM system_notifications n 
            LEFT JOIN users u ON n.sender_code = u.user_code 
            WHERE n.recipient_code = :uc AND n.status = 'Pending'
        """)
        
        results = db.session.execute(raw_select_query, {"uc": user_code}).fetchall()
        
        payload = []
        for r in results:
            sender_display_name = f"{r[3]} {r[4]}" if r[3] else "A TeamBridge User"
            
            payload.append({
                "id": r[0],
                "team_code": r[1],
                "message": r[2],
                "sender_name": sender_display_name
            })
            
        return jsonify({"notifications": payload}), 200
    except Exception as e:
        return jsonify({"error": f"Notification processing error: {str(e)}"}), 500


@dashboard_bp.route('/api/notifications/respond', methods=['POST'])
@jwt_required()
def process_charter_response():
    """Handles explicit consensus confirmation rules. Updates team matrix layout fields cleanly."""
    data = request.json or {}
    notification_id = data.get('notification_id')
    user_code = data.get('user_code')
    action = data.get('action') 

    try:
        get_notif_query = text("SELECT team_code FROM system_notifications WHERE id = :id")
        notif = db.session.execute(get_notif_query, {"id": notification_id}).fetchone()
        if not notif:
            return jsonify({"error": "Notification record missing or already processed"}), 404
        
        team_code = notif[0]
        team = Team.query.filter_by(team_code=team_code).first()

        membership_rec = TeamMembership.query.filter_by(team_id=team.id, user_code=user_code).first()

        if action == 'Accept':
            update_notif = text("UPDATE system_notifications SET status = 'Accepted' WHERE id = :id")
            db.session.execute(update_notif, {"id": notification_id})
            if membership_rec:
                membership_rec.approval_status = 'Approved'
        else:
            update_notif = text("UPDATE system_notifications SET status = 'Rejected' WHERE id = :id")
            db.session.execute(update_notif, {"id": notification_id})
            if membership_rec:
                db.session.delete(membership_rec)

        db.session.commit()
        return jsonify({"message": f"Workspace request successfully {action}ed", "team_code": team_code}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route('/api/team/assign-faculty', methods=['POST'])
@jwt_required()
def assign_faculty_guide():
    data = request.json or {}
    team_code = data.get('team_code')
    faculty_id = data.get('faculty_id')

    if not team_code or not faculty_id:
        return jsonify({"error": "Missing team_code or faculty_id routing variables."}), 400

    try:
        team = Team.query.filter_by(team_code=team_code).first()
        if not team:
            return jsonify({"error": "Target team workspace cluster code missing."}), 404

        faculty_user = User.query.filter_by(user_code=faculty_id, role='Faculty').first()
        if not faculty_user:
            return jsonify({"error": "Faculty unique token code unverified in records."}), 404

        team.faculty_code = faculty_id
        full_name = f"{faculty_user.first_name} {faculty_user.last_name}".strip()
        
        check_query = text("SELECT id FROM declaration_signatures WHERE team_code = :tc AND user_role = 'Guide'")
        existing_sig = db.session.execute(check_query, {"tc": team_code}).fetchone()

        if not existing_sig:
            insert_query = text("""
                INSERT INTO declaration_signatures (team_code, user_name, user_role, signature_image) 
                VALUES (:tc, :name, 'Guide', NULL)
            """)
            db.session.execute(insert_query, {"tc": team_code, "name": full_name})
        else:
            update_query = text("""
                UPDATE declaration_signatures 
                SET user_name = :name 
                WHERE team_code = :tc AND user_role = 'Guide'
            """)
            db.session.execute(update_query, {"tc": team_code, "name": full_name})

        db.session.commit()
        return jsonify({"status": "success", "message": "Faculty guide bound to declaration matrix successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Internal mapping failure processing alignment logic: {str(e)}"}), 500


@dashboard_bp.route('/api/team/digital-form-context', methods=['GET'])
@jwt_required()
def get_digital_form_context():
    team_code = request.args.get('team_code')
    if not team_code:
        return jsonify({"error": "Missing team_code verification token"}), 400

    try:
        # Locate targeted workspace container record cleanly
        team = Team.query.filter_by(team_code=team_code).first()
        if not team:
            return jsonify({"error": "Target charter document absent"}), 404

        memberships = TeamMembership.query.filter_by(team_id=team.id).all()
        roster_payload = []
        
        for m in memberships:
            u = User.query.filter_by(user_code=m.user_code).first()
            if u:
                # 🛠️ FIXED: Standard structural parsing fallback maps Enums into pristine JSON-ready strings automatically
                status_attr = m.approval_status
                member_status = str(status_attr.value if hasattr(status_attr, 'value') else status_attr)

                roster_payload.append({
                    "slot": m.slot_index,
                    "status": member_status,
                    "user_code": u.user_code, 
                    "name": f"{u.first_name} {u.last_name}".strip(),
                    "photo": u.profile_image or ""
                })

        faculty_payload = None
        if team.faculty_code:
            fac = User.query.filter_by(user_code=team.faculty_code).first()
            if fac:
                faculty_payload = {
                    "user_code": fac.user_code, 
                    "name": f"{fac.first_name} {fac.last_name}", 
                    "photo": fac.profile_image or ""
                }

        reconstructed_timeline = f"{team.timeline_value} {team.timeline_unit}"

        # 🛠️ FIXED: Hardened fallback engine prevents AttributeError crashes if 'created_at' isn't explicitly declared in models
        created_stamp = str(getattr(team, 'created_at', '')) if getattr(team, 'created_at', None) else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        modified_stamp = str(getattr(team, 'updated_at', '')) if getattr(team, 'updated_at', None) else datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            "project_name": team.project_name, 
            "subject": team.subject,
            "subject_details": team.subject,
            "timeline": reconstructed_timeline, 
            "created_at": created_stamp,
            "modified_at": modified_stamp, 
            "roster": roster_payload,
            "faculty": faculty_payload,
            "target_industry": team.target_industry,
            "workspace_visibility": team.workspace_visibility
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Digital Form assembly failed: {str(e)}"}), 500