# 📄 Location: d:/Ptojects/TeamBridge/cli/candles/auth.py
import os
import json
import socket
from pathlib import Path

HOME_DIR = str(Path.home())
CONFIG_DIR = os.path.join(HOME_DIR, '.candles')
CONFIG_PATH = os.path.join(CONFIG_DIR, 'config.json')

def save_session(token, email, team_code=None, project_name=None):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    config_data = {
        "auth_token": token,
        "user_email": email,
        "device_name": socket.gethostname()
    }
    if team_code:
        config_data["team_code"] = team_code
    if project_name:
        config_data["project_name"] = project_name
        
    with open(CONFIG_PATH, 'w') as f:
        json.dump(config_data, f, indent=4)

def load_session():
    if not os.path.exists(CONFIG_PATH):
        return None
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def clear_session():
    if os.path.exists(CONFIG_PATH):
        try:
            os.remove(CONFIG_PATH)
        except Exception:
            pass

def save_local_context(team_code, project_name):
    """Saves project reference context inside the current working directory."""
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
    """Loads project reference context inside the current working directory."""
    local_path = os.path.join(os.getcwd(), '.candles', 'project_context.json')
    if not os.path.exists(local_path):
        return None
    try:
        with open(local_path, 'r') as f:
            return json.load(f)
    except Exception:
        return None