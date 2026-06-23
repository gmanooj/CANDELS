import sys
import os
import traceback

def verify_compilation():
    print("--- 1. Verification: Checking Python Syntax Compilation ---")
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    import py_compile
    compiled_count = 0
    error_count = 0
    for root, dirs, files in os.walk(backend_dir):
        if 'node_modules' in root or '__pycache__' in root or '.venv' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                try:
                    py_compile.compile(file_path, doraise=True)
                    compiled_count += 1
                except Exception as e:
                    print(f"[ERROR] Syntax Error in {file_path}: {e}")
                    error_count += 1
    print(f"[SUCCESS] Compiled {compiled_count} Python files successfully.")
    if error_count > 0:
        print(f"[ERROR] Found {error_count} syntax errors.")
        return False
    return True

def verify_flask_app():
    print("\n--- 2. Verification: Auditing Flask Application & Blueprint Registry ---")
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
    try:
        from app import create_app
        app = create_app()
        print("[SUCCESS] Flask app factory initialized successfully.")
        
        # Test routing tree
        print("\nRegistered blueprints:")
        for name, blueprint in app.blueprints.items():
            print(f" - {name}: {blueprint.url_prefix or '/'}")
            
        print("\nChecking database connection status...")
        from extensions import db
        with app.app_context():
            # Run simple quick SELECT query to test connectivity
            from sqlalchemy import text
            result = db.session.execute(text("SELECT 1")).fetchone()
            if result and result[0] == 1:
                print("[SUCCESS] MySQL Connection verify successful.")
            else:
                print("[ERROR] Database connection established but test query returned invalid value.")
                return False
                
        return True
    except Exception as e:
        print(f"[ERROR] Flask initialization or database connection error: {e}")
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("==================================================")
    print("      TeamBridge Pre-Deployment Verification Check")
    print("==================================================")
    
    compilation_ok = verify_compilation()
    flask_ok = verify_flask_app()
    
    print("\n==================================================")
    if compilation_ok and flask_ok:
        print("[SUCCESS] Pre-deployment validations PASSED.")
        sys.exit(0)
    else:
        print("[ERROR] Pre-deployment validations FAILED.")
        sys.exit(1)
