# 🕯️ Candles CLI (TeamBridge Ecosystem)

[![PyPI version](https://img.shields.io/pypi/v/teambridge-candles.svg)](https://pypi.org/)
[![Python](https://img.shields.io/badge/python-3.13+-blue.svg)](https://python.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

Candles CLI (`teambridge-candles`) is a developer-focused real-time workspace synchronization tool built for the **TeamBridge ecosystem**.

It connects your local development environment with TeamBridge cloud workspaces and provides:

- Real-time file synchronization
- Cloud workspace management
- Team collaboration
- Version tracking
- Developer workflow automation


## 🌐 Platform

Workspace Portal:

https://candels1921.vercel.app/



---

# ✨ Features

## ⚡ Real-Time Synchronization

Candles watches your project directory and syncs:

- New files
- Updated files
- Deleted files
- Folder structures
- Workspace changes


Architecture:

```
Local Project

      ↓

Candles CLI

      ↓

File Watcher

      ↓

WebSocket Sync Engine

      ↓

TeamBridge Cloud

      ↓

Workspace Dashboard
```


---

# 🚀 Installation

Install:

```bash
pip install teambridge-candles
```

Run:

```bash
candles
```

or:

```bash
cn
```


Both commands are identical.


---

# 🔐 Authentication Commands


## Login

```bash
cn login
```

Connect your local CLI with your TeamBridge account.


Example:

```
🕯️ Candles Authentication

Email:
developer@example.com

Password:
********

✓ Login successful
```


---

## Logout

```bash
cn logout
```

Clears local authentication session.

Output:

```
✓ Session cleared safely
```


---

## Who Am I

```bash
cn whoami
```

Displays:

- Current user
- Email
- Role
- Connection status


Example:

```
Candles Account

Name:
Developer

Email:
developer@example.com

Role:
Developer

Connected:
Yes
```


---

# 📂 Workspace Commands


## Create Workspace

```bash
cn create
```

Opens TeamBridge workspace creation console.


Creates:

- Workspace
- Cloud storage
- Team configuration


---

## Select Workspace

```bash
cn select
```

Connect an existing workspace to your current folder.


Flow:

```
Fetch projects

↓

Choose workspace

↓

Select location

↓

Create .candles context
```


Options:

```
1. Current folder

2. Create new folder
```


Creates:

```
.candles/

   config.json

   workspace.json
```


---

## Switch Workspace

```bash
cn switch <workspace>
```


Example:

```bash
cn switch TeamBridge
```


Changes current workspace context instantly.


---

## List Workspaces

```bash
cn list
```


Example:

```
WORKSPACES


ID              NAME

TB-39201        TeamBridge

TB-44192        Portfolio
```


---

## Delete Workspace

```bash
cn delete <workspace>
```


Deletes:

- Cloud files
- History
- Workspace data


Requires confirmation.


---

## Workspace Info

```bash
cn info
```


Displays:

```
Workspace Information


Name:
TeamBridge


Files:
240


Storage:
20 MB


Last Sync:
10 seconds ago
```


---

# ⚡ Sync Commands


## Start Live Sync

```bash
cn link
```


Starts:

- File watcher
- WebSocket connection
- Real-time upload engine


Example:

```
Connecting...

✓ WebSocket Connected

Watching project...


Sync Active
```


---

## Stop Sync

```bash
cn unlink
```


Stops:

- File watcher
- Sync connection


Files remain safe locally.


---

## Push Changes

```bash
cn push
```


Uploads local changes manually.


Example:

```
Scanning...


Added:
app.py


Modified:
App.jsx


✓ Upload Complete
```


---

## Pull Changes

```bash
cn pull
```


Downloads cloud workspace updates.


Example:

```
Downloading:


README.md

backend/app.py

frontend/App.jsx


✓ Workspace updated
```


---

## Compare Changes

```bash
cn diff
```


Shows:

Local changes:

```
+ new.py

M app.js

- old.css
```


Remote changes:

```
M backend.py
```


---

# 📁 File Commands


## Delete File

```bash
cn drop <file>
```


Example:

```bash
cn drop backend/test.py
```


Removes:

- Local file
- Cloud copy


---

## Restore File

```bash
cn restore <file>
```


Recovers deleted files from workspace history.


Example:

```bash
cn restore app.py
```


---

## File History

```bash
cn history <file>
```


Shows file versions.


Example:

```
VERSION HISTORY


v3

Modified


v2

Updated


v1

Created
```


---

# 👥 Team Commands


## Members

```bash
cn members
```


Shows workspace members.


Example:

```
TEAM MEMBERS


Developer     Owner

Alex          Developer

Sam           Viewer
```


---

## Invite Member

```bash
cn invite <email>
```


Example:

```bash
cn invite alex@gmail.com
```


Sends workspace invitation.


---

# ⚙️ Configuration Commands


## View Config

```bash
cn config-get
```


Displays:

```
API:
Production


Sync Interval:
2 seconds


Max File Size:
2MB
```


---

## Update Config

```bash
cn config-set <key> <value>
```


Example:

```bash
cn config-set sync 5
```


Updates local CLI behavior.


---

# 🩺 Doctor Command


## System Check

```bash
cn doctor
```


Checks:


✓ Python version

✓ Internet connection

✓ API availability

✓ Authentication

✓ Workspace connection

✓ Folder permissions


Example:

```
Candles Doctor


✓ Python 3.13

✓ API Online

✓ Token Valid

✓ Workspace Linked


Everything looks good
```


---

# 📜 Logs


## View Logs

```bash
cn logs
```


Shows:

- Upload events
- Delete events
- Sync activity
- Errors


Options:


Today:

```bash
cn logs --today
```


Only errors:

```bash
cn logs --errors
```


---

# 🚫 Default Ignored Files


Candles automatically ignores:


```
.git

.candles

node_modules

__pycache__

*.pyc

venv

env

virtualenv

dist

build
```


Improves:

- Performance
- Sync speed
- Bandwidth usage


---

# 🔒 Security


Candles uses:


- JWT Authentication
- Secure API requests
- Session protection
- Cloud authorization


Passwords are never stored as plain text.


---

# 🛠 Technology Stack


Built with:


- Python
- Click CLI
- Watchdog
- WebSockets
- REST API
- JWT
- Cloud Storage


---

# 📦 Package


Install:

```bash
pip install teambridge-candles
```


Commands:


```
cn login

cn select

cn link

cn pull

cn push

cn status

cn doctor
```


---

# 🔄 Version History


| Version | Status | Description |
|-|-|-|
| v1.0.0 | Deprecated | Initial sync engine |
| v1.0.1 | Stable | Sync improvements |
| v1.0.4 | Latest | Workspace switching + CLI improvements |


---

# 🤝 Contributing


Clone:

```bash
git clone <repository>
```


Install:

```bash
pip install -r requirements.txt
```


Create your feature branch and submit changes.


---

# 🛡 License


MIT License


---

# 🕯️ Candles CLI

**Code locally. Sync instantly. Build together.**