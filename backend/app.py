# 📄 Location: d:/Ptojects/TeamBridge/backend/app.py
#tb_live_55921b18bc0945ad1516d3832975da13a033bd1f5118426a
import eventlet
eventlet.monkey_patch()

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
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
        "connect_args": {
            "ssl": {"ssl_cert_reqs": 0}
        }
    }
    
    # 🛠️ FIXED: Explicitly set default JWT headers array location configuration to prevent KeyError exceptions
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    
    frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    CORS(app, resources={r"/*": {"origins": frontend_origin}})
    
    # Initialize unified extensions cleanly inside the application factory context loop
    db.init_app(app)
    socketio.init_app(app) # Binds real-time engine cleanly
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

    @app.errorhandler(500)
    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
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
        return response

    with app.app_context():
        print("Connecting to database and verifying tables...", flush=True)
        db.create_all()  # Generates missing relational framework tables seamlessly
        print("Database connected successfully!", flush=True)
        check_and_migrate_db() # Run settings migrations automatically
        print("Database migrations completed!", flush=True)
        
    return app

if __name__ == "__main__":
    app = create_app()
    print("TeamBridge Real-Time Engine active on http://127.0.0.1:5000")
    socketio.run(app, host='127.0.0.1', port=5000, debug=True, allow_unsafe_werkzeug=True)