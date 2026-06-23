# 📄 Location: teambridge/cli/teambridge/main.py
import os
import json
import click
import requests
import socket
import base64
from .auth import save_session, load_session, clear_session, save_local_context, load_local_context
from .tracker import start_workspace_monitoring

BACKEND_URL = "http://127.0.0.1:5000/api/cli"

def get_headers(session):
    return {
        "Authorization": f"Bearer {session.get('auth_token')}"
    }

def print_base_folder_warning():
    """Prints warning about running commands in subfolders rather than base folders."""
    click.echo(click.style("\n[WARNING] TeamBridge should be initialized and linked only on the base/root folder", fg="yellow", bold=True))
    click.echo(click.style("so that the full project folder and its files can be accessed easily and displayed on the web.", fg="yellow"))

def is_base_directory():
    """Helper to check if the current directory is likely a project base directory."""
    base_indicators = ['.git', 'package.json', 'requirements.txt', 'README.md', 'app.py', 'index.html', 'teambridge.config']
    return any(os.path.exists(os.path.join(os.getcwd(), ind)) for ind in base_indicators)

@click.group()
def cli():
    """TeamBridge Global CLI Tool - Evolve your workspace into a collaborative SaaS environment."""
    pass

@cli.command()
def login():
    """Securely connect your terminal environment to your TeamBridge profile."""
    click.echo(click.style("[Cloud] Connecting to TeamBridge Cloud Services...", fg="cyan"))
    
    email = click.prompt("Enter your registered email")
    password = click.prompt("Enter your password", hide_input=True)
    device_name = socket.gethostname()

    try:
        # 1. Login user
        response = requests.post(
            f"{BACKEND_URL}/login", 
            json={"email": email, "password": password, "device_name": device_name}
        )
        
        if response.status_code == 200:
            result = response.json()
            token = result.get("token")
            
            # Save temporary session info to make requests
            temp_session = {"auth_token": token}
            
            # 2. Retrieve user's active projects from backend
            projects_response = requests.get(
                f"{BACKEND_URL}/projects",
                headers=get_headers(temp_session)
            )
            
            selected_team = None
            selected_project = None
            
            if projects_response.status_code == 200:
                projects = projects_response.json().get("projects", [])
                if not projects:
                    click.echo(click.style("\n[Warning] No active project workspaces found for this account. Create a team online first!", fg="yellow"))
                else:
                    click.echo(click.style("\n[Projects] Available TeamBridge Projects:", fg="cyan", bold=True))
                    for idx, p in enumerate(projects):
                        click.echo(f"  [{idx + 1}] {p['project_title']} (Team Code: {p['team_code']}) [Role: {p['role']}]")
                    
                    choice = click.prompt("\nSelect a project number to link", type=int, default=1)
                    if 1 <= choice <= len(projects):
                        chosen_project = projects[choice - 1]
                        selected_team = chosen_project["team_code"]
                        selected_project = chosen_project["project_title"]
                        click.echo(click.style(f"[Selected] Project: {selected_project} ({selected_team})", fg="green"))
                    else:
                        click.echo(click.style("[Error] Invalid choice. Skipping project linking.", fg="red"))
            else:
                click.echo(click.style("[Warning] Failed to retrieve your project list from the server.", fg="yellow"))

            # 3. Save global session credentials
            save_session(token, email, selected_team, selected_project)
            click.echo(click.style(f"\n[Success] Authenticated cleanly on device: {device_name}!", fg="green", bold=True))
            
            # 4. Interactive context initialization query
            if selected_team:
                if click.confirm(f"\nDo you want to initialize the current directory as the local workspace for '{selected_project}'?"):
                    ctx = click.get_current_context()
                    ctx.invoke(init)
        else:
            error_msg = response.json().get("message", "Invalid credentials.")
            click.echo(click.style(f"[Error] Authentication Failed: {error_msg}", fg="red"))
            
    except requests.exceptions.ConnectionError:
        click.echo(click.style("[Error] Connection Error: Could not reach Flask backend server. Make sure your app is running!", fg="red"))

def login_script():
    """Wrapper entry point for tb-login command."""
    from click.testing import CliRunner
    cli(args=['login'])

@cli.command()
def init():
    """Initialize a project workspace in the current folder."""
    session = load_session()
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'tb login' first.", fg="yellow"))
        return

    team_code = session.get("team_code")
    project_name = session.get("project_name")
    
    if not team_code:
        click.echo(click.style("[Error] No project selected in your profile. Run 'tb login' to select one.", fg="red"))
        return

    # Check for subfolder risk
    if not is_base_directory():
        print_base_folder_warning()
        if not click.confirm("Do you want to proceed with initialization in the current directory?", default=False):
            click.echo(click.style("[Aborted] Initialization cancelled. Please navigate to the project base folder.", fg="red"))
            return

    save_local_context(team_code, project_name)
    click.echo(click.style(f"[Local] Folder initialized and linked to TeamBridge workspace: {project_name} ({team_code})", fg="green", bold=True))


@cli.command()
def get():
    """Download all scaffolding files and folders from the online repository."""
    session = load_session()
    local_ctx = load_local_context()
    
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'tb login' first.", fg="yellow"))
        return
        
    team_code = local_ctx.get("team_code") if local_ctx else session.get("team_code")
    if not team_code:
        click.echo(click.style("[Error] Directory not initialized. Run 'tb init' or 'tb login' first.", fg="red"))
        return

    click.echo(click.style(f"[Sync] Pulling files for Team: {team_code} from cloud...", fg="cyan"))
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/files?team_code={team_code}",
            headers=get_headers(session)
        )
        
        if response.status_code == 200:
            files = response.json().get("files", [])
            if not files:
                click.echo(click.style("[Info] No files found in remote workspace yet.", fg="yellow"))
                return
                
            for file_data in files:
                path = file_data["path"]
                content = base64.b64decode(file_data["content"])
                
                # Write file locally
                full_path = os.path.join(os.getcwd(), path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'wb') as f:
                    f.write(content)
                click.echo(f"  [Downloading] {path}")
                
            click.echo(click.style("[Success] Workspace download complete. Local folder matching cloud filesystem.", fg="green", bold=True))
        else:
            click.echo(click.style(f"[Error] Failed to fetch files: {response.text}", fg="red"))
            
    except requests.exceptions.ConnectionError:
         click.echo(click.style("[Error] Connection Error: Backend server is offline.", fg="red"))


@cli.command()
def link():
    """Upload local folder structure and auto-sync changes to the Web IDE in real-time."""
    session = load_session()
    local_ctx = load_local_context()
    
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'tb login' first.", fg="yellow"))
        return
        
    if not local_ctx:
        click.echo(click.style("[Error] Current folder is not initialized as a TeamBridge workspace.", fg="red"))
        click.echo("Please navigate to your project base folder and run 'tb init'.")
        return

    team_code = local_ctx["team_code"]
    project_name = local_ctx["project_name"]

    click.echo(click.style(f"[Link] Linking current local directory to TeamBridge cloud folder: {project_name}...", fg="cyan"))
    
    # Check if we are running at the root directory level
    if not is_base_directory():
        print_base_folder_warning()
        if not click.confirm("Are you sure you want to run link / synchronize here?"):
            click.echo(click.style("[Aborted] Action aborted.", fg="red"))
            return

    # First perform a clean full upload of files
    click.echo(click.style("\n[Sync] Synchronizing local files to Cloud Workspace...", fg="cyan"))
    ignored_folders = {'.git', 'node_modules', '__pycache__', '.teambridge', 'venv', 'env'}
    
    for root, dirs, files in os.walk(os.getcwd()):
        dirs[:] = [d for d in dirs if d not in ignored_folders]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, os.getcwd()).replace('\\', '/')
            
            # Enforce canonical path checks via commonpath
            canonical_root = os.path.realpath(os.getcwd())
            canonical_file = os.path.realpath(full_path)
            try:
                if os.path.commonpath([canonical_root, canonical_file]) != canonical_root:
                    click.echo(click.style(f"  [Security Ignore] Skipping file outside workspace: {rel_path}", fg="yellow"))
                    continue
            except ValueError:
                continue

            try:
                # 2MB file size guard
                file_size = os.path.getsize(canonical_file)
                if file_size > 2 * 1024 * 1024:
                    click.echo(click.style(f"  [Binary Guard] Skipping heavy file (>2MB): {rel_path}", fg="yellow"))
                    continue
                
                # Binary guard signature scanner
                from .tracker import is_binary_file
                if is_binary_file(canonical_file):
                    ext = os.path.splitext(rel_path)[1].lower()
                    if ext not in ['.docx', '.doc', '.pdf']:
                        click.echo(click.style(f"  [Binary Guard] Skipping binary file: {rel_path}", fg="yellow"))
                        continue

                with open(full_path, 'rb') as f:
                    content_b64 = base64.b64encode(f.read()).decode('utf-8')
                
                payload = {
                    "team_code": team_code,
                    "path": rel_path,
                    "content": content_b64
                }
                
                res = requests.post(
                    f"{BACKEND_URL}/upload",
                    json=payload,
                    headers=get_headers(session)
                )
                if res.status_code == 200:
                    click.echo(f"  [Syncing] {rel_path}")
                else:
                    click.echo(click.style(f"  [Error] Sync error on {rel_path}: {res.text}", fg="red"))
            except Exception as e:
                click.echo(click.style(f"  [Warning] Skipping file {rel_path}: {e}", fg="yellow"))

    click.echo(click.style("[Success] Initial sync complete. Watching for local modifications...", fg="green"))
    
    # Spin up background watcher observer
    start_workspace_monitoring(team_code, session["auth_token"])


@cli.command()
@click.argument('file_path', required=False)
def drop(file_path):
    """Delete a file locally and from the remote server workspace explorer."""
    session = load_session()
    local_ctx = load_local_context()
    
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'tb login' first.", fg="yellow"))
        return
        
    team_code = local_ctx["team_code"] if local_ctx else session.get("team_code")
    if not team_code:
        click.echo(click.style("[Error] Directory not linked. Run 'tb init' first.", fg="red"))
        return

    if not file_path:
        file_path = click.prompt("Enter the relative file path to delete/drop")

    # Confirm deletion
    if not click.confirm(f"[Warning] Are you sure you want to drop '{file_path}' from local and remote workspaces?"):
        click.echo(click.style("[Aborted] Drop action aborted.", fg="yellow"))
        return

    # 1. Local delete
    local_file = os.path.join(os.getcwd(), file_path)
    local_deleted = False
    if os.path.exists(local_file):
        try:
            if os.path.isdir(local_file):
                import shutil
                shutil.rmtree(local_file)
            else:
                os.remove(local_file)
            local_deleted = True
            click.echo(click.style(f"[Success] Deleted local file: {file_path}", fg="green"))
        except Exception as e:
            click.echo(click.style(f"[Error] Failed to delete local file: {e}", fg="red"))
    else:
        click.echo(click.style(f"[Info] File '{file_path}' does not exist locally.", fg="yellow"))

    # 2. Remote drop
    try:
        response = requests.post(
            f"{BACKEND_URL}/drop",
            json={"team_code": team_code, "path": file_path.replace('\\', '/')},
            headers=get_headers(session)
        )
        if response.status_code == 200:
            click.echo(click.style(f"[Success] Successfully dropped '{file_path}' from TeamBridge Cloud Explorer.", fg="green", bold=True))
        else:
            click.echo(click.style(f"[Error] Failed to drop '{file_path}' on server: {response.text}", fg="red"))
    except Exception as e:
        click.echo(click.style("[Error] Remote drop connection failed: " + str(e), fg="red"))


@cli.command()
def status():
    """Check the status of your current local terminal workspace profile."""
    session = load_session()
    local_ctx = load_local_context()
    
    if not session:
        click.echo(click.style("[Warning] No active profile found. Run 'tb login' first.", fg="yellow"))
        return
        
    click.echo(click.style("[Status] TeamBridge Connection Status:", fg="cyan", bold=True))
    click.echo(f"  Logged In As: {session['user_email']}")
    click.echo(f"  Device Name:  {session['device_name']}")
    if session.get("team_code"):
        click.echo(f"  Active Project (Global): {session.get('project_name', 'Unknown')} ({session.get('team_code')})")
    if local_ctx:
        click.echo(click.style(f"[Success] Linked Folder (Local):  {local_ctx.get('project_name', 'Unknown')} ({local_ctx.get('team_code')})", fg="green"))
    else:
        click.echo(click.style("[Warning] Current folder is not linked locally. Run 'tb init'.", fg="yellow"))


@cli.command()
def logout():
    """Clear local session storage files to log out safely."""
    clear_session()
    click.echo(click.style("[Success] Logged out of TeamBridge. Local configuration purged.", fg="yellow", bold=True))


if __name__ == '__main__':
    cli()