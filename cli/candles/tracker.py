# 📄 Location: d:/Ptojects/TeamBridge/cli/candles/tracker.py
import os
import time
import json
import base64
import requests
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

try:
    import socketio
except ImportError:
    socketio = None

BACKEND_URL = "http://127.0.0.1:5000/api/cli"

def is_binary_file(filepath):
    """Check if a file is binary by reading the first 1024 bytes and searching for null byte or high non-text byte ratio."""
    try:
        if not os.path.exists(filepath) or os.path.isdir(filepath):
            return False
        with open(filepath, 'rb') as f:
            chunk = f.read(1024)
            if b'\x00' in chunk:
                return True
            non_printable = sum(1 for byte in chunk if byte < 32 and byte not in (9, 10, 13))
            if chunk and (non_printable / len(chunk)) > 0.3:
                return True
    except Exception:
        pass
    return False

class ProjectActivityHandler(FileSystemEventHandler):
    """Listens natively to file system events and aggregates activity + syncs changes to server."""
    def __init__(self, team_code, auth_token, settings=None, document_paths=None):
        self.team_code = team_code
        self.auth_token = auth_token
        self.document_paths = document_paths or set()
        self.pending_changes = {}
        self.last_event_time = 0
        self.lock = threading.Lock()
        
        self.max_file_size_bytes = 2 * 1024 * 1024
        self.allowed_exts = None
        self.ignored_folders = ['.git', 'node_modules', '__pycache__', '.candles', 'venv', 'env']
        
        if settings:
            if settings.get("max_file_size_mb") is not None:
                self.max_file_size_bytes = int(settings["max_file_size_mb"] * 1024 * 1024)
            if settings.get("allowed_extensions"):
                self.allowed_exts = {ext.strip().lower() for ext in settings["allowed_extensions"].split(",") if ext.strip()}
            if settings.get("ignored_folders"):
                self.ignored_folders = [f.strip() for f in settings["ignored_folders"].split(",") if f.strip()]

        self.sio = None
        if socketio:
            try:
                self.sio = socketio.Client()
                @self.sio.on('cli_stream_response')
                def on_cli_stream_response(data):
                    status = data.get('status')
                    msg = data.get('message', '')
                    if status == 'success':
                        print(f"[WebSocket Sync] Success: {msg}")
                    else:
                        print(f"[WebSocket Sync Error] {msg}")
            except Exception as e:
                print(f"[Warning] Failed to initialize Socket.IO client: {e}")
                self.sio = None

    def start_worker(self):
        if self.sio:
            try:
                backend_root = BACKEND_URL.rsplit('/api', 1)[0]
                self.sio.connect(backend_root)
                print(f"[WebSocket] Connected to real-time sync engine at {backend_root}")
            except Exception as e:
                print(f"[WebSocket Warning] Connection failed: {e}. Falling back to HTTP batch uploads.")
                self.sio = None

        # Thread 1: Real-time quick debounce stream worker
        threading.Thread(target=self.worker_loop, daemon=True).start()
        
        # Thread 2: Periodic absolute check routine loop running every 5 minutes and 1 second precisely
        threading.Thread(target=self.five_minute_ticker_loop, daemon=True).start()

    def worker_loop(self):
        while True:
            time.sleep(0.5)
            self.flush_payloads()

    def five_minute_ticker_loop(self):
        """Force system tree checks alignment every 5 minutes and 1 second (301s total) precisely."""
        while True:
            time.sleep(301)
            print("\n[Clock Update Engine] Standard 5-minute synchronization interval tick running updates checklist indices...")
            self.force_full_directory_sync()

    def force_full_directory_sync(self):
        """Walks workspace tree structural components queuing all non-ignored updates changes."""
        for root, dirs, files in os.walk(os.getcwd()):
            dirs[:] = [d for d in dirs if d not in self.ignored_folders]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, os.getcwd())
                with self.lock:
                    self.pending_changes[rel_path] = {
                        "absolute_path": full_path,
                        "timestamp": time.time(),
                        "deleted": False
                    }
        self.flush_payloads()

    def flush_payloads(self):
        batch_payload = []
        
        with self.lock:
            if not self.pending_changes:
                return
            # Debounce filter validation check logic
            if time.time() - self.last_event_time < 1.5:
                # If an event was captured very recently, let the next loop pass clean
                return
            changes = list(self.pending_changes.items())
            self.pending_changes.clear()

        for rel_path, info in changes:
            if info["deleted"]:
                batch_payload.append({
                    "path": rel_path.replace('\\', '/'),
                    "deleted": True
                })
            else:
                try:
                    if not os.path.exists(info["absolute_path"]):
                        continue
                    
                    file_size = os.path.getsize(info["absolute_path"])
                    if file_size > self.max_file_size_bytes:
                        continue
                    
                    if is_binary_file(info["absolute_path"]):
                        ext = os.path.splitext(rel_path)[1].lower()
                        if ext not in ['.docx', '.doc', '.pdf']:
                            continue

                    with open(info["absolute_path"], 'rb') as f:
                        content_b64 = base64.b64encode(f.read()).decode('utf-8')
                    
                    batch_payload.append({
                        "path": rel_path.replace('\\', '/'),
                        "content": content_b64,
                        "deleted": False
                    })
                except Exception as e:
                    print(f"[Sync Error] Could not read file {rel_path} for batch: {e}")

        if not batch_payload:
            return

        if self.sio and self.sio.connected:
            try:
                payload = {
                    "auth_token": self.auth_token,
                    "team_code": self.team_code,
                    "files": batch_payload
                }
                self.sio.emit('cli_file_stream', payload)
                print(f"[Dynamic Update Hub] Streamed batch of {len(batch_payload)} actions via WebSocket.")
            except Exception:
                self.send_http_batch(batch_payload)
        else:
            self.send_http_batch(batch_payload)

    def send_http_batch(self, batch_payload):
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            payload = {
                "team_code": self.team_code,
                "files": batch_payload
            }
            response = requests.post(
                f"{BACKEND_URL}/upload-batch",
                json=payload,
                headers=headers,
                timeout=15
            )
            if response.status_code == 200:
                print(f"[Dynamic Update Hub] Synchronized batch update payload changes cleanly to cloud repositories context layer.")
        except Exception as e:
            print(f"[Sync Error HTTP] Consolidated batch request failed: {e}")

    def process_event(self, event, is_deletion=False):
        if event.is_directory:
            return

        try:
            canonical_path = os.path.realpath(event.src_path)
        except Exception:
            canonical_path = os.path.abspath(event.src_path)

        is_registered_doc = False
        registered_doc_path = None
        for doc_path in self.document_paths:
            if os.path.normcase(os.path.realpath(canonical_path)) == os.path.normcase(os.path.realpath(doc_path)):
                is_registered_doc = True
                registered_doc_path = doc_path
                break

        if not is_registered_doc:
            cwd_path = os.path.realpath(os.getcwd())
            try:
                if os.path.commonpath([cwd_path, canonical_path]) != cwd_path:
                    return
            except ValueError:
                return

            relative_path = os.path.relpath(canonical_path, cwd_path)
        else:
            relative_path = registered_doc_path

        path_parts = relative_path.replace('\\', '/').split('/')
        if any(ignored in path_parts for ignored in self.ignored_folders):
            return

        if not is_deletion:
            ext = os.path.splitext(canonical_path)[1].lower()
            if self.allowed_exts and ext not in self.allowed_exts:
                if ext not in ['.docx', '.doc', '.pdf']:
                    return

            try:
                file_size = os.path.getsize(canonical_path)
                if file_size > self.max_file_size_bytes:
                    return
            except Exception:
                pass

        with self.lock:
            self.pending_changes[relative_path] = {
                "absolute_path": canonical_path,
                "timestamp": time.time(),
                "deleted": is_deletion
            }
            self.last_event_time = time.time()

    def on_modified(self, event):
        self.process_event(event, is_deletion=False)

    def on_created(self, event):
        self.process_event(event, is_deletion=False)

    def on_deleted(self, event):
        self.process_event(event, is_deletion=True)

def start_workspace_monitoring(team_code, auth_token):
    """Starts the background thread worker watching the current directory and registered documents."""
    path_to_watch = os.getcwd()
    settings = {}
    try:
        response = requests.get(
            f"http://127.0.0.1:5000/api/workspace/settings?team_code={team_code}",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=5
        )
        if response.status_code == 200:
            settings = response.json().get("settings", {})
    except Exception:
        pass

    document_paths = set()
    try:
        response = requests.get(
            f"http://127.0.0.1:5000/api/workspace/documents?team_code={team_code}",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=5
        )
        if response.status_code == 200:
            docs = response.json().get("documents", [])
            for doc in docs:
                file_path = doc.get("file_path")
                if file_path:
                    document_paths.add(os.path.abspath(file_path))
    except Exception:
        pass

    event_handler = ProjectActivityHandler(team_code, auth_token, settings, document_paths)
    event_handler.start_worker()
    
    observer = Observer()
    observer.schedule(event_handler, path=path_to_watch, recursive=True)
    
    watched_dirs = {os.path.realpath(path_to_watch)}
    for doc_path in document_paths:
        dir_to_watch = os.path.dirname(doc_path)
        if os.path.exists(dir_to_watch) and os.path.realpath(dir_to_watch) not in watched_dirs:
            try:
                observer.schedule(event_handler, path=dir_to_watch, recursive=False)
                watched_dirs.add(os.path.realpath(dir_to_watch))
            except Exception:
                pass

    observer.start()
    print(f"[Start] Candles background file-watcher active on: {path_to_watch}")
    print("Press Ctrl+C to terminate the synchronization monitoring session.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n[Stop] Workspace monitoring suspended cleanly.")
    observer.join()