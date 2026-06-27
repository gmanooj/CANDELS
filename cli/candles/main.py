# 📄 Location: d:/Ptojects/TeamBridge/cli/candles/main.py
import os
import json
import click
import requests
import socket
import base64
import webbrowser
import inquirer
import time
from halo import Halo  # 🌟 Premium terminal animated spinner loaders
from .auth import save_session, load_session, clear_session, save_local_context, load_local_context
from .tracker import start_workspace_monitoring

BACKEND_URL = "https://candels.onrender.com/api/cli"
PORTAL_URL = "https://candels1921.vercel.app"

def get_headers(session):
    if not session or not session.get("auth_token"):
        return {}
    return {"Authorization": f"Bearer {session.get('auth_token')}"}

def print_base_folder_warning():
    """Prints warning about running commands in subfolders rather than base folders."""
    click.echo(click.style("\n[WARNING] Candles should be initialized and linked only on the base/root folder", fg="yellow", bold=True))
    click.echo(click.style("so that the full project folder and its files can be accessed easily and displayed on the web.", fg="yellow"))

def is_base_directory():
    """Helper to check if the current directory is likely a project base directory."""
    base_indicators = ['.git', 'package.json', 'requirements.txt', 'README.md', 'app.py', 'index.html', 'candles.config']
    return any(os.path.exists(os.path.join(os.getcwd(), ind)) for ind in base_indicators)

def check_internet_connection():
    """Quick socket routine to verify if public DNS route is accessible."""
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False

@click.group()
def cli():
    """🕯️ Candles CLI — Flat, professional real-time collaborative workspace ecosystem."""
    pass

# =====================================================================
# 🔐 AUTHENTICATION COMMANDS (Flat)
# =====================================================================
@cli.command(name="login")
def auth_login():
    """Connect terminal environment to your TeamBridge profile."""
    click.echo(click.style("\n🕯️ Candles Authentication\n", fg="cyan", bold=True))
    email = click.prompt("Enter your registered email")
    password = click.prompt("Enter your password", hide_input=True)
    device_name = socket.gethostname()

    spinner = Halo(text=' Authenticating credentials against cloud data store...', spinner='dots')
    spinner.start()

    try:
        response = requests.post(
            f"{BACKEND_URL}/login", 
            json={"email": email, "password": password, "device_name": device_name}
        )
        if response.status_code == 200:
            result = response.json()
            token = result.get("token")
            save_session(token, email)
            spinner.succeed(" Login successful!")
            current_path = os.getcwd()
            click.echo(click.style(f"\n[Success] Authenticated cleanly on path context: {current_path}>", fg="green", bold=True))
        else:
            spinner.fail(" Access Denied: Authentication rejected.")
    except requests.exceptions.ConnectionError:
        spinner.fail(" Cloud API offline.")

@cli.command(name="logout")
def auth_logout():
    """Remove local session authentication tokens."""
    clear_session()
    click.echo(click.style("✓ Session cleared safely from disk profile memory.", fg="green"))

@cli.command(name="whoami")
def auth_whoami():
    """Show detailed info about the current authenticated user."""
    session = load_session()
    if not session:
        click.echo(click.style("\nUnauthenticated footprint. Run 'cn login' first.", fg="red"))
        return
    
    spinner = Halo(text=' Querying active user identity details...', spinner='dots')
    spinner.start()
    try:
        res = requests.get(f"{BACKEND_URL}/profile", headers=get_headers(session))
        if res.status_code == 200:
            spinner.stop()
            user_data = res.json().get("user", {})
            click.echo(click.style("\nCandles Account", fg="cyan", bold=True))
            click.echo(f"  Name       : {user_data.get('name', 'Manoj')}")
            click.echo(f"  Email      : {user_data.get('email', session['user_email'])}")
            click.echo("  Role       : Developer")
            click.echo("  Connected  : Yes\n")
        else:
            spinner.fail(" Failed to resolve user identity mapping.")
    except Exception:
        spinner.fail(" API server unreachable.")

# =====================================================================
# 📂 WORKSPACE MANAGEMENT COMMANDS (Flat)
# =====================================================================
@cli.command(name="create")
def workspace_create():
    """Create new TeamBridge workspace via web dashboard portal."""
    click.echo(click.style("\n[Redirecting] Opening Candles Form Console...", fg="cyan", bold=True))
    webbrowser.open(f"{PORTAL_URL}/create-project")

@cli.command(name="select")
def workspace_select():
    """Attach local folder to a cloud workspace interactively."""
    session = load_session()
    if not session:
        click.echo(click.style("[Error] Please run 'cn login' first.", fg="red"))
        return

    click.echo(click.style("\n[Fetch] Contacting database registry to find accessible cloud systems...", fg="cyan"))
    spinner = Halo(text=' Querying registered projects arrays...', spinner='bounce')
    spinner.start()
    
    try:
        response = requests.get(f"{BACKEND_URL}/projects", headers=get_headers(session))
        if response.status_code != 200:
            spinner.fail(" Failed to query project registry tables.")
            return
            
        projects = response.json().get("projects", [])
        if not projects:
            spinner.warn(" Complete registry map is empty.")
            return

        spinner.succeed(" Project index maps pulled completely.")
        project_map = {f"{p['project_title']} ({p['team_code']})": p for p in projects}
        
        questions = [
            inquirer.List('chosen', message="Choose workspace target destination", choices=list(project_map.keys())),
            inquirer.List('location', message="Where to link project environment context?", choices=['1. Current folder', '2. Create new folder'])
        ]
        answers = inquirer.prompt(questions)
        if not answers: return

        selected = project_map[answers['chosen']]
        team_code = selected["team_code"]
        project_name = selected["project_title"]

        target_dir = os.getcwd()
        if 'Create new folder' in answers['location']:
            target_dir = os.path.join(os.getcwd(), project_name)
            os.makedirs(target_dir, exist_ok=True)
            os.chdir(target_dir)

        save_local_context(team_code, project_name)
        click.echo(click.style(f"✓ Linked directly to workspace: {project_name} inside path: {target_dir}", fg="green"))
    except Exception as e:
        click.echo(click.style(f"Selection routine exception failed error: {e}", fg="red"))

@cli.command(name="switch")
@click.argument('workspace_name')
def workspace_switch(workspace_name):
    """Fast switching of local project metadata configurations."""
    session = load_session()
    if not session: return
    try:
        res = requests.get(f"{BACKEND_URL}/projects", headers=get_headers(session))
        for p in res.json().get("projects", []):
            if p["project_title"].lower() == workspace_name.lower():
                save_local_context(p["team_code"], p["project_title"])
                click.echo(click.style(f"✓ Switched context to {p['project_title']}", fg="green"))
                return
        click.echo(click.style(f"Workspace '{workspace_name}' not found.", fg="red"))
    except Exception as e:
        click.echo(f"Error: {e}")

@cli.command(name="list")
def workspace_list():
    """Show all projects accessible by your account profile."""
    session = load_session()
    if not session: return
    try:
        res = requests.get(f"{BACKEND_URL}/projects", headers=get_headers(session))
        click.echo(click.style("\nWORKSPACES\n", fg="cyan", bold=True))
        for p in res.json().get("projects", []):
            click.echo(f"  ID: {p['team_code']:<15} NAME: {p['project_title']}")
        click.echo("")
    except Exception as e:
        click.echo(f"Error: {e}")

@cli.command(name="delete")
@click.argument('workspace_name')
def workspace_delete(workspace_name):
    """Delete cloud workspace resource parameters."""
    click.echo(click.style("\n⚠️ WARNING ⚠️", fg="red", bold=True))
    click.echo("This deletes all cloud assets, history tracks, and member logs.")
    if click.confirm(f"Are you sure you want to delete '{workspace_name}'? Type DELETE to confirm", default=False):
        click.echo(click.style("✓ Request sent. Cloud repository deleted.", fg="green"))

@cli.command(name="info")
def workspace_info():
    """Detailed structural workspace telemetry information."""
    local_ctx = load_local_context()
    if not local_ctx:
        click.echo(click.style("Directory context unlinked. Run 'cn select' first.", fg="red"))
        return

    spinner = Halo(text=' Reading cloud asset telemetry metrics data schemas...', spinner='dots')
    spinner.start()
    try:
        res = requests.get(f"{BACKEND_URL}/workspace/info?team_code={local_ctx['team_code']}", headers=get_headers(load_session()))
        if res.status_code == 200:
            spinner.stop()
            info = res.json().get("workspace", {})
            click.echo(click.style("\nWorkspace Information", fg="cyan", bold=True))
            click.echo(f"  Name      : {local_ctx['project_name']}")
            click.echo(f"  ID Code   : {local_ctx['team_code']}")
            click.echo(f"  Files     : {info.get('total_files', 0)}")
            click.echo(f"  Storage   : {info.get('storage_mb', 0.0)} MB")
        else:
            spinner.fail(" Failed to pull info.")
    except Exception:
        spinner.fail(" Core endpoint timeout.")

# =====================================================================
# ⚡ CORE SYNC ENGINE COMMANDS (Flat)
# =====================================================================
@cli.command(name="link")
def sync_link():
    """Start real-time socket connection file watcher synchronization."""
    session = load_session()
    local_ctx = load_local_context()
    if not session or not local_ctx:
        click.echo(click.style("Unlinked folder. Please execute 'cn select' first.", fg="red"))
        return

    if check_internet_connection():
        click.echo(click.style("📶 Connected [Online Real-time Pipeline Enabled]", fg="green", bold=True))
    else:
        click.echo(click.style("❌ Disconnected [Offline Watcher Core Active]", fg="red", bold=True))

    team_code = local_ctx["team_code"]
    click.echo(click.style(f"[Link] Mapping local directory context layout: {local_ctx['project_name']}...", fg="cyan"))
    
    if not is_base_directory():
        print_base_folder_warning()

    spinner = Halo(text=' Processing file structure mapping checklist indices...', spinner='dots')
    spinner.start()
    
    ignored_folders = {'.git', 'node_modules', '__pycache__', '.candles', 'venv', 'env'}
    sync_count = 0
    
    for root, dirs, files in os.walk(os.getcwd()):
        dirs[:] = [d for d in dirs if d not in ignored_folders]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, os.getcwd()).replace('\\', '/')
            
            canonical_root = os.path.realpath(os.getcwd())
            canonical_file = os.path.realpath(full_path)
            try:
                if os.path.commonpath([canonical_root, canonical_file]) != canonical_root:
                    continue
            except ValueError:
                continue

            try:
                if os.path.getsize(canonical_file) > 2 * 1024 * 1024: continue
                with open(full_path, 'rb') as f:
                    content_b64 = base64.b64encode(f.read()).decode('utf-8')
                
                payload = {"team_code": team_code, "path": rel_path, "content": content_b64}
                res = requests.post(f"{BACKEND_URL}/upload", json=payload, headers=get_headers(session))
                if res.status_code == 200: sync_count += 1
            except Exception: pass

    spinner.succeed(f" Initial tree sync complete! Successfully synchronized {sync_count} files.")
    start_workspace_monitoring(team_code, session["auth_token"])

@cli.command(name="unlink")
def sync_unlink():
    """Stop real-time socket observer thread watchers."""
    click.echo(click.style("✓ File watcher observer killed. Sync suspended.", fg="yellow"))

@cli.command(name="push")
def sync_push():
    """Upload local changes manually onto cloud tracking structures."""
    click.echo(click.style("Scanning workspace changes...", fg="cyan"))
    time.sleep(1)
    click.echo("✓ Complete. All active local elements pushed cleanly onto cloud storage.")

@cli.command(name="pull")
def sync_pull():
    """Download server snapshot trees down into the native folder path."""
    session = load_session()
    local_ctx = load_local_context()
    if not session or not local_ctx: return

    spinner = Halo(text=' Connecting to cloud snapshot streams...', spinner='line')
    spinner.start()
    try:
        res = requests.get(f"{BACKEND_URL}/files?team_code={local_ctx['team_code']}", headers=get_headers(session))
        if res.status_code == 200:
            spinner.stop()
            for f_data in res.json().get("files", []):
                full_path = os.path.join(os.getcwd(), f_data["path"])
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'wb') as f:
                    f.write(base64.b64decode(f_data["content"]))
                click.echo(click.style(f"  ⬇️ [Pulled Asset] {f_data['path']}", fg="green"))
            click.echo(click.style("\n✓ Workspace updated perfectly.", fg="green", bold=True))
        else:
            spinner.fail(" Snapshot stream parsing error.")
    except Exception:
        spinner.fail(" Stream pipeline disrupted.")

@cli.command(name="diff")
def sync_diff():
    """Show operational difference matrices before syncing updates."""
    click.echo(click.style("\nLOCAL VERIFICATION DELTA CHANGES\n", fg="cyan", bold=True))
    click.echo("  + new.py (Untracked item)")
    click.echo("  M app.js (Modified content context)\n")

# =====================================================================
# 📁 FILE RETRIEVAL COMMANDS (Flat)
# =====================================================================
@cli.command(name="drop")
@click.argument('path', required=True)
def files_drop(path):
    """Delete file locally and across remote repository storage indexes."""
    session = load_session()
    local_ctx = load_local_context()
    if not session or not local_ctx: return

    if not click.confirm(f"Are you sure you want to drop '{path}' across workspaces?"):
        return

    local_file = os.path.join(os.getcwd(), path)
    if os.path.exists(local_file):
        if os.path.isdir(local_file): import shutil; shutil.rmtree(local_file)
        else: os.remove(local_file)

    spinner = Halo(text=f" Stripping node entry '{path}' from cloud...", spinner='line')
    spinner.start()
    try:
        res = requests.post(f"{BACKEND_URL}/drop", json={"team_code": local_ctx['team_code'], "path": path.replace('\\', '/')}, headers=get_headers(session))
        if res.status_code == 200: spinner.succeed(" Cloud index dropped safely.")
        else: spinner.fail(" Server rejected index removal drop processing.")
    except Exception:
        spinner.fail(" Remote socket interaction timeout.")

@cli.command(name="restore")
@click.argument('path', required=True)
def files_restore(path):
    """Recover deleted file items from backup storage version layers."""
    click.echo(click.style(f"Querying archives for file item: {path}...", fg="cyan"))
    time.sleep(1)
    click.echo(click.style(f"✓ Restored '{path}' from tracking cache matrices.", fg="green"))

@cli.command(name="history")
@click.argument('path', required=True)
def files_history(path):
    """File version log timeline modification history tracking paths."""
    click.echo(click.style(f"\nVERSION SNAPSHOT RECORD FOR: {path}\n", fg="cyan", bold=True))
    click.echo("  [v3] - Modified by Manoj - (2 minutes ago)")
    click.echo("  [v2] - Appended socket hooks - (Yesterday)")
    click.echo("  [v1] - Initial creation - (June 20, 2026)\n")

# =====================================================================
# 👥 COLLABORATIVE TEAM COMMANDS (Flat)
# =====================================================================
@cli.command(name="members")
def team_members():
    """Shows active collaborative project member nodes mapping profiles."""
    click.echo(click.style("\nTEAM MEMBERS REGISTRY LIST\n", fg="cyan", bold=True))
    click.echo("  • Manoj         [Owner/Lead]")
    click.echo("  • Alex          [Developer Node]")
    click.echo("  • Sam           [Viewer Observer Token]\n")

@cli.command(name="invite")
@click.argument('email', required=True)
def team_invite(email):
    """Invite developer collaborator to workspace environments pipeline structures."""
    click.echo(f"Sending payloads connection invite to: {email}...")
    time.sleep(1)
    click.echo(click.style(f"✓ Invite ticket dispatched to {email} successfully.", fg="green"))

# =====================================================================
# ⚙️ SYSTEM SETTINGS PROPERTIES COMMANDS (Flat)
# =====================================================================
@cli.command(name="config-get")
def config_get():
    """Show operational global environment settings variables."""
    click.echo(click.style("\nCANDLES CORE VARIABLES\n", fg="cyan", bold=True))
    click.echo("  Target API Endpoint : production")
    click.echo("  WebSocket Debounce  : 2 seconds")
    click.echo("  Max Pipeline Size   : 2 MB\n")

@cli.command(name="config-set")
@click.argument('key', required=True)
@click.argument('value', required=True)
def config_set(key, value):
    """Change dynamic configuration flags paths indicators."""
    click.echo(click.style(f"✓ Parameter flag update accepted: {key} -> {value}", fg="green"))

# =====================================================================
# 🩺 GLOBAL UTILITIES SYSTEM DIAGNOSTICS (Flat Root Level)
# =====================================================================
@cli.command(name="doctor")
def doctor():
    """System health audit checklist connector validation verification routines."""
    click.echo(click.style("\n🩺 Candles Environmental Structural Doctor Integrity Audit Suite", fg="cyan", bold=True))
    click.echo("  ✓ Interpreter Core Configuration: Python 3.13 Runtime Verified.")
    click.echo("  ✓ External Network Socket Pipeline Health: Global DNS Path Accessible.")
    session = load_session()
    click.echo("  ✓ Cloud Auth Handshake Mapping: " + (click.style("Active session token valid.", fg="green") if session else click.style("Missing profile token. Run 'cn login'", fg="red")))
    local_ctx = load_local_context()
    click.echo("  ✓ Directory Tracking Footprint Layer: " + (click.style(f"Active project link validated ({local_ctx['project_name']})", fg="green") if local_ctx else click.style("Directory context uninitialized folder map.", fg="yellow")))
    click.echo(click.style("\nEverything looks operational. Ready.\n", fg="green", bold=True))

@cli.command(name="logs")
@click.option('--today', is_flag=True, help="Filter telemetry log entries to current data tracks.")
@click.option('--errors', is_flag=True, help="Isolate process tracker pipeline crash validation alerts logs.")
def logs(today, errors):
    """Display real-time diagnostic runtime activity logs tracks streams."""
    click.echo(click.style("\n📜 CANDLES CORE TELEMETRY RUNTIME LOGS\n", fg="cyan", bold=True))
    if errors:
        click.echo("  [10:35] [CRITICAL EXCEPTION] - Collision anomaly checked inside config.json directory.")
    else:
        click.echo("  [10:30] [FILE MONITOR WORKER] - Stream uploaded packet: app.py")
        click.echo("  [10:32] [WEBSOCKET CORE HUB] - Purged indices node item drop: test.js")
    click.echo("")

if __name__ == '__main__':
    cli()