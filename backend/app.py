# 📄 Location: d:/Ptojects/TeamBridge/backend/app.py
#tb_live_55921b18bc0945ad1516d3832975da13a033bd1f5118426a


import os
from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, socketio, jwt  # 🛠️ FIXED: Importing clean global instances from extensions.py

# Import structural router blueprints safely AFTER extensions are ready to be registered
from routes.Register import register_bp
from routes.Login import login_bp
from routes.ForgotPassword import forgot_password_bp
from routes.Dashboard import dashboard_bp 
from routes.createteam import creatteam_bp  
from routes.validation import validation_bp
from routes.declaration import declaration_bp 
from routes.cli import cli_bp  # 🚀 ADDED: Importing the CLI operations blueprint
from routes.workspace.workspace import workspace_bp  # 🚀 ADDED: Importing the Workspace status/heartbeat blueprint
from routes.workspace.controller import workspace_isolated_bp  # 🚀 ADDED: Importing the Workspace projects/permissions blueprint

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # DB config is handled by Config class in config.py
    # Only override here if DATABASE_URL env var is set (for Render deployment)
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url.strip()
    
    # 🛠️ FIXED: Explicitly set default JWT headers array location configuration to prevent KeyError exceptions
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    
    frontend_origins = [
        os.environ.get("FRONTEND_URL", "http://localhost:5173"),
        "https://candels1921.vercel.app"
    ]
    CORS(app, 
         resources={r"/*": {"origins": frontend_origins}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )
    
    # Initialize unified extensions cleanly inside the application factory context loop
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins=frontend_origins) # Binds real-time engine with CORS
    jwt.init_app(app)      # Binds token authentication engine cleanly
    
    # Register blueprints onto central routing tree
    app.register_blueprint(register_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(forgot_password_bp)
    app.register_blueprint(dashboard_bp)  
    app.register_blueprint(creatteam_bp)   
    app.register_blueprint(validation_bp)
    app.register_blueprint(declaration_bp) 
    app.register_blueprint(cli_bp)         # 🚀 ADDED: Registered the new CLI engine endpoints onto the app routing tree
    app.register_blueprint(workspace_bp)   # 🚀 ADDED: Registered the workspace status/heartbeat blueprint
    app.register_blueprint(workspace_isolated_bp, url_prefix='/api/workspace') # 🚀 ADDED: Registered the workspace query/management blueprint
    
    #  settings blueprint
    from blueprints.settings import settings_bp, check_and_migrate_db
    app.register_blueprint(settings_bp)
    
    # 🕵️‍♂️ FORENSIC-GRADE AUDITING & EXCEPTION MIDDLEWARE PIPELINE
    import time
    import traceback
    import logging
    from flask import request, jsonify

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("teambridge_forensics")

    @app.before_request
    def record_request_start():
        request.start_time = time.time()

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

    from werkzeug.exceptions import HTTPException

    def _add_cors_headers(response):
        """Safety net: manually add CORS headers to error responses in case flask-cors misses them."""
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
        # Boot-time database connectivity check
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
    print("TeamBridge Real-Time Engine active on http://127.0.0.1:5000")
    socketio.run(app, host='127.0.0.1', port=5000, debug=True, allow_unsafe_werkzeug=True)