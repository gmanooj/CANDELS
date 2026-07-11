from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from extensions import db  
from models.users import User
from models.workspace import Team, TeamMembership

validation_bp = Blueprint('validation_bp', __name__)

@validation_bp.route('/api/team/validation-status', methods=['GET'])
@validation_bp.route('/api/team/<int:team_id>/validation-status', methods=['GET'])
@jwt_required(optional=True) # Set to optional to ensure fluid initialization debugging
def get_team_validation_status(team_id=None):
    try:
        # Check if the route called via query parameters (?team_code=...) instead of path ID
        if team_id is None:
            team_code = request.args.get('team_code')
            if not team_code:
                return jsonify({"status": "error", "message": "Missing team validation routing parameters"}), 400
            team = Team.query.filter_by(team_code=team_code).first()
        else:
            team = Team.query.filter_by(id=team_id).first()

        if not team:
            return jsonify({"status": "error", "message": "Team domain space not found"}), 404

        # Get all approved members currently assigned to this team
        memberships = TeamMembership.query.filter_by(
            team_id=team.id, 
            approval_status='Approved'
        ).all()

        # Extract user codes to inspect roles
        user_codes = [m.user_code for m in memberships]

        # Query the User table to see what roles are present in this team setup
        team_users = User.query.filter(User.user_code.in_(user_codes)).all() if user_codes else []

        # Core Structural Validation
        guide_allotted = any(user.role in ['faculty', 'mentor'] for user in team_users)
        student_count = sum(1 for user in team_users if user.role == 'student')
        teammates_allotted = student_count >= 1

        can_proceed_to_declaration = guide_allotted and teammates_allotted

        return jsonify({
            "status": "success",
            "data": {
                "teamCode": team.team_code,
                "projectName": team.project_name,
                "guideAllotted": guide_allotted,
                "teammatesAllotted": teammates_allotted,
                "canProceedToDeclaration": can_proceed_to_declaration,
                "currentDeclarationStatus": team.declaration_status
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@validation_bp.route('/api/team/<int:team_id>/submit-declaration', methods=['POST'])
@jwt_required()
def submit_team_declaration(team_id):
    try:
        team = Team.query.filter_by(id=team_id).first()
        if not team:
            return jsonify({"status": "error", "message": "Team configuration node not found."}), 404
            
        memberships = TeamMembership.query.filter_by(team_id=team_id, approval_status='Approved').all()
        user_codes = [m.user_code for m in memberships]
        team_users = User.query.filter(User.user_code.in_(user_codes)).all() if user_codes else []
        
        guide_allotted = any(user.role in ['faculty', 'mentor'] for user in team_users)
        if not guide_allotted:
            return jsonify({
                "status": "error",
                "message": "Submission rejected: You must allot a Faculty/Guide to your team before signing the declaration."
            }), 400

        if team.declaration_status != 'Pending_Peer_Signatures':
            return jsonify({
                "status": "error", 
                "message": f"Declaration cannot be modified at current status: {team.declaration_status}"
            }), 400

        team.declaration_status = 'Pending_Guide_Approval'
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Team declaration signed. Awaiting Faculty/Guide authentication review.",
            "newStatus": team.declaration_status
        }), 200

    except Exception as e:
        db.session.rollback()  
        return jsonify({"status": "error", "message": str(e)}), 500