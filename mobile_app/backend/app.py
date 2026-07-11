# 📄 Location: d:/Ptojects/TeamBridge/backend/app.py
#tb_live_55921b18bc0945ad1516d3832975da13a033bd1f5118426a

import os
import time
import traceback
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from extensions import db, socketio, jwt  # Importing global instances from extensions.py

# Import structural router blueprints safely AFTER extensions are ready to be registered
from routes.Register import register_bp
from routes.Login import login_bp
from routes.ForgotPassword import forgot_password_bp
from routes.Dashboard import dashboard_bp 
from routes.createteam import creatteam_bp  
from routes.validation import validation_bp
from routes.declaration import declaration_bp 
from routes.cli import cli_bp  
from routes.workspace.workspace import workspace_bp  
from routes.workspace.controller import workspace_isolated_bp  

def create_app():
    app = Flask(__name__)
    
    # 🌍 DIRECT AIVEN CLOUD MYSQL CONFIGURATION
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 
        'mysql+pymysql://avnadmin:<password>@mysql-fd9436f-candels.h.aivencloud.com:26518/defaultdb'
    ).strip()
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_jwt_secret_signing_key')
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    
    frontend_origins = [
        os.environ.get("FRONTEND_URL", "http://localhost:5173"),
        "https://candels1921.vercel.app",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:19006"
    ]
    
    CORS(app, 
         resources={r"/*": {"origins": frontend_origins}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )
    
    # Initialize unified extensions cleanly inside the application factory context loop
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins=frontend_origins) 
    jwt.init_app(app)      
    
    # Register blueprints onto central routing tree
    app.register_blueprint(register_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(forgot_password_bp)
    app.register_blueprint(dashboard_bp)  
    app.register_blueprint(creatteam_bp)   
    app.register_blueprint(validation_bp)
    app.register_blueprint(declaration_bp) 
    app.register_blueprint(cli_bp)         
    app.register_blueprint(workspace_bp)   
    app.register_blueprint(workspace_isolated_bp, url_prefix='/api/workspace') 
    
    # settings blueprint
    try:
        from routes.settings import settings_bp
        app.register_blueprint(settings_bp)
    except ImportError:
        print("[BOOT] [WARN] Blueprints settings module not found. Skipping entry registration.")
    
    # 🕵️‍♂️ FORENSIC-GRADE AUDITING & EXCEPTION MIDDLEWARE PIPELINE
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("teambridge_forensics")

    @app.before_request
    def record_request_start():
        request.start_time = time.time()
        auth_header = request.headers.get("Authorization")
        logger.info(f"[FORENSICS] Request to {request.path} from {request.remote_addr} | Auth Header: {auth_header}")

    @app.after_request
    def log_request_details(response):
        duration = 0.0
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        logger.info(
            f"[FORENSICS] {ip} - {request.method} {request.path} -> {response.status_code} ({duration:.4f}s)"
        )
        return response

    def _add_cors_headers(response):
        origin = request.headers.get('Origin', '')
        if origin in frontend_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        return response

    @app.errorhandler(500)
    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        if isinstance(e, HTTPException):
            response = jsonify({
                "status": "error",
                "message": e.description,
                "error_type": e.__class__.__name__
            })
            response.status_code = e.code
            return _add_cors_headers(response)

        tb = traceback.format_exc()
        logger.error(
            f"[FATAL_EXCEPTION] Exception on {request.method} {request.path}: {str(e)}\n{tb}"
        )
        response = jsonify({
            "status": "error",
            "message": "Internal infrastructure exception occurred.",
            "error_type": e.__class__.__name__
        })
        response.status_code = 500
        return _add_cors_headers(response)

    @app.route('/')
    def health_check():
        return jsonify({"status": "healthy", "service": "TeamBridge Engine"}), 200

    with app.app_context():
        print("[BOOT] Checking database connectivity...", flush=True)
        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[BOOT] [OK] Database connection SUCCESSFUL", flush=True)
            db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
            host_info = db_uri.split('@')[1] if '@' in db_uri else 'unknown'
            print(f"[BOOT] Connected to: {host_info}", flush=True)
            try:
                db.create_all()
                print("[BOOT] [OK] Database tables verified/created", flush=True)
                try:
                    db.session.execute(text("ALTER TABLE workspace_settings ADD COLUMN git_link VARCHAR(500) NULL"))
                    db.session.commit()
                    print("[BOOT] [OK] Successfully migrated database: added git_link column.", flush=True)
                except Exception:
                    db.session.rollback()
                try:
                    db.session.execute(text("ALTER TABLE workspace_settings ADD COLUMN git_link_2 VARCHAR(500) NULL"))
                    db.session.commit()
                    print("[BOOT] [OK] Successfully migrated database: added git_link_2 column.", flush=True)
                except Exception:
                    db.session.rollback()
            except Exception as schema_err:
                print(f"[BOOT] [WARN] Table creation skipped: {schema_err}", flush=True)
        except Exception as db_err:
            print(f"[BOOT] [FAIL] Database connection FAILED: {db_err}", flush=True)
            print("[BOOT] [WARN] Server starting without database - API routes requiring DB will fail", flush=True)
        
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()
        
    return app

if __name__ == "__main__":
    app = create_app()
    print("TeamBridge Real-Time Engine active on http://0.0.0.0:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)