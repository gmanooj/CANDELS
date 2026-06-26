// 📄 Location: frontend/src/workspace/ActiveWorkspace.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './workspace.css';
import Tasks from './components/Tasks';
import Chat from './components/Chat';
import Monitor from './components/Monitor';
import GitController from './components/GitController';
import Documents from './components/Documents';
import Reports from './components/Reports';
import Implementations from './components/Implementations';
import PresentationEngine from './components/PresentationEngine';
import Editor from '@monaco-editor/react';
import ErrorBoundary from '../components/ErrorBoundary';


export default function ActiveWorkspace() {
    const { teamCode } = useParams();
    const navigate = useNavigate();

    // App Component States
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Form Input States
    const [projectName, setProjectName] = useState("");
    const [description, setDescription] = useState("");
    const [projectType, setProjectType] = useState("Project");
    const [frontendStack, setFrontendStack] = useState("React");
    const [backendStack, setBackendStack] = useState("Flask");
    const [dbType, setDbType] = useState("MySQL");
    const [selectedLanguages, setSelectedLanguages] = useState(["Python", "JavaScript"]);

    // IDE Core View States
    const [activeFile, setActiveFile] = useState('README.md');
    const [activeTab, setActiveTab] = useState('Files'); // Files, Tasks, Chat, Monitor, Git, Reports
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);
    const [isSplitView, setIsSplitView] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Dynamic Database-backed Workspace States
    // Dynamic Database-backed Workspace States
    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [reportsData, setReportsData] = useState({ members: [], total_commits: 0, total_lines: 0, total_hours: 0 });
    const [assignedTo, setAssignedTo] = useState("");
    const [newTaskCategory, setNewTaskCategory] = useState("General");
    const [newTaskPriority, setNewTaskPriority] = useState("Medium");
    const [newTaskTitle, setNewTaskTitle] = useState("");

    // Custom permissions, documents, and activities states
    const [userRole, setUserRole] = useState("");
    const [permissions, setPermissions] = useState({ read: true, write: true, mode: "editor" });
    const [authError, setAuthError] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [newDocName, setNewDocName] = useState("");
    const [newDocUrl, setNewDocUrl] = useState("");
    const [activities, setActivities] = useState([]);
    
    // File upload states
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Code comments and reviews state parameters
    const [fileComments, setFileComments] = useState([]);
    const [commentLine, setCommentLine] = useState(1);
    const [newCommentText, setNewCommentText] = useState("");
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [editorSidebarTab, setEditorSidebarTab] = useState('Reviews');

    // Dynamic file tree synchronization states
    const [filesList, setFilesList] = useState([]);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fileLastModified, setFileLastModified] = useState({});

    const getFileLanguage = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'js' || ext === 'jsx') return 'javascript';
        if (ext === 'ts' || ext === 'tsx') return 'typescript';
        if (ext === 'py') return 'python';
        if (ext === 'sql') return 'sql';
        if (ext === 'html') return 'html';
        if (ext === 'css') return 'css';
        if (ext === 'json') return 'json';
        if (ext === 'md') return 'markdown';
        return 'plaintext';
    };

    // Dynamic file extension icons & colors as per VS Code
    const getFileIconAndColor = (filename) => {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.env') || lower.endsWith('.key') || lower.includes('secret') || lower.includes('password')) {
            return { icon: '🔒', color: '#ff453a' };
        }
        if (filename.endsWith('.jsx') || filename.endsWith('.js')) return { icon: '⚛', color: '#58c4dc' };
        if (filename.endsWith('.py')) return { icon: '🐍', color: '#3572A5' };
        if (filename.endsWith('.sql')) return { icon: '🛢', color: '#e97b2e' };
        if (filename.endsWith('.md')) return { icon: '📝', color: '#d16c5d' };
        return { icon: '⚙', color: '#858585' };
    };

    // Helper to build file tree dynamically from flat files list
    const buildFileTree = (files) => {
        const root = {};
        
        // Auto-Scaffold Logic: Explicitly show folders based on active workspace stack config
        if (frontendStack && frontendStack !== 'None') {
            root['frontend'] = { _type: 'folder', children: {} };
        }
        if (backendStack && backendStack !== 'None') {
            root['backend'] = { _type: 'folder', children: {} };
        }
        if (dbType && dbType !== 'None') {
            root['database'] = { _type: 'folder', children: {} };
        }

        files.forEach(file => {
            if (!file) return;
            const parts = file.split('/');
            let current = root;
            parts.forEach((part, index) => {
                if (!part) return; // ignore empty parts if any
                if (!current[part]) {
                    current[part] = index === parts.length - 1 ? { _type: 'file', path: file } : { _type: 'folder', children: {} };
                }
                if (current[part]._type === 'folder') {
                    current = current[part].children;
                }
            });
        });
        return root;
    };

    // API helper: Fetch list of files recursively from backend workspace folder
    const fetchFilesList = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/files?team_code=${teamCode}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem("auth_token")
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.files && data.files.length > 0) {
                setFilesList(data.files);
            } else {
                // Scaffolding fallback list if not initialized or empty on server
                const mockFiles = [];
                if (frontendStack !== 'None') {
                    mockFiles.push('frontend/src/App.jsx');
                    mockFiles.push('frontend/package.json');
                }
                if (backendStack !== 'None') {
                    if (backendStack === 'Flask' || selectedLanguages.includes('Python')) {
                        mockFiles.push('backend/app.py');
                        mockFiles.push('backend/requirements.txt');
                    } else {
                        mockFiles.push('backend/server.js');
                        mockFiles.push('backend/package.json');
                    }
                }
                if (dbType !== 'None') {
                    mockFiles.push('database/schema.sql');
                }
                mockFiles.push('.env');
                mockFiles.push('secrets.key');
                mockFiles.push('README.md');
                mockFiles.push('teambridge.config');
                setFilesList(mockFiles);
            }
        })
        .catch(err => {
            console.error("Failed to fetch files list:", err);
        });
    };

    // API helper: Fetch file contents from the backend filesystem
    const fetchFileContent = (filePath) => {
        const isSensitive = filePath.endsWith('.env') || filePath.endsWith('.key') || filePath.toLowerCase().includes('secret') || filePath.toLowerCase().includes('password') || filePath.toLowerCase().includes('credential');
        if (isSensitive) {
            return;
        }
        fetch(`${__BACKEND_URL__}/api/workspace/file-content?team_code=${teamCode}&path=${encodeURIComponent(filePath)}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem("auth_token")
            }
        })
        .then(res => {
            if (!res.ok) throw new Error("File not found on server.");
            return res.json();
        })
        .then(data => {
            setEditorContents(prev => ({
                ...prev,
                [filePath]: data.content
            }));
            if (data.last_modified) {
                setFileLastModified(prev => ({
                    ...prev,
                    [filePath]: data.last_modified
                }));
            }
        })
        .catch(err => {
            console.warn(`Local mock fallback used for: ${filePath}`, err);
            setEditorContents(prev => {
                if (prev[filePath] === undefined) {
                    return { ...prev, [filePath]: getInitialFileContent(filePath) };
                }
                return prev;
            });
        });
    };

    // API helper: Save file contents to backend filesystem
    const saveFileContent = (filePath, contentToSave) => {
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";
        
        const isSensitive = filePath.endsWith('.env') || filePath.endsWith('.key') || filePath.toLowerCase().includes('secret') || filePath.toLowerCase().includes('password') || filePath.toLowerCase().includes('credential');
        if (isSensitive) {
            alert("Protected credential files cannot be modified via browser editor.");
            return;
        }

        const lastMod = fileLastModified[filePath] || null;

        setIsSaving(true);
        fetch(`${__BACKEND_URL__}/api/workspace/file-content`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem("auth_token")
            },
            body: JSON.stringify({
                team_code: teamCode,
                path: filePath,
                content: contentToSave,
                email: email,
                last_modified: lastMod
            })
        })
        .then(async res => {
            if (res.status === 409) {
                const data = await res.json();
                throw new Error(data.message || "Conflict detected.");
            }
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Could not save to backend.");
            }
            return res.json();
        })
        .then(data => {
            setSaveSuccess(true);
            setIsSaving(false);
            if (data.last_modified) {
                setFileLastModified(prev => ({
                    ...prev,
                    [filePath]: data.last_modified
                }));
            }
            setTimeout(() => setSaveSuccess(false), 2000);
        })
        .catch(err => {
            console.error("Save file error:", err);
            setIsSaving(false);
            alert("Failed to save changes: " + err.message);
        });
    };


    const renderTree = (node, name, depth = 0) => {
        if (node._type === 'file') {
            const filePath = node.path;
            const isActive = activeFile === filePath;
            const baseName = name;
            const meta = getFileIconAndColor(baseName);
            
            return (
                <div 
                    key={filePath}
                    onClick={() => setActiveFile(filePath)}
                    className={`file-explorer-item vscode-mono-font file-row-indent ${isActive ? 'active' : ''}`}
                    style={{ '--depth': depth }}
                >
                    <span className="file-icon-span" style={{ color: meta.color }}>{meta.icon}</span>
                    <span>{baseName}</span>
                </div>
            );
        } else {
            return (
                <div key={name} className="folder-wrapper">
                    <div 
                        className="file-explorer-folder vscode-mono-font file-row-indent"
                        style={{ '--depth': depth }}
                    >
                        <span className="folder-icon-span">📁</span>
                        <span>{name}</span>
                    </div>
                    <div className="folder-children">
                        {Object.keys(node.children).map(childName => 
                            renderTree(node.children[childName], childName, depth + 1)
                        )}
                    </div>
                </div>
            );
        }
    };

    // Interactive Code Editor state
    const [editorContents, setEditorContents] = useState({});

    // Interactive iMessage Chat state
    const [chatMessages, setChatMessages] = useState([
        { id: 1, text: "Hey team! I started setting up the project configuration.", sender: "Alice", isMe: false, time: "17:30" },
        { id: 2, text: "Awesome, let's verify if the status API works correctly.", sender: "Leader", isMe: true, time: "17:31" },
        { id: 3, text: "Yes, verified! It returns 200 OK now.", sender: "Bob", isMe: false, time: "17:32" }
    ]);
    const [chatInput, setChatInput] = useState("");

    // Telemetry Chart state (Activity Monitor simulation)
    const [telemetryData, setTelemetryData] = useState([20, 25, 15, 30, 45, 40, 35, 50, 60, 55, 45, 60, 65, 70, 60, 65]);

    // Git Sync state
    const [commitMessage, setCommitMessage] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchTasks = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/tasks?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.tasks) {
                    setTasks(data.tasks);
                }
            })
            .catch(err => console.error("Failed to fetch tasks.", err));
    };

    const fetchMembers = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/members?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.members) {
                    setTeamMembers(data.members);
                    const assignable = data.members.filter(m => {
                        const roleLower = (m.role || "").toLowerCase();
                        return roleLower !== 'faculty' && roleLower !== 'mentor' && roleLower !== 'supervisor' && !m.user_code.toLowerCase().includes('fac');
                    });
                    if (assignable.length > 0 && !assignedTo) {
                        setAssignedTo(assignable[0].user_code);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch team members.", err));
    };

    const fetchReports = () => {
        if (userRole !== 'Faculty') return;
        fetch(`${__BACKEND_URL__}/api/workspace/reports?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.members) {
                    setReportsData(data);
                }
            })
            .catch(err => console.error("Failed to fetch contribution reports.", err));
    };

    const fetchDocuments = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/documents?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.documents) {
                    setDocuments(data.documents);
                }
            })
            .catch(err => console.error("Failed to fetch documents.", err));
    };

    const fetchActivities = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/activities?team_code=${teamCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.activities) {
                    setActivities(data.activities);
                }
            })
            .catch(err => console.error("Failed to fetch activities.", err));
    };

    const fetchFileComments = () => {
        if (!teamCode || !activeFile) return;
        fetch(`${__BACKEND_URL__}/api/workspace/comments?team_code=${teamCode}&file_path=${activeFile}`)
            .then(res => res.json())
            .then(data => {
                if (data.comments) {
                    setFileComments(data.comments);
                }
            })
            .catch(err => console.error("Failed to fetch comments:", err));
    };

    const addCodeComment = () => {
        if (!newCommentText.trim()) return;
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        let finalCommentText = newCommentText;
        if (selectedTaskId) {
            finalCommentText = `[Ref Task: #${selectedTaskId}] ${finalCommentText}`;
        }

        fetch(`${__BACKEND_URL__}/api/workspace/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_code: teamCode,
                file_path: activeFile,
                line_number: commentLine,
                comment_text: finalCommentText,
                email: email
            })
        })
        .then(res => res.json())
        .then(() => {
            setNewCommentText("");
            setSelectedTaskId("");
            fetchFileComments();
        })
        .catch(err => console.error("Failed to add comment:", err));
    };

    useEffect(() => {
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";
        const token = sessionStorage.getItem("auth_token") || "";
        
        // 1. Verify access permissions first
        fetch(`${__BACKEND_URL__}/api/workspace/verify-permissions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ team_code: teamCode, user_email: email })
        })
        .then(res => {
            if (res.status === 403 || res.status === 404) {
                return res.json().then(data => {
                    throw new Error(data.message || "Access Denied: You are not authorized to access this workspace.");
                });
            }
            if (!res.ok) throw new Error("Server authentication failed.");
            return res.json();
        })
        .then(permData => {
            setUserRole(permData.role);
            setPermissions(permData.permissions);
            setAuthError(null);
            
            // 2. Query workspace config status
            return fetch(`${__BACKEND_URL__}/api/workspace/status?team_code=${teamCode}`);
        })
        .then(res => {
            if (!res.ok) throw new Error("Workspace status query failed.");
            return res.json();
        })
        .then(data => {
            if (data.project_name) {
                setProjectName(data.project_name);
            }
            if (data.is_initialized) {
                setIsInitialized(true);
                if (data.stack) {
                    setFrontendStack(data.stack.frontend || "React");
                    setBackendStack(data.stack.backend || "Flask");
                    setDbType(data.stack.database || "MySQL");
                    setSelectedLanguages(data.stack.languages || ["Python", "JavaScript"]);
                }
            } else {
                setIsInitialized(false);
            }
            setLoading(false);
        })
        .catch(err => {
            console.error("Workspace mount flow error:", err);
            if (err.message.includes("Access Denied")) {
                setAuthError(err.message);
                setLoading(false);
            } else {
                // Fallback offline simulation
                setProjectName("TeamBridge Project");
                setFrontendStack("React");
                setBackendStack("Flask");
                setDbType("MySQL");
                setSelectedLanguages(["Python", "JavaScript"]);
                setIsInitialized(true);
                setUserRole("Leader");
                setPermissions({ read: true, write: true, mode: "editor" });
                setLoading(false);
            }
        });
    }, [teamCode]);

    useEffect(() => {
        if (isInitialized) {
            fetchTasks();
            fetchMembers();
            fetchDocuments();
            fetchActivities();
            fetchFileComments();
            fetchFilesList();
        }
    }, [teamCode, isInitialized]);

    useEffect(() => {
        if (isInitialized && userRole === 'Faculty') {
            fetchReports();
        }
    }, [teamCode, isInitialized, userRole]);

    useEffect(() => {
        if (isInitialized && activeFile) {
            const isSensitive = activeFile.endsWith('.env') || activeFile.endsWith('.key') || activeFile.toLowerCase().includes('secret') || activeFile.toLowerCase().includes('password') || activeFile.toLowerCase().includes('credential');
            if (!isSensitive && editorContents[activeFile] === undefined) {
                fetchFileContent(activeFile);
            }
        }
    }, [activeFile, isInitialized]);



    useEffect(() => {
        if (!teamCode) return;
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        const socket = io(__BACKEND_URL__, { transports: ["websocket"], upgrade: false });
        socket.emit('join_chat', { team_code: teamCode });

        socket.on('comment_added', (data) => {
            if (data.file_path === activeFile) {
                fetchFileComments();
            }
        });

        socket.on('file_updated', (data) => {
            fetchFilesList();
            if (data.file_path === activeFile) {
                if (data.deleted) {
                    alert(`File ${activeFile} was deleted remotely.`);
                    setActiveFile("README.md");
                } else if (data.updated_by !== email) {
                    fetchFileContent(activeFile);
                }
            }
        });

        socket.on('document_update', (data) => {
            if (data.team_code === teamCode) {
                fetchDocuments();
            }
        });

        return () => {
            socket.off('comment_added');
            socket.off('file_updated');
            socket.off('document_update');
            socket.disconnect();
        };
    }, [teamCode, activeFile]);

    // Telemetry updates simulation & real heartbeat push to DB
    useEffect(() => {
        const interval = setInterval(() => {
            setTelemetryData(prev => {
                const nextVal = Math.floor(Math.random() * 45) + 25; // values between 25 and 70
                return [...prev.slice(1), nextVal];
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";
        
        const heartbeatInterval = setInterval(() => {
            fetch(`${__BACKEND_URL__}/api/workspace/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_code: teamCode,
                    workspace_id: 1, // Binds telemetry dynamically
                    user_email: email,
                    focused_file: activeFile,
                    is_typing: true,
                    is_moving_cursor: true
                })
            })
            .then(() => {
                fetchReports();
                fetchActivities();
            })
            .catch(err => console.error("Telemetry report failed.", err));
        }, 30000); // 30s frequency
        return () => clearInterval(heartbeatInterval);
    }, [activeFile, isInitialized, teamCode]);

    const handleLanguageToggle = (lang) => {
        if (selectedLanguages.includes(lang)) {
            setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
        } else {
            setSelectedLanguages([...selectedLanguages, lang]);
        }
    };

    // File Content Generator
    const getInitialFileContent = (file) => {
        if (file === 'src/App.jsx') {
            return `import React from 'react';\nimport './App.css';\n\nfunction App() {\n  return (\n    <div className="App" style={{ padding: '40px', textAlign: 'center' }}>\n      <header className="App-header">\n        <h1>Welcome to ${projectName}</h1>\n        <p>Active Workspace Stack: React (Vite) + Flask + MySQL</p>\n        <span className="badge">Node Key: ${teamCode}</span>\n      </header>\n    </div>\n  );\n}\n\nexport default App;`;
        }
        if (file === 'src/main.jsx') {
            return `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`;
        }
        if (file === 'app.py') {
            return `from flask import Flask, jsonify, request\nfrom flask_cors import CORS\n\napp = Flask(__name__)\nCORS(app)\n\n@app.route('/api/status')\ndef get_status():\n    return jsonify({\n        "status": "online",\n        "team_code": "${teamCode}",\n        "project": "${projectName}"\n    })\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=5000, debug=True)`;
        }
        if (file === 'requirements.txt') {
            return `flask==3.0.2\nflask-cors==4.0.0\nPyMySQL==1.1.0\nsqlalchemy==2.0.27`;
        }
        if (file === 'schema.sql') {
            return `-- TeamBridge Auto-scaffolded DB Layout\nCREATE DATABASE IF NOT EXISTS db_${teamCode.toLowerCase().replace(/-/g, '_')};\nUSE db_${teamCode.toLowerCase().replace(/-/g, '_')};\n\nCREATE TABLE IF NOT EXISTS users (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    username VARCHAR(100) NOT NULL UNIQUE,\n    email VARCHAR(150) NOT NULL UNIQUE,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`;
        }
        if (file === 'teambridge.config') {
            return `{\n  "workspace_version": "2.4.0-macOS",\n  "team_code": "${teamCode}",\n  "project": "${projectName}",\n  "stack": {\n    "frontend": "${frontendStack}",\n    "backend": "${backendStack}",\n    "database": "${dbType}",\n    "languages": ${JSON.stringify(selectedLanguages)}\n  }\n}`;
        }
        // README.md
        return `# 💻 Workspace IDE Node: ${teamCode}\n\nWelcome to the developer console for **${projectName}**.\n\n## 🛠️ Stack Configuration\n- **Frontend:** ${frontendStack}\n- **Backend:** ${backendStack}\n- **Database:** ${dbType}\n- **Languages:** ${selectedLanguages.join(', ')}\n\n## 🚀 Project Steps\n- Open files from the File Explorer in the sidebar\n- Add and coordinate sprint items in the Kanban Tasks tab\n- Chat with teammates inside the secure Team Chat\n- Observe performance metrics in the Telemetry panel`;
    };

    const currentContent = editorContents[activeFile] !== undefined ? editorContents[activeFile] : getInitialFileContent(activeFile);

    // Keyboard Ctrl+S listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveFileContent(activeFile, currentContent);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFile, currentContent]);

    const handleEditorChange = (val) => {
        setEditorContents(prev => ({
            ...prev,
            [activeFile]: val
        }));
    };

    // Kanban Task Handlers
    const toggleTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
        
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        fetch(`${__BACKEND_URL__}/api/workspace/tasks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus, email })
        })
        .then(res => res.json())
        .then(() => {
            fetchTasks();
            fetchReports();
        })
        .catch(err => console.error("Failed to toggle task.", err));
    };

    const moveTask = (id, newStatus) => {
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        fetch(`${__BACKEND_URL__}/api/workspace/tasks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus, email })
        })
        .then(res => res.json())
        .then(() => {
            fetchTasks();
            fetchReports();
        })
        .catch(err => console.error("Failed to move task.", err));
    };

    const addTask = (title, category, assignee, priority) => {
        if (!title || !title.trim()) return;
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        fetch(`${__BACKEND_URL__}/api/workspace/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_code: teamCode,
                title: title,
                category: category || "General | General",
                priority: priority || "Medium",
                status: 'To Do',
                assigned_to: assignee || null,
                email
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    alert(errData.error || "Failed to create task");
                    throw new Error(errData.error);
                });
            }
            return res.json();
        })
        .then(() => {
            fetchTasks();
            fetchReports();
        })
        .catch(err => console.error("Failed to add task.", err));
    };

    const deleteTask = (id) => {
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        fetch(`${__BACKEND_URL__}/api/workspace/tasks?id=${id}&email=${encodeURIComponent(email)}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    alert(errData.error || "Failed to delete task");
                    throw new Error(errData.error);
                });
            }
            return res.json();
        })
        .then(() => {
            fetchTasks();
            fetchReports();
        })
        .catch(err => console.error("Failed to delete task.", err));
    };

    // Chat Handler
    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            text: chatInput,
            sender: userRole || "Student",
            isMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setChatInput("");
    };

    // Document preparartion DOCX linkage handlers
    const addDocumentLink = () => {
        if (!newDocName.trim() || !newDocUrl.trim()) return;
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";
        
        fetch(`${__BACKEND_URL__}/api/workspace/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_code: teamCode,
                document_name: newDocName,
                document_url: newDocUrl,
                email: email
            })
        })
        .then(res => res.json())
        .then(() => {
            fetchDocuments();
            fetchActivities();
            setNewDocName("");
            setNewDocUrl("");
        })
        .catch(err => console.error("Failed to link document:", err));
    };

    const removeDocumentLink = (id) => {
        fetch(`${__BACKEND_URL__}/api/workspace/documents?id=${id}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(() => {
            fetchDocuments();
            fetchActivities();
        })
        .catch(err => console.error("Failed to delete document link:", err));
    };

    const executeFileUpload = (localPath) => {
        if (!uploadFile) return;
        setIsUploading(true);
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('team_code', teamCode);
        formData.append('email', email);
        if (localPath) {
            formData.append('local_path', localPath);
        }

        fetch(`${__BACKEND_URL__}/api/workspace/upload`, {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    alert(errData.error || "Failed to upload file");
                    throw new Error(errData.error);
                });
            }
            return res.json();
        })
        .then(() => {
            fetchDocuments();
            fetchActivities();
            setUploadFile(null);
            setIsUploading(false);
            alert("File uploaded and linked successfully!");
        })
        .catch(err => {
            console.error("Failed to upload file:", err);
            setIsUploading(false);
        });
    };

    // Git Handler
    const handleGitSync = () => {
        if (!commitMessage.trim()) {
            alert("Please provide a commit description message first!");
            return Promise.reject(new Error("Empty message"));
        }
        setIsSyncing(true);
        const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
        const email = session.email || "student@teambridge.edu";

        return fetch(`${__BACKEND_URL__}/api/workspace/git/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_code: teamCode,
                message: commitMessage,
                email: email
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    throw new Error(errData.error || "Git commit failed");
                });
            }
            return res.json();
        })
        .then((data) => {
            setIsSyncing(false);
            alert(data.message || `Changes successfully committed!`);
            setCommitMessage("");
            fetchActivities();
            return data;
        })
        .catch(err => {
            setIsSyncing(false);
            alert("Git Error: " + err.message);
            throw err;
        });
    };

    // Form Submission Handler
    const handleCreateWorkspaceSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            team_code: teamCode,
            frontend: frontendStack,
            backend: backendStack,
            database: dbType,
            languages: selectedLanguages
        };

        fetch(`${__BACKEND_URL__}/api/workspace/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("Could not initialize workspace.");
            return res.json();
        })
        .then(() => {
            setIsInitialized(true);
            setLoading(false);
        })
        .catch(err => {
            console.error("Initialization failed, executing offline fallback simulation:", err);
            setIsInitialized(true);
            setLoading(false);
        });
    };

    // Generate active files list dynamically
    const localScaffoldFiles = [];
    if (frontendStack !== 'None') {
        localScaffoldFiles.push('src/App.jsx');
        localScaffoldFiles.push('src/main.jsx');
    }
    if (backendStack !== 'None') {
        localScaffoldFiles.push('app.py');
        localScaffoldFiles.push('requirements.txt');
    }
    if (dbType !== 'None') {
        localScaffoldFiles.push('schema.sql');
    }
    localScaffoldFiles.push('.env');
    localScaffoldFiles.push('secrets.key');
    localScaffoldFiles.push('README.md');
    localScaffoldFiles.push('teambridge.config');

    if (loading) {
        return (
            <div className="workspace-loader-screen">
                <div className="loader-content">
                    <div className="gear-spinner">⚙️</div>
                    <h2 className="loading-status">Connecting to IDE...</h2>
                    <div className="sliding-messages-container">
                        <div className="sliding-messages-track">
                            <div className="slide-msg">It will take a minute, please be patient</div>
                            <div className="slide-msg">We are trying to fetch your IDE</div>
                            <div className="slide-msg">Setting up secure environment bindings...</div>
                            <div className="slide-msg">Connecting to live synchronization channels...</div>
                            <div className="slide-msg">It will take a minute, please be patient</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="workspace-error-screen">
                <div className="error-card">
                    <div className="error-icon">🔒</div>
                    <h3 className="error-title">Access Denied</h3>
                    <p className="error-desc">{authError}</p>
                    <button onClick={() => navigate('/workspace')} className="error-btn">
                        Return to Clusters
                    </button>
                </div>
            </div>
        );
    }

    if (!isInitialized) {
        const techLanguages = ["Python", "Java", "JavaScript", "TypeScript", "C++", "C", "C#", "Go", "Rust", "Kotlin", "Dart"];
        return (
            <div className="apple-workspace-wrapper is-setup-view">
                <div className="apple-panel-card setup-card">
                    <div className="setup-header">
                        <div>
                            <span className="setup-header-subtitle">Workspace Activation Pipeline</span>
                            <h2 className="setup-header-heading">Project Initialization Form</h2>
                        </div>
                        <button onClick={() => navigate('/workspace')} className="setup-cancel-btn">
                            Cancel Setup
                        </button>
                    </div>

                    <form onSubmit={handleCreateWorkspaceSubmit} className="setup-form">
                        {/* Section 1: Project Information */}
                        <div>
                            <h4 className="setup-section-title">1. Project Information</h4>
                            <div className="setup-form-row form-grid-responsive">
                                <div className="setup-form-field">
                                    <label>Project Name</label>
                                    <input 
                                        type="text" 
                                        value={projectName} 
                                        onChange={(e) => setProjectName(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="setup-form-field">
                                    <label>Project Type</label>
                                    <select 
                                        value={projectType} 
                                        onChange={(e) => setProjectType(e.target.value)}
                                    >
                                        <option value="Project">Project Development</option>
                                        <option value="Research">Academic Research</option>
                                        <option value="Internship">Corporate Internship</option>
                                        <option value="Hackathon">Hackathon Sprint</option>
                                    </select>
                                </div>
                            </div>
                            <div className="setup-form-field full-width">
                                <label>Project Description</label>
                                <textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Describe objectives, architecture goals, or deliverables..."
                                />
                            </div>
                        </div>

                        <hr className="setup-divider" />

                        {/* Section 2: Technology Stack Selection */}
                        <div>
                            <h4 className="setup-section-title">2. Technology Stack Selection</h4>
                            <div className="setup-tech-grid">
                                <div className="setup-form-field">
                                    <label>Frontend</label>
                                    <select value={frontendStack} onChange={(e) => setFrontendStack(e.target.value)}>
                                        <option value="None">None</option>
                                        <option value="Vanilla">Vanilla HTML/CSS/JS</option>
                                        <option value="React">React</option>
                                        <option value="Angular">Angular</option>
                                        <option value="Vue">Vue.js</option>
                                        <option value="Svelte">Svelte</option>
                                        <option value="Next.js">Next.js</option>
                                        <option value="Flutter Web">Flutter Web</option>
                                    </select>
                                </div>

                                <div className="setup-form-field">
                                    <label>Backend</label>
                                    <select value={backendStack} onChange={(e) => setBackendStack(e.target.value)}>
                                        <option value="None">None</option>
                                        <option value="Flask">Python: Flask</option>
                                        <option value="Django">Python: Django</option>
                                        <option value="FastAPI">Python: FastAPI</option>
                                        <option value="Spring Boot">Java: Spring Boot</option>
                                        <option value="Node-Express">JavaScript: Node.js + Express.js</option>
                                        <option value="Nest.js">JavaScript: Nest.js</option>
                                        <option value="Laravel">PHP: Laravel</option>
                                        <option value=".NET">C#: .NET</option>
                                    </select>
                                </div>

                                <div className="setup-form-field">
                                    <label>Database Type</label>
                                    <select value={dbType} onChange={(e) => setDbType(e.target.value)}>
                                        <option value="None">None</option>
                                        <option value="MySQL">SQL: MySQL</option>
                                        <option value="PostgreSQL">SQL: PostgreSQL</option>
                                        <option value="Oracle">SQL: Oracle</option>
                                        <option value="SQL Server">SQL: SQL Server</option>
                                        <option value="MongoDB">NoSQL: MongoDB</option>
                                        <option value="Firebase">NoSQL: Firebase</option>
                                        <option value="Supabase">NoSQL: Supabase</option>
                                        <option value="Redis">NoSQL: Redis</option>
                                        <option value="Cassandra">NoSQL: Cassandra</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Programming Languages */}
                        <div>
                            <label className="setup-lang-label">Programming Languages (Multi-Select)</label>
                            <div className="setup-lang-list">
                                {techLanguages.map((lang) => {
                                    const isSelected = selectedLanguages.includes(lang);
                                    return (
                                        <button
                                            type="button"
                                            key={lang}
                                            onClick={() => handleLanguageToggle(lang)}
                                            className={`setup-lang-btn ${isSelected ? 'is-selected' : ''}`}
                                        >
                                            {lang} {isSelected && '✓'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            className="setup-submit-btn"
                        >
                            CREATE WORKSPACE ⚡
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setSidebarOpen(false);
    };

    return (
        <div className="apple-workspace-wrapper apple-text-font is-main-view">
            
            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    className="mobile-sidebar-backdrop active"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile top-bar — hidden on desktop via CSS */}
            <div className="workspace-mobile-topbar">
                <button
                    className={`hamburger-toggle-btn ${sidebarOpen ? 'open' : ''}`}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle navigation menu"
                >
                    <span className="ham-bar" />
                    <span className="ham-bar" />
                    <span className="ham-bar" />
                </button>
                <span className="mobile-breadcrumb">
                    CANDELS IDE: {projectName || "Active Node"}
                </span>
                <div className="mobile-topbar-placeholder" />
            </div>

            <aside className={`apple-inner-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-brand">
                    <img src="/logo.png" alt="Candels Logo" className="sidebar-logo" />
                    <span className="sidebar-brand-title">CANDELS</span>
                </div>

                <div className="sidebar-scrollable-content">
                    <nav className="apple-menu-list">
                        <span className="menu-section-title">Navigation</span>
                        <button className="apple-menu-item" onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }}>
                            Dashboard
                        </button>
                        <button className="apple-menu-item" onClick={() => { navigate('/workspace'); setSidebarOpen(false); }}>
                            IDE Clusters
                        </button>
                        <button className="apple-menu-item font-semibold text-blue-600 dark:text-blue-400" onClick={() => { navigate('/settings'); setSidebarOpen(false); }}>
                            Settings
                        </button>
                    </nav>

                    <nav className="apple-menu-list">
                        <span className="menu-section-title">IDE Views</span>
                        {(() => {
                            const tabsToShow = ['Files', 'Tasks', 'Chat', 'Git', 'Documents', 'Slides', 'Implementations', 'Access & API'];
                            if (userRole === 'Faculty') {
                                tabsToShow.splice(3, 0, 'Monitor'); // Insert 'Monitor' at index 3
                                tabsToShow.push('Reports');
                            }
                            return tabsToShow.map(tab => (
                                <button 
                                    key={tab}
                                    className={`apple-menu-item ${activeTab === tab ? 'active-segment' : ''}`} 
                                    onClick={() => handleTabClick(tab)} 
                                >
                                    {tab}
                                </button>
                            ));
                        })()}
                    </nav>
                </div>

                <nav className="apple-menu-list is-bottom">
                    <span className="menu-section-title">Workspace Mode</span>
                    <button 
                        className={`apple-menu-item split-toggle-btn ${isSplitView ? 'is-active' : ''}`} 
                        onClick={() => { setIsSplitView(!isSplitView); setSidebarOpen(false); }}
                    >
                        <span>{isSplitView ? '◫' : '◻'}</span> Split Screen Mode
                    </button>
                </nav>
            </aside>

            <div className="apple-main-layout-container">
                {(activeTab === 'Files' || isSplitView) && (
                    <div className={`apple-workspace-main-panel ${isSplitView ? 'split-active' : ''}`}>
                    <div className={`apple-card-modern file-drawer-card ${isDrawerOpen ? 'is-open' : 'is-closed'}`}>
                        <div className={`file-drawer-inner ${isDrawerOpen ? 'is-open' : 'is-closed'}`}>
                            <div className="file-drawer-header">
                                <span className="file-drawer-title">
                                    Files
                                </span>
                                <span className="file-count-badge">
                                    {teamCode}
                                </span>
                            </div>
                            <div className="file-list-container">
                                {(() => {
                                    if (filesList.length === 0) {
                                        return (
                                            <div className="empty-workspace-text">
                                                Empty workspace. Use CLI or Initialize to create files.
                                            </div>
                                        );
                                    }
                                    const tree = buildFileTree(filesList);
                                    return Object.keys(tree).map(name => 
                                        renderTree(tree[name], name, 0)
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="editor-viewport-card">
                        <div className="editor-controls-bar">
                            <div className="editor-controls-left">
                                <div className="simulated-window-buttons">
                                    <span className="simulated-dot"></span>
                                    <span className="simulated-dot is-dark"></span>
                                    <span className="simulated-dot"></span>
                                </div>
                                
                                <button
                                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                                    className="apple-btn-secondary is-small"
                                    title={isDrawerOpen ? "Collapse Panel" : "Expand Panel"}
                                >
                                    <span>{isDrawerOpen ? '◀' : '▶'}</span> File Explorer
                                </button>

                                <button
                                    onClick={() => setIsSplitView(!isSplitView)}
                                    className={isSplitView ? "apple-btn-primary is-small-active" : "apple-btn-secondary is-small"}
                                    title={isSplitView ? "Disable Split Screen Mode" : "Enable Split Screen Mode"}
                                >
                                    <span>{isSplitView ? '◫' : '◻'}</span> Split Screen
                                </button>
                            </div>
                            
                            <div className="active-filepath-display">
                                <span>{projectName}</span>
                                <span className="path-dir">/</span>
                                <span className="path-filename">{activeFile}</span>
                            </div>

                            <div className="editor-actions-right">
                                {(() => {
                                    const isSensitive = activeFile.endsWith('.env') || activeFile.endsWith('.key') || activeFile.toLowerCase().includes('secret') || activeFile.toLowerCase().includes('password') || activeFile.toLowerCase().includes('credential');
                                    if (isSensitive) return null;
                                    const btnClass = `editor-save-btn ${saveSuccess ? 'save-success' : ''} ${isSaving ? 'saving' : ''}`;
                                    return (
                                        <button
                                            onClick={() => saveFileContent(activeFile, currentContent)}
                                            disabled={isSaving}
                                            className={btnClass}
                                        >
                                            {isSaving ? '⏳ Saving...' : saveSuccess ? '✓ Saved' : '💾 Save File'}
                                        </button>
                                    );
                                })()}
                                <div className="workspace-sync-indicator">
                                    <span className="pulsing-dot"></span>
                                    <span>ONLINE</span>
                                </div>
                            </div>
                        </div>

                        <div className="editor-tabs-row">
                            {filesList.map((file) => {
                                const isActive = activeFile === file;
                                const baseName = file.split('/').pop();
                                const meta = getFileIconAndColor(baseName);

                                return (
                                    <div
                                        key={file}
                                        onClick={() => setActiveFile(file)}
                                        className={`editor-tab-item vscode-mono-font ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="tab-file-icon" style={{ color: meta.color }}>{meta.icon}</span>
                                        <span>{baseName}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {(() => {
                            const isSensitive = activeFile.endsWith('.env') || activeFile.endsWith('.key') || activeFile.toLowerCase().includes('secret') || activeFile.toLowerCase().includes('password') || activeFile.toLowerCase().includes('credential');
                            if (isSensitive) {
                                return (
                                    <div className="protected-file-screen">
                                        <div className="lock-icon">🔒</div>
                                        <h3>Protected Encrypted File</h3>
                                        <p>
                                            This file (<strong>{activeFile.split('/').pop()}</strong>) is secured and contains protected parameters (API passwords, client keys, database logins). 
                                            To prevent credential theft and data breach, reading or writing to configuration files is locked within the web IDE environment.
                                        </p>
                                    </div>
                                );
                            }
                            return (
                                <div className="editor-workspace-area">
                                    <div className="editor-monaco-canvas">
                                        <Editor
                                            height="100%"
                                            width="100%"
                                            theme={localStorage.getItem('theme') === 'dark' ? 'vs-dark' : 'vs-light'}
                                            language={getFileLanguage(activeFile)}
                                            value={currentContent}
                                            options={{
                                                readOnly: permissions.mode === "viewer",
                                                fontSize: parseInt(localStorage.getItem('ide_font_size')) || 13,
                                                minimap: { enabled: true },
                                                automaticLayout: true,
                                                fontFamily: `"${localStorage.getItem('ide_font_family') || 'SF Mono'}", Monaco, Consolas, monospace`
                                            }}
                                            onChange={(val) => handleEditorChange(val || "")}
                                        />
                                    </div>

                                    {/* Sidebar Annotations Split View */}
                                    <div className="editor-sidebar-container">
                                        <div className="editor-sidebar-tabs">
                                            {['Reviews', 'Tasks', 'Chat'].map((tab) => {
                                                const isActive = editorSidebarTab === tab;
                                                return (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setEditorSidebarTab(tab)}
                                                        className={`editor-sidebar-tab-btn ${isActive ? 'is-active' : 'is-inactive'}`}
                                                    >
                                                        {tab}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Dynamic Tab Contents */}
                                        <div className="editor-sidebar-content">
                                            {editorSidebarTab === 'Reviews' && (
                                                <div className="editor-comments-panel">
                                                    <div className="editor-comments-list">
                                                        {fileComments.length === 0 ? (
                                                            <div className="empty-comments-text">
                                                                No review comments. Use form below to submit feedback on code lines.
                                                            </div>
                                                        ) : (
                                                            fileComments.map(c => {
                                                                const match = (c.text || "").match(/^\[Ref Task:\s*#(\d+)\]\s*(.*)$/s);
                                                                const taskId = match ? match[1] : null;
                                                                const commentText = match ? match[2] : c.text;

                                                                return (
                                                                    <div key={c.id} className="editor-comment-card">
                                                                        <div className="comment-header-row">
                                                                            <span className="comment-author-name" title={c.created_by}>
                                                                                {c.created_by.split('@')[0]}
                                                                            </span>
                                                                            <span className="comment-line-badge">
                                                                                Ln {c.line_number}
                                                                            </span>
                                                                        </div>
                                                                        {taskId && (
                                                                            <div 
                                                                                onClick={() => {
                                                                                    sessionStorage.setItem('tb_highlight_task', taskId);
                                                                                    setActiveTab('Tasks');
                                                                                    window.dispatchEvent(new CustomEvent('highlight-task', { detail: { taskId } }));
                                                                                }}
                                                                                className="comment-task-badge"
                                                                            >
                                                                                📋 Task #{taskId}
                                                                            </div>
                                                                        )}
                                                                        <p className="comment-text-body">{commentText}</p>
                                                                        <span className="comment-timestamp">{c.created_at}</span>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                    
                                                    {/* New review comment input */}
                                                    <div className="editor-comment-form">
                                                        <div className="form-row-align">
                                                            <label className="form-label-small">Target Line:</label>
                                                            <select 
                                                                value={commentLine} 
                                                                onChange={(e) => setCommentLine(parseInt(e.target.value))}
                                                                className="form-select-small"
                                                            >
                                                                {Array.from({ length: Math.max(currentContent.split('\n').length, 1) }).map((_, i) => (
                                                                    <option key={i + 1} value={i + 1}>Line {i + 1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="form-row-align">
                                                            <label className="form-label-small">Link Task:</label>
                                                            <select 
                                                                value={selectedTaskId} 
                                                                onChange={(e) => setSelectedTaskId(e.target.value)}
                                                                className="form-select-small"
                                                            >
                                                                <option value="">-- None --</option>
                                                                {tasks.map(t => (
                                                                    <option key={t.id} value={t.id}>#{t.id}: {t.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <textarea 
                                                            value={newCommentText}
                                                            onChange={(e) => setNewCommentText(e.target.value)}
                                                            placeholder="Enter line feedback..."
                                                            className="form-textarea-small"
                                                        />
                                                        <button 
                                                            onClick={addCodeComment}
                                                            className="apple-btn-primary btn-submit-comment" 
                                                        >
                                                            Add Review Note
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {editorSidebarTab === 'Tasks' && (
                                                <Tasks 
                                                    isCompact={true}
                                                    tasks={tasks}
                                                    teamMembers={teamMembers}
                                                    userRole={userRole}
                                                    teamCode={teamCode}
                                                    permissions={permissions}
                                                    addTask={addTask}
                                                    deleteTask={deleteTask}
                                                    toggleTask={toggleTask}
                                                    moveTask={moveTask}
                                                />
                                            )}

                                            {editorSidebarTab === 'Chat' && (
                                                <Chat 
                                                    isCompact={true}
                                                    teamCode={teamCode}
                                                    permissions={permissions}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="editor-status-footer">
                            <div>UTF-8</div>
                            <div className="editor-status-right">
                                <span>Ln {currentContent.split('\n').length}, Col {currentContent.length}</span>
                                <span>JavaScript React</span>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {activeTab !== 'Files' && (
                    <div className={`apple-card-modern workspace-form-card ${isSplitView ? 'split-active' : ''} ${activeTab === 'Documents' ? 'docs-tab' : ''}`}>
                    <ErrorBoundary>
                    {activeTab === 'Tasks' && (
                        <Tasks
                            tasks={tasks}
                            teamMembers={teamMembers}
                            userRole={userRole}
                            teamCode={teamCode}
                            permissions={permissions}
                            newTaskTitle={newTaskTitle}
                            setNewTaskTitle={setNewTaskTitle}
                            assignedTo={assignedTo}
                            setAssignedTo={setAssignedTo}
                            newTaskPriority={newTaskPriority}
                            setNewTaskPriority={setNewTaskPriority}
                            addTask={addTask}
                            deleteTask={deleteTask}
                            toggleTask={toggleTask}
                            moveTask={moveTask}
                        />
                    )}
                    {activeTab === 'Chat' && (
                        <Chat
                            teamCode={teamCode}
                            permissions={permissions}
                        />
                    )}
                    {activeTab === 'Monitor' && (
                        <Monitor
                            telemetryData={telemetryData}
                            activities={activities}
                        />
                    )}
                    {activeTab === 'Git' && (
                        <GitController
                            commitMessage={commitMessage}
                            setCommitMessage={setCommitMessage}
                            isSyncing={isSyncing}
                            handleGitSync={handleGitSync}
                            permissions={permissions}
                            teamCode={teamCode}
                        />
                    )}
                    {activeTab === 'Documents' && (
                        <Documents
                            permissions={permissions}
                            newDocName={newDocName}
                            setNewDocName={setNewDocName}
                            newDocUrl={newDocUrl}
                            setNewDocUrl={setNewDocUrl}
                            addDocumentLink={addDocumentLink}
                            uploadFile={uploadFile}
                            setUploadFile={setUploadFile}
                            executeFileUpload={executeFileUpload}
                            isUploading={isUploading}
                            documents={documents}
                            removeDocumentLink={removeDocumentLink}
                            teamCode={teamCode}
                        />
                    )}
                    {activeTab === 'Slides' && (
                        <PresentationEngine
                            teamCode={teamCode}
                            permissions={permissions}
                        />
                    )}
                    {activeTab === 'Reports' && userRole === 'Faculty' && (
                        <Reports
                            tasks={tasks}
                            reportsData={reportsData}
                        />
                    )}
                    {activeTab === 'Implementations' && (
                        <Implementations
                            teamCode={teamCode}
                            userRole={userRole}
                        />
                    )}
                    {activeTab === 'Access & API' && (
                        <SettingsTab
                            teamCode={teamCode}
                            projectName={projectName}
                            frontendStack={frontendStack}
                            backendStack={backendStack}
                            dbType={dbType}
                            selectedLanguages={selectedLanguages}
                            userRole={userRole}
                        />
                    )}
                    </ErrorBoundary>
                    </div>
                )}
            </div>
        </div>
    );
}

function SettingsTab({ teamCode, projectName, frontendStack, backendStack, dbType, selectedLanguages, userRole }) {
    const [apiKeys, setApiKeys] = React.useState([]);
    const [newDeviceName, setNewDeviceName] = React.useState("");
    const [newlyGeneratedKey, setNewlyGeneratedKey] = React.useState("");
    const [langTab, setLangTab] = React.useState("Node");
    
    const [presetProfile, setPresetProfile] = React.useState("University/Capstone Mode");
    const [maxFileSizeMb, setMaxFileSizeMb] = React.useState(2.0);
    const [allowedExtensions, setAllowedExtensions] = React.useState("");
    const [ignoredFolders, setIgnoredFolders] = React.useState("");
    
    const [successMessage, setSuccessMessage] = React.useState("");

    const session = JSON.parse(sessionStorage.getItem("user_session") || "{}");
    const userEmail = session.email || "student@teambridge.edu";

    const isAuthorized = userRole === "Leader" || userRole === "Faculty";

    const fetchKeys = () => {
        fetch(`${__BACKEND_URL__}/api/cli/keys/list?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                setApiKeys(data.keys);
            }
        })
        .catch(err => console.error("Failed to fetch API keys:", err));
    };

    const fetchSettings = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/settings?team_code=${teamCode}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === "success" && data.settings) {
                setPresetProfile(data.settings.preset_profile);
                setMaxFileSizeMb(data.settings.max_file_size_mb);
                setAllowedExtensions(data.settings.allowed_extensions);
                setIgnoredFolders(data.settings.ignored_folders);
            }
        })
        .catch(err => console.error("Failed to fetch settings:", err));
    };

    React.useEffect(() => {
        fetchKeys();
        fetchSettings();
    }, [teamCode, userEmail]);

    const handleGenerateKey = () => {
        if (!newDeviceName.trim()) {
            alert("Please specify a device name.");
            return;
        }
        fetch(`${__BACKEND_URL__}/api/cli/keys/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, device_name: newDeviceName })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                setNewlyGeneratedKey(data.key);
                setNewDeviceName("");
                fetchKeys();
            } else {
                alert("Generation failed: " + data.message);
            }
        })
        .catch(err => alert("Failed to generate key: " + err.message));
    };

    const handleRevokeKey = (keyId) => {
        if (!window.confirm("Are you sure you want to revoke this Developer API Key? Any CLI daemon using this key will immediately be disconnected.")) return;
        fetch(`${__BACKEND_URL__}/api/cli/keys/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_id: keyId, email: userEmail })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                fetchKeys();
            } else {
                alert("Revocation failed: " + data.message);
            }
        })
        .catch(err => alert("Failed to revoke key: " + err.message));
    };

    const handleSaveSettings = () => {
        fetch(`${__BACKEND_URL__}/api/workspace/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_code: teamCode,
                user_email: userEmail,
                preset_profile: presetProfile,
                max_file_size_mb: parseFloat(maxFileSizeMb),
                allowed_extensions: allowedExtensions,
                ignored_folders: ignoredFolders
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                setSuccessMessage("Workspace settings updated successfully.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else {
                alert("Save failed: " + data.error);
            }
        })
        .catch(err => alert("Failed to save settings: " + err.message));
    };

    const getCommand = () => {
        switch(langTab) {
            case "Node": return "npm install -g teambridge-cli";
            case "Python": return "pip install teambridge-cli";
            case "PHP": return "composer global require teambridge/cli";
            case "Java": return "curl -sSL https://get.teambridge.io | sh";
            default: return "npm install -g teambridge-cli";
        }
    };

    return (
        <div className="console-hub-container">
            <div className="console-header">
                <span className="console-subtitle">Console Hub</span>
                <h2 className="console-title">Developer Access & Integration Console</h2>
                <p className="console-description">Manage SaaS workspace synchronization parameters, security profiles, and terminal API credentials.</p>
            </div>

            <div className="console-panels-grid settings-grid-responsive">
                {/* Column 1: CLI Connection & Developer Tokens */}
                <div className="console-btn-group">
                    <div className="console-card">
                        <h3 className="console-card-title">💻 TeamBridge CLI Connection</h3>
                        <p className="console-card-desc">
                            Install the TeamBridge terminal utility to link your local code editor (VS Code, Cursor) directly to this collaborative web environment.
                        </p>

                        <div className="console-btn-group">
                            <div className="console-subheading">Step 1: Install the package</div>
                            
                            {/* Dynamic Language Switcher Bar */}
                            <div className="console-tab-row">
                                {["Node", "Python", "PHP", "Java"].map(lang => (
                                    <button 
                                        key={lang}
                                        onClick={() => setLangTab(lang)}
                                        className={`console-tab-btn ${langTab === lang ? 'is-active' : 'is-inactive'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>

                            <div className="console-terminal-box">
                                <span>{getCommand()}</span>
                                <button onClick={() => navigator.clipboard.writeText(getCommand())} className="console-terminal-btn">📋</button>
                            </div>

                            <div className="console-subheading">Step 2: Authenticate Terminal</div>
                            <div className="console-terminal-box">
                                <span>tb login</span>
                                <button onClick={() => navigator.clipboard.writeText("tb login")} className="console-terminal-btn">📋</button>
                            </div>

                            <div className="console-subheading">Step 3: Link folder & Sync</div>
                            <div className="console-terminal-box">
                                <span>tb init && tb link</span>
                                <button onClick={() => navigator.clipboard.writeText("tb init && tb link")} className="console-terminal-btn">📋</button>
                            </div>
                        </div>
                    </div>

                    <div className="api-keys-table-card">
                        <h3>🔑 Developer API Tokens</h3>
                        <p>
                            Generate long-lived API keys (`tb_live_...`) to easily authenticate CI pipelines or persistent dev machines without passwords.
                        </p>

                        {/* Keys List (Cryptographic Table Row View) */}
                        <div className="api-keys-table-wrapper">
                            {apiKeys.length === 0 ? (
                                <div className="api-keys-empty-text">No active Developer API Keys.</div>
                            ) : (
                                <table className="api-keys-table">
                                    <thead>
                                        <tr className="api-keys-th-row">
                                            <th className="api-keys-th">Device</th>
                                            <th className="api-keys-th">Token ID</th>
                                            <th className="api-keys-th">Created</th>
                                            <th className="api-keys-th">Last Used</th>
                                            <th className="api-keys-th">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apiKeys.map(k => (
                                            <tr key={k.id} className="api-keys-tr">
                                                <td className="api-keys-td is-device">{k.device_name}</td>
                                                <td className="api-keys-td is-token">tb_live_••••</td>
                                                <td className="api-keys-td is-date">{k.created_at ? k.created_at.split(' ')[0] : 'N/A'}</td>
                                                <td className="api-keys-td is-date">{k.last_used_at ? k.last_used_at.split(' ')[0] : 'Never'}</td>
                                                <td className="api-keys-td">
                                                    <button 
                                                        onClick={() => handleRevokeKey(k.id)}
                                                        className="api-keys-revoke-btn"
                                                    >
                                                        Revoke
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Interactive Popup Generation Modal Console Overlay */}
                        {newlyGeneratedKey && (
                            <div className="api-key-modal-backdrop">
                                <div className="api-key-modal-card">
                                    <h3 className="api-key-modal-title">
                                        🔑 New Developer Token Spawned
                                    </h3>
                                    <p>
                                        Copy your new developer API token now. For security purposes, this token **will never be shown again**.
                                    </p>
                                    
                                    <div className="api-key-modal-input-row">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={newlyGeneratedKey}
                                            className="api-key-modal-input"
                                        />
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(newlyGeneratedKey);
                                                alert("Developer API Key copied to clipboard.");
                                            }}
                                            className="api-key-modal-copy-btn"
                                        >
                                            Copy
                                        </button>
                                    </div>

                                    <div className="api-key-modal-warning-box">
                                        <span className="warning-icon">⚠️</span>
                                        <div className="warning-text">
                                            Once you click close, this token is permanently masked in our database. Store it in a secret vault (e.g. environment variable or password manager).
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setNewlyGeneratedKey("")}
                                        className="api-key-modal-close-btn"
                                    >
                                        Close & Lock Console
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Generate Form */}
                        <div className="console-device-input-row">
                            <input 
                                type="text" 
                                placeholder="Device Name (e.g. Mac Studio)" 
                                value={newDeviceName}
                                onChange={(e) => setNewDeviceName(e.target.value)}
                                className="console-device-input"
                            />
                            <button 
                                onClick={handleGenerateKey} 
                                className="console-device-submit-btn"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Column 2: Workspace Sync Controls */}
                <div className="console-btn-group">
                    <div className="console-card">
                        <h3 className="console-card-title">🛡️ Anti-Gravity Workspace Core</h3>
                        <p className="console-card-desc">
                            Configure rules governing the live directory watchers and web synchronization boundaries.
                        </p>

                        {!isAuthorized && (
                            <div className="watchdog-core-warning">
                                🔒 Read-Only Mode: Only Team Leaders or Faculty can modify workspace sync settings.
                            </div>
                        )}

                        <div className="watchdog-core-flex-group">
                            {/* Preset Profile */}
                            <div className="watchdog-core-field-group">
                                <label className="watchdog-core-label">Preset Mode Profile</label>
                                <select 
                                    disabled={!isAuthorized}
                                    value={presetProfile}
                                    onChange={(e) => setPresetProfile(e.target.value)}
                                >
                                    <option value="University/Capstone Mode">University/Capstone Mode</option>
                                    <option value="Corporate/R&D Mode">Corporate/R&D Mode</option>
                                </select>
                                <span className="watchdog-core-desc">
                                    {presetProfile === "Corporate/R&D Mode" 
                                        ? "Corporate/R&D Mode: Restricts access to raw logs (*.log), proprietary files, and enforces strict security controls."
                                        : "University/Capstone Mode: Standard sync rules for school projects and open collaborations."
                                    }
                                </span>
                            </div>

                            {/* Max File Size Limit */}
                            <div className="watchdog-core-field-group">
                                <div className="watchdog-slider-row">
                                    <label className="watchdog-core-label">Max Upload File Size (MB)</label>
                                    <span className="watchdog-slider-val">{maxFileSizeMb} MB</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="10.0" 
                                    step="0.5"
                                    disabled={!isAuthorized}
                                    value={maxFileSizeMb}
                                    onChange={(e) => setMaxFileSizeMb(parseFloat(e.target.value))}
                                    className="watchdog-slider-input"
                                />
                                <span className="watchdog-core-desc">Watchdog daemon will skip files larger than this threshold.</span>
                            </div>

                            {/* Allowed Extensions */}
                            <div className="watchdog-core-field-group">
                                <label className="watchdog-core-label">Allowed File Extensions</label>
                                <input 
                                    type="text" 
                                    disabled={!isAuthorized}
                                    value={allowedExtensions}
                                    placeholder="e.g. .py,.js,.jsx,.ts,.tsx,.css,.html,.json"
                                    onChange={(e) => setAllowedExtensions(e.target.value)}
                                />
                                <span className="watchdog-core-desc">Comma-separated whitelist of extensions synced by local CLI. (Empty means any extension allowed)</span>
                            </div>

                            {/* Ignored Folders */}
                            <div className="watchdog-core-field-group">
                                <label className="watchdog-core-label">Ignored Directory Paths</label>
                                <input 
                                    type="text" 
                                    disabled={!isAuthorized}
                                    value={ignoredFolders}
                                    placeholder="e.g. .git,node_modules,venv,env"
                                    onChange={(e) => setIgnoredFolders(e.target.value)}
                                />
                                <span className="watchdog-core-desc">Directories ignored during watchdog file scans.</span>
                            </div>

                            {/* Save Settings Action */}
                            {isAuthorized && (
                                <div className="console-btn-group">
                                    <button 
                                        onClick={handleSaveSettings}
                                        className="watchdog-save-btn"
                                    >
                                        Save Workspace Core Settings ⚡
                                    </button>
                                    {successMessage && (
                                        <div className="watchdog-status-msg">
                                            {successMessage}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}