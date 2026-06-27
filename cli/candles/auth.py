# 📄 Location: d:/Ptojects/TeamBridge/cli/candles/auth.py
import os
import json
import socket
from pathlib import Path

HOME_DIR = str(Path.home())
CONFIG_DIR = os.path.join(HOME_DIR, '.candles')
CONFIG_PATH = os.path.join(CONFIG_DIR, 'config.json')  # 🔐 Global Profile data only

def save_session(token, email):
    """Saves user authentication safely in the global home directory."""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    config_data = {
        "auth_token": token,
        "user_email": email,
        "device_name": socket.gethostname()
    }
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config_data, f, indent=4)

def load_session():
    """Loads user profile session from global config."""
    if not os.path.exists(CONFIG_PATH):
        return None
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def clear_session():
    """Logs out globally by deleting the home config profile."""
    if os.path.exists(CONFIG_PATH):
        try:
            os.remove(CONFIG_PATH)
        except Exception:
            pass

def save_local_context(team_code, project_name):
    """Saves project reference context locally inside the current working folder."""
    local_dir = os.path.join(os.getcwd(), '.candles')
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, 'project_context.json')
    context_data = {
        "team_code": team_code,
        "project_name": project_name,
        "initialized_at": os.getcwd()
    }
    with open(local_path, 'w') as f:
        json.dump(context_data, f, indent=4)

def load_local_context():
    """Loads specific project reference context from current working directory folder."""
    local_path = os.path.join(os.getcwd(), '.candles', 'project_context.json')
    if not os.path.exists(local_path):
        return None
    try:
        with open(local_path, 'r') as f:
            return json.load(f)
    except Exception:
        return None