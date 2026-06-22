from flask import Blueprint, request, jsonify
from flask_socketio import emit, join_room
from extensions import db, socketio  
from sqlalchemy import text         
from datetime import datetime
from models.workspace import Team, TeamMembership
from models.users import User
from flask_jwt_extended import jwt_required

declaration_bp = Blueprint('declaration', __name__)

@socketio.on('join_declaration')
def handle_join_declaration_room(data):
    """Binds users directly into a localized socket track based on their team_code room."""
    room = data.get('team_code')
    if room:
        join_room(room)

@declaration_bp.route('/api/declaration/<team_code>', methods=['GET'])
@jwt_required()
def get_declaration_status_matrix(team_code):
    """Retrieves document data and auto-initializes rows to perfectly avoid frontend 404 breaks."""
    try:
        team_rec = Team.query.filter_by(team_code=team_code).first()
        if not team_rec:
            return jsonify({"status": "error", "message": "Invalid team routing code context"}), 404

        # Verify primary document container presence
        doc_query = text("SELECT * FROM project_declarations WHERE team_code = :team_code")
        doc_result = db.session.execute(doc_query, {"team_code": team_code}).mappings().first()
        
        # 🛠️ FIXED: Aligned with your custom schema structure inserting 'subject_details' and using integer flags (0) for tinyint
        if not doc_result:
            insert_doc = text("""
                INSERT INTO project_declarations (team_code, project_name, subject_details, is_fully_declared, created_at) 
                VALUES (:tc, :pn, :sd, 0, NOW())
            """)
            db.session.execute(insert_doc, {
                "tc": team_code,
                "pn": team_rec.project_name,
                "sd": team_rec.subject
            })
            db.session.commit()
            
            doc_result = db.session.execute(doc_query, {"team_code": team_code}).mappings().first()
            
        doc = dict(doc_result)
        
        # Convert date timestamps to clean string serializations for the response payload
        if doc.get('created_at'):
            doc['created_at'] = str(doc['created_at'])
        if doc.get('declared_date'):
            doc['declared_date'] = str(doc['declared_date'])

        # Auto-align signature slots matching approved project rosters dynamically
        members = TeamMembership.query.filter_by(team_id=team_rec.id, approval_status='Approved').all()
        
        for m in members:
            u = User.query.filter_by(user_code=m.user_code).first()
            if u:
                full_name = f"{u.first_name} {u.last_name}".strip()
                role_label = "Guide" if u.role == 'faculty' else u.role.capitalize()
                
                check_sig = text("SELECT id FROM declaration_signatures WHERE team_code = :tc AND user_name = :name")
                exists = db.session.execute(check_sig, {"tc": team_code, "name": full_name}).fetchone()
                
                if not exists:
                    insert_sig = text("""
                        INSERT INTO declaration_signatures (team_code, user_name, user_role, signature_image) 
                        VALUES (:tc, :name, :role, NULL)
                    """)
                    db.session.execute(insert_sig, {"tc": team_code, "name": full_name, "role": role_label})
        db.session.commit()

        # Collate associated signature records safely
        sig_query = text("""
            SELECT user_name, user_role, signature_image, DATE_FORMAT(signed_at, '%%Y-%%m-%%d %%H:%%M:%%S') as signed_at 
            FROM declaration_signatures 
            WHERE team_code = :team_code
        """)
        sig_results = db.session.execute(sig_query, {"team_code": team_code}).mappings().all()
        signatures = [dict(row) for row in sig_results]
        
        return jsonify({"document": doc, "signatures": signatures}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@declaration_bp.route('/api/declaration/sign', methods=['POST'])
@jwt_required()
def process_signatory_submission():
    """Validates an incoming Canvas Base64 signature and emits socket events to teammates."""
    data = request.json
    team_code = data.get('team_code')
    user_name = data.get('user_name')
    signature_data = data.get('signature_base64')
    
    now = datetime.now()
    
    try:
        query = text("""
            UPDATE declaration_signatures 
            SET signature_image = :signature_image, signed_at = :signed_at 
            WHERE team_code = :team_code AND user_name = :user_name
        """)
        db.session.execute(query, {
            "signature_image": signature_data,
            "signed_at": now,
            "team_code": team_code,
            "user_name": user_name
        })
        
        socketio.emit('signature_updated', {
            'user_name': user_name,
            'signature_image': signature_data,
            'signed_at': now.strftime('%Y-%m-%d %H:%M:%S')
        }, room=team_code)
        
        check_query = text("SELECT COUNT(*) as pending FROM declaration_signatures WHERE team_code = :team_code AND signature_image IS NULL")
        check = db.session.execute(check_query, {"team_code": team_code}).mappings().first()
        
        if check and check['pending'] == 0:
            # 🛠️ FIXED: Writes integer flag (1) instead of boolean to comply with tinyint(1) expectations
            update_query = text("""
                UPDATE project_declarations 
                SET is_fully_declared = 1, declared_date = :declared_date 
                WHERE team_code = :team_code
            """)
            db.session.execute(update_query, {"declared_date": now, "team_code": team_code})
            
            socketio.emit('declaration_complete', {
                'team_code': team_code,
                'declared_date': now.strftime('%d-%m-%Y')
            }, room=team_code)
            
        db.session.commit()
        return jsonify({"status": "success", "message": "Signatory block checked into framework node cleanly."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@declaration_bp.route('/api/declaration/save-cloud-url', methods=['POST'])
@jwt_required()
def save_cloud_url():
    """Hooks the secure long-term public URL string back into the primary SQL storage container."""
    data = request.json
    team_code = data.get('team_code')
    firebase_url = data.get('firebase_url')
    
    try:
        query = text("""
            UPDATE project_declarations 
            SET firebase_url = :firebase_url 
            WHERE team_code = :team_code
        """)
        db.session.execute(query, {"firebase_url": firebase_url, "team_code": team_code})
        db.session.commit()
        
        return jsonify({"status": "success", "message": "Firebase Storage Cloud link synchronized to MySQL schema matrix."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500