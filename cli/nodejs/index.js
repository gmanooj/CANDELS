#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');
const chokidar = require('chokidar');
const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BACKEND_URL = process.env.CANDELS_BACKEND_URL || 'http://localhost:5000';
const GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.candels_session.json');
const LOCAL_CONFIG_PATH = path.join(process.cwd(), '.candels_config.json');

// Helper to save global session
function saveSession(token, email, teamCode, projectName) {
  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify({ token, email, teamCode, projectName }, null, 2));
}

// Helper to load global session
function loadSession() {
  if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8'));
  }
  return null;
}

// Helper to save local workspace context
function saveLocalContext(teamCode, projectName) {
  fs.writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify({ teamCode, projectName }, null, 2));
}

// Helper to load local workspace context
function loadLocalContext() {
  if (fs.existsSync(LOCAL_CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf-8'));
  }
  return null;
}

program
  .name('candels')
  .description('Candels Global CLI Tool - Evolve your workspace into a collaborative SaaS environment')
  .version('1.0.0');

program
  .command('login')
  .description('Securely connect your terminal environment to your Candels profile')
  .action(async () => {
    console.log('[Cloud] Connecting to Candels Cloud Services...');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = query => new Promise(resolve => readline.question(query, resolve));

    const email = await ask('Enter your registered email: ');
    const password = await ask('Enter your password: ');
    readline.close();

    const deviceName = os.hostname();

    try {
      const response = await axios.post(`${BACKEND_URL}/api/cli/login`, {
        email,
        password,
        device_name: deviceName
      });

      if (response.status === 200) {
        const token = response.data.token;
        console.log('\n[Success] Authenticated successfully!');
        
        // Fetch projects
        const projRes = await axios.get(`${BACKEND_URL}/api/cli/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let selectedTeam = null;
        let selectedProject = null;
        
        if (projRes.status === 200 && projRes.data.projects?.length > 0) {
          const projects = projRes.data.projects;
          console.log('\n[Projects] Available Candels Projects:');
          projects.forEach((p, idx) => {
            console.log(`  [${idx + 1}] ${p.project_title} (Team: ${p.team_code})`);
          });
          
          selectedTeam = projects[0].team_code;
          selectedProject = projects[0].project_title;
          console.log(`[Auto-Selected] Project: ${selectedProject} (${selectedTeam})`);
        }

        saveSession(token, email, selectedTeam, selectedProject);
        console.log(`\n[Success] Session persisted cleanly on device: ${deviceName}`);
      }
    } catch (err) {
      console.error('[Error] Authentication failed:', err.response?.data?.message || err.message);
    }
  });

program
  .command('init')
  .description('Initialize a project workspace in the current folder')
  .action(() => {
    const session = loadSession();
    if (!session) {
      console.log('[Warning] No active profile found. Run "candels login" first.');
      return;
    }
    saveLocalContext(session.teamCode, session.projectName);
    console.log(`[Local] Folder initialized and linked to Candels workspace: ${session.projectName} (${session.teamCode})`);
  });

program
  .command('link')
  .description('Upload local folder structure and auto-sync changes to the Web IDE in real-time')
  .action(() => {
    const session = loadSession();
    const localCtx = loadLocalContext();
    if (!session || !localCtx) {
      console.log('[Error] Workspace not initialized. Please run "candels login" and "candels init" first.');
      return;
    }

    console.log(`[Link] Syncing and watching files for project ${localCtx.projectName}...`);

    // Connect real-time WebSocket client
    const socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log(`[WebSocket] Linked to sync server at ${BACKEND_URL}`);
    });

    const watcher = chokidar.watch('.', {
      ignored: /(^|[\/\\])\..|node_modules|__pycache__/
    });

    watcher.on('change', filePath => {
      console.log(`[File Modified] ${filePath}`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        socket.emit('cli_file_stream', {
          auth_token: session.token,
          team_code: localCtx.teamCode,
          files: [{
            path: filePath.replace(/\\/g, '/'),
            content: content.toString('base64'),
            deleted: false
          }]
        });
      }
    });

    watcher.on('unlink', filePath => {
      console.log(`[File Deleted] ${filePath}`);
      socket.emit('cli_file_stream', {
        auth_token: session.token,
        team_code: localCtx.teamCode,
        files: [{
          path: filePath.replace(/\\/g, '/'),
          deleted: true
        }]
      });
    });
  });

program
  .command('status')
  .description('Check the status of your current local terminal workspace profile')
  .action(() => {
    const session = loadSession();
    const localCtx = loadLocalContext();
    if (!session) {
      console.log('[Warning] No active profile. Please run "candels login" first.');
      return;
    }
    console.log('[Status] Candels CLI Status:');
    console.log(`  Logged In As: ${session.email}`);
    console.log(`  Linked Project (Local): ${localCtx ? localCtx.projectName : 'None'}`);
  });

program
  .command('logout')
  .description('Clear local session storage files to log out safely')
  .action(() => {
    if (fs.existsSync(GLOBAL_CONFIG_PATH)) fs.unlinkSync(GLOBAL_CONFIG_PATH);
    console.log('[Success] Logged out. Local session cleared.');
  });

program.parse(process.argv);
