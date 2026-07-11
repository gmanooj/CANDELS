import uuid
from flask import Blueprint, request, jsonify
from extensions import db  # 🛠️ FIXED: Routing db through extensions
from models.users import User
from models.workspace import Workplace, Team, TeamMembership
from sqlalchemy import text
from flask_jwt_extended import jwt_required

creatteam_bp = Blueprint('creatteam_bp', __name__)

@creatteam_bp.route('/api/team/initialize', methods=['POST'])
@jwt_required()
def initialize_team_charter():
    data = request.json or {}
    leader_code = data.get('leaderCode')
    project_name = data.get('projectName', '').strip()
    subject = data.get('subject', '').strip()
    workplace_name = data.get('workplaceName', '').strip()
    workplace_type = data.get('workplaceType', 'College')
    max_size = int(data.get('maxSize', 3))
    
    faculty_code = data.get('facultyCode')
    peers_dict = data.get('peers', {})  

    if not all([leader_code, project_name, subject, workplace_name, faculty_code]):
        return jsonify({"error": "Missing essential ecosystem baseline descriptors"}), 400

    try:
        # Fetch the Leader's profile data to compile an explicit guide summary block
        leader_user = User.query.filter_by(user_code=leader_code).first()
        leader_name = f"{leader_user.first_name} {leader_user.last_name}" if leader_user else "Unknown Student"

        # Validate Faculty Guide token identity
        faculty_user = User.query.filter_by(user_code=faculty_code, role='faculty').first()
        if not faculty_user:
            return jsonify({"error": f"Faculty identifier key '{faculty_code}' is unverified in system files."}), 404

        # Check for duplicate project pipelines
        existing_project = Team.query.filter_by(leader_code=leader_code, project_name=project_name).first()
        if existing_project:
            return jsonify({"error": f"An active pipeline named '{project_name}' is already tracking."}), 409

        # Map or instantiate institutional location record data
        workplace = Workplace.query.filter_by(name=workplace_name).first()
        if not workplace:
            workplace = Workplace(name=workplace_name, type=workplace_type, district="Verified", state="Verified")
            db.session.add(workplace)
            db.session.commit()

        team_code = f"TB-TEAM-{uuid.uuid4().hex.upper()[:6]}"
        
        new_team = Team(
            team_code=team_code, 
            project_name=project_name, 
            subject=subject,
            workplace_id=workplace.id, 
            max_team_size=max_size, 
            leader_code=leader_code,
            declaration_status='Pending_Peer_Signatures',  
            timeline_value=int(data.get('timelineValue', 3)),
            timeline_unit=data.get('timelineUnit', 'Months'),
            target_industry=data.get('targetIndustry', 'Technology'),
            workspace_visibility=data.get('workspaceVisibility', 'Public')
        )
        db.session.add(new_team)
        db.session.commit()

        # Add Leader to memberships row tracking array (Slot 1)
        leader_membership = TeamMembership(team_id=new_team.id, user_code=leader_code, slot_index=1, approval_status='Approved')
        db.session.add(leader_membership)

        # Add Faculty Guide to memberships row tracking array (Slot 10)
        guide_membership = TeamMembership(team_id=new_team.id, user_code=faculty_code, slot_index=10, approval_status='Pending')
        db.session.add(guide_membership)

        # Standard insertion query for notification table writes
        raw_notif_query = text("""
            INSERT INTO system_notifications (recipient_code, sender_code, team_code, notification_type, message_text, status) 
            VALUES (:rc, :sc, :tc, :ntype, :msg, 'Pending')
        """)
        
        # 👑 SPECIAL FACULTY SUMMARY LAYOUT STRING (Delimited by pipes for easy parsing)
        faculty_detailed_msg = f"Leader: {leader_name} | Title: {project_name} | Domain: {subject} | Code: {team_code}"
        
        db.session.execute(raw_notif_query, {
            "rc": faculty_code, 
            "sc": leader_code, 
            "tc": team_code,
            "ntype": "Faculty_Request",
            "msg": faculty_detailed_msg
        })

        # Register peer invitation nodes with their basic normal string format
        for slot_str, peer_code in peers_dict.items():
            if not peer_code or not peer_code.strip():
                continue
                
            slot_idx = int(slot_str)
            pending_member = TeamMembership(team_id=new_team.id, user_code=peer_code.strip(), slot_index=slot_idx, approval_status='Pending')
            db.session.add(pending_member)

            peer_msg = f"Invitation to join tracking network core pipeline for: '{project_name}'"
            db.session.execute(raw_notif_query, {
                "rc": peer_code.strip(), 
                "sc": leader_code, 
                "tc": team_code, 
                "ntype": "Peer_Invitation",
                "msg": peer_msg
            })

        db.session.commit()
        return jsonify({"message": "Ecosystem deployed safely", "team_code": team_code}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Transactional pipeline breakdown: {str(e)}"}), 500