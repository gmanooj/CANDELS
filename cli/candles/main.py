# 📄 Location: d:/Ptojects/TeamBridge/cli/candles/main.py
import os
import json
import click
import requests
import socket
import base64
import webbrowser
import inquirer
from .auth import save_session, load_session, clear_session, save_local_context, load_local_context
from .tracker import start_workspace_monitoring

BACKEND_URL = "https://candels.onrender.com/api/cli"

def get_headers(session):
    return {
        "Authorization": f"Bearer {session.get('auth_token')}"
    }

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
    """Candles Global CLI Tool - Evolve your workspace into a collaborative SaaS environment."""
    pass

@cli.command()
def create():
    """Redirect user to the website portal to configure structural team setups."""
    click.echo(click.style("\n[Redirecting] Opening Candles Form Console...", fg="cyan", bold=True))
    click.echo(click.style("Please create a project, confirm them and complete the declaration form to create project to use that in the local system.", fg="yellow"))
    webbrowser.open("http://127.0.0.1:5000/create-project")

@cli.command()
def login():
    """Securely connect your terminal environment to your Candles profile with masked security inputs."""
    click.echo(click.style("[Cloud] Connecting to Candles Cloud Services...", fg="cyan"))
    
    email = click.prompt("Enter your registered email")
    # hide_input=True replaces typed credentials with clean secure shell masking
    password = click.prompt("Enter your password", hide_input=True)
    device_name = socket.gethostname()

    try:
        response = requests.post(
            f"{BACKEND_URL}/login", 
            json={"email": email, "password": password, "device_name": device_name}
        )
        
        if response.status_code == 200:
            result = response.json()
            token = result.get("token")
            
            # Save initialized global state profiles variables data models
            save_session(token, email, None, None)
            
            current_path = os.getcwd()
            click.echo(click.style(f"\n[Success] Authenticated cleanly on path context: {current_path}>", fg="green", bold=True))
            click.echo("You can now safely execute 'cn create', 'cn link', 'cn add' etc. across structural system pathways.")
        else:
            click.echo(click.style("\n[Error] Access Denied: Check password / email and re-enter again.", fg="red", bold=True))
            
    except requests.exceptions.ConnectionError:
        click.echo(click.style("[Error] Connection Error: Could not reach Flask backend server. Make sure your app is running!", fg="red"))

def login_script():
    """Wrapper entry point for cn-login command."""
    from click.testing import CliRunner
    cli(args=['login'])

def live_script():
    """Wrapper entry point for cn-live command running background synchronization loop."""
    from click.testing import CliRunner
    cli(args=['link'])

@cli.command()
def init():
    """Initialize a project workspace in the current folder."""
    session = load_session()
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'cn login' first.", fg="yellow"))
        return

    team_code = session.get("team_code")
    project_name = session.get("project_name")
    
    if not team_code:
        click.echo(click.style("[Error] No project selected in your profile. Run 'cn login' to select one.", fg="red"))
        return

    if not is_base_directory():
        print_base_folder_warning()
        if not click.confirm("Do you want to proceed with initialization in the current directory?", default=False):
            click.echo(click.style("[Aborted] Initialization cancelled. Please navigate to the project base folder.", fg="red"))
            return

    save_local_context(team_code, project_name)
    click.echo(click.style(f"[Local] Folder initialized and linked to Candles workspace: {project_name} ({team_code})", fg="green", bold=True))

@cli.command()
def get():
    """Download all scaffolding files and folders from the online repository."""
    session = load_session()
    local_ctx = load_local_context()
    
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'cn login' first.", fg="yellow"))
        return
        
    team_code = local_ctx.get("team_code") if local_ctx else session.get("team_code")
    if not team_code:
        click.echo(click.style("[Error] Directory not initialized. Run 'cn init' or 'cn login' first.", fg="red"))
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
    """Upload local folder structure, allow custom project selection cloning, and sync changes real-time."""
    session = load_session()
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'cn login' first.", fg="yellow"))
        return

    # Connection environment indicator checks
    if check_internet_connection():
        click.echo(click.style("🌐 Connected [Online Real-time Pipeline Enabled]", fg="green"))
    else:
        click.echo(click.style("🛑 Disconnected [Offline Core Layer Running]", fg="red"))

    local_ctx = load_local_context()

    # If the user runs cn-link inside a directory that is already an active cloned repository context
    if local_ctx:
        team_code = local_ctx["team_code"]
        project_name = local_ctx["project_name"]
        
        click.echo(click.style(f"[Link] Linking current local directory to Candles cloud folder: {project_name}...", fg="cyan"))
        
        if not is_base_directory():
            print_base_folder_warning()
            if not click.confirm("Are you sure you want to run link / synchronize here?"):
                click.echo(click.style("[Aborted] Action aborted.", fg="red"))
                return

        click.echo(click.style("\n[Sync] Synchronizing local files to Cloud Workspace...", fg="cyan"))
        ignored_folders = {'.git', 'node_modules', '__pycache__', '.candles', 'venv', 'env'}
        
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
                    file_size = os.path.getsize(canonical_file)
                    if file_size > 2 * 1024 * 1024:
                        click.echo(click.style(f"  [Binary Guard] Skipping heavy file (>2MB): {rel_path}", fg="yellow"))
                        continue
                    
                    from .tracker import is_binary_file
                    if is_binary_file(canonical_file):
                        ext = os.path.splitext(rel_path)[1].lower()
                        if ext not in ['.docx', '.doc', '.pdf']:
                            continue

                    with open(full_path, 'rb') as f:
                        content_b64 = base64.b64encode(f.read()).decode('utf-8')
                    
                    payload = {
                        "team_code": team_code,
                        "path": rel_path,
                        "content": content_b64
                    }
                    
                    res = requests.post(f"{BACKEND_URL}/upload", json=payload, headers=get_headers(session))
                    if res.status_code == 200:
                        click.echo(f"  [Syncing] {rel_path}")
                except Exception as e:
                    click.echo(click.style(f"  [Warning] Skipping file {rel_path}: {e}", fg="yellow"))

        click.echo(click.style("[Success] Initial sync complete. Watching for local modifications...", fg="green"))
        start_workspace_monitoring(team_code, session["auth_token"])
        return

    # If run in an unlinked/new folder (e.g., testfolder), prompt user to select and download an existing database project
    click.echo(click.style("\n[Fetch] Contacting database to fetch accessible active user projects...", fg="cyan"))
    try:
        response = requests.get(f"{BACKEND_URL}/projects", headers=get_headers(session))
        if response.status_code != 200:
            click.echo(click.style("[Error] Failed to fetch active projects from backend registry.", fg="red"))
            return
            
        projects = response.json().get("projects", [])
        if not projects:
            click.echo(click.style("[Info] No remote projects found. Use 'cn create' to set up a new workspace registry.", fg="yellow"))
            return

        # Use terminal arrow selections key mappings arrays maps
        project_map = {f"{p['project_title']} (Code: {p['team_code']})": p for p in projects}
        choices_list = list(project_map.keys())

        questions = [
            inquirer.List(
                'chosen_project_str',
                message="Select a project workspace (Use Up/Down Arrows, Space/Enter to confirm choice)",
                choices=choices_list,
            )
        ]
        
        answers = inquirer.prompt(questions)
        if not answers:
            click.echo(click.style("[Aborted] No workspace project targeted.", fg="red"))
            return

        selected_record = project_map[answers['chosen_project_str']]
        team_code = selected_record["team_code"]
        project_name = selected_record["project_title"]

        if not click.confirm(f"\nDo you allow Candles to clone project database entries here inside folder context?"):
            click.echo(click.style("[Aborted] Core cloning sequence cancelled.", fg="red"))
            return

        # Dynamically allocate cloning directory matching exactly your custom project form text
        target_clone_folder = os.path.join(os.getcwd(), project_name)
        os.makedirs(target_clone_folder, exist_ok=True)

        # Save dynamic profile indicators inside local data markers structures
        save_session(session["auth_token"], session["user_email"], team_code, project_name)
        
        local_marker_path = os.path.join(target_clone_folder, '.candles')
        os.makedirs(local_marker_path, exist_ok=True)
        with open(os.path.join(local_marker_path, 'project_context.json'), 'w') as f:
            json.dump({"team_code": team_code, "project_name": project_name, "initialized_at": target_clone_folder}, f, indent=4)

        click.echo(click.style(f"\nExecuting command utility pipeline: cn-{project_name.lower()}-clone...", fg="cyan"))
        files_res = requests.get(f"{BACKEND_URL}/files?team_code={team_code}", headers=get_headers(session))
        
        if files_res.status_code == 200:
            files = files_res.json().get("files", [])
            for file_data in files:
                path = file_data["path"]
                content = base64.b64decode(file_data["content"])
                full_path = os.path.join(target_clone_folder, path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'wb') as f:
                    f.write(content)

        click.echo(click.style(f"\n[Success] Your project '{project_name}' has been successfully cloned to the local filesystem wrapper context!", fg="green", bold=True))
        click.echo(click.style(f"To activate dynamic updates, navigate using: 'cd {project_name}' and run 'cn link'. Files will dynamically update to the workspace of candles.", fg="yellow"))

    except Exception as e:
        click.echo(click.style(f"[Error] Repository initialization pipeline failed: {e}", fg="red"))

@cli.command()
@click.argument('file_path', required=False)
def drop(file_path):
    """Delete a file locally and from the remote server workspace explorer."""
    session = load_session()
    local_ctx = load_local_context()
    
    if not session:
        click.echo(click.style("[Warning] No active profile found. Please run 'cn login' first.", fg="yellow"))
        return
        
    team_code = local_ctx["team_code"] if local_ctx else session.get("team_code")
    if not team_code:
        click.echo(click.style("[Error] Directory not linked. Run 'cn init' first.", fg="red"))
        return

    if not file_path:
        file_path = click.prompt("Enter the relative file path to delete/drop")

    if not click.confirm(f"[Warning] Are you sure you want to drop '{file_path}' from local and remote workspaces?"):
        click.echo(click.style("[Aborted] Drop action aborted.", fg="yellow"))
        return

    local_file = os.path.join(os.getcwd(), file_path)
    if os.path.exists(local_file):
        try:
            if os.path.isdir(local_file):
                import shutil
                shutil.rmtree(local_file)
            else:
                os.remove(local_file)
            click.echo(click.style(f"[Success] Deleted local file: {file_path}", fg="green"))
        except Exception as e:
            click.echo(click.style(f"[Error] Failed to delete local file: {e}", fg="red"))

    try:
        response = requests.post(
            f"{BACKEND_URL}/drop",
            json={"team_code": team_code, "path": file_path.replace('\\', '/')},
            headers=get_headers(session)
        )
        if response.status_code == 200:
            click.echo(click.style(f"[Success] Successfully dropped '{file_path}' from Candles Cloud Explorer.", fg="green", bold=True))
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
        click.echo(click.style("[Warning] No active profile found. Run 'cn login' first.", fg="yellow"))
        return
        
    click.echo(click.style("[Status] Candles Connection Status:", fg="cyan", bold=True))
    click.echo(f"  Logged In As: {session['user_email']}")
    click.echo(f"  Device Name:  {session['device_name']}")
    if session.get("team_code"):
        click.echo(f"  Active Project (Global): {session.get('project_name', 'Unknown')} ({session.get('team_code')})")
    if local_ctx:
        click.echo(click.style(f"[Success] Linked Folder (Local):  {local_ctx.get('project_name', 'Unknown')} ({local_ctx.get('team_code')})", fg="green"))
    else:
        click.echo(click.style("[Warning] Current folder is not linked locally. Run 'cn init'.", fg="yellow"))

@cli.command()
def logout():
    """Clear local session storage files to log out safely."""
    clear_session()
    click.echo(click.style("[Success] Logged out of Candles. Local configuration purged.", fg="yellow", bold=True))

if __name__ == '__main__':
    cli()