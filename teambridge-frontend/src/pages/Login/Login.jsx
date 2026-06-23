import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoaderPortal from "../../components/LoaderPortal/LoaderPortal";
import IntroSplash from "../../components/IntroSplash/IntroSplash";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  // Core Form Validation States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Portal State Controls: 'idle' | 'loading' | 'success'
  const [statusState, setStatusState] = useState("idle");

  // TWO-PAGE CAROUSEL STATE MACHINE FLAG: false = Full Screen Landing, true = Full Screen Login Form
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Splash Screen State
  const [splashActive, setSplashActive] = useState(() => sessionStorage.getItem("intro_shown") !== "true");

  // LANDING PAGE INTERACTIVE VIEW STATES
  const [activeFeatureTab, setActiveFeatureTab] = useState("scaffold");
  const [activeUserRoleTab, setActiveUserRoleTab] = useState("students");

  // ==========================================
  // GOOGLE OAUTH IDENTITY INTEGRATION
  // ==========================================
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      /* global google */
      if (typeof google !== "undefined") {
        google.accounts.id.initialize({
          client_id: "1013028712991-mtu8me83bblfi3nqd423e8jvsl6u15cm.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
          ux_mode: "redirect"
        });

        google.accounts.id.renderButton(
          document.getElementById("google-signin-target"),
          { theme: "outline", size: "large", width: 340, text: "signin_with" }
        );
      }
    };

    if (typeof google !== "undefined") {
      initializeGoogleSignIn();
    } else {
      const scriptCheckInterval = setInterval(() => {
        if (typeof google !== "undefined") {
          initializeGoogleSignIn();
          clearInterval(scriptCheckInterval);
        }
      }, 100);
      return () => clearInterval(scriptCheckInterval);
    }
  }, []);

  const triggerAuthorizationSuccess = (userPayload, tokenPayload) => {
    setStatusState("success");

    try {
      const audio = new Audio("/success.mp3");
      audio.volume = 0.4;
      audio.play();
    } catch (soundErr) {
      console.log("Audio play blocked due to user session constraints.", soundErr);
    }

    // 🔒 Persist token structure inside sessionStorage to achieve strict tab isolation
    sessionStorage.setItem("auth_token", tokenPayload);
    sessionStorage.setItem("user_session", JSON.stringify(userPayload));

    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const handleGoogleCredentialResponse = async (googleResponse) => {
    setErrorMessage("");
    setStatusState("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/login/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: googleResponse.credential })
      });

      const serverPayload = await response.json();
      if (!response.ok) throw new Error(serverPayload.error || "Google authorization failed.");

      setTimeout(() => {
        triggerAuthorizationSuccess(serverPayload.user, serverPayload.token);
      }, 1200);

    } catch (err) {
      setStatusState("idle");
      setErrorMessage(err.message);
    }
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusState("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const serverPayload = await response.json();
      if (!response.ok) throw new Error(serverPayload.error || "Login verification phase failed.");

      setTimeout(() => {
        triggerAuthorizationSuccess(serverPayload.user, serverPayload.token);
      }, 1200);

    } catch (err) {
      setStatusState("idle");
      setErrorMessage(err.message);
    }
  };

  return (
    <div className={`login-viewport-container ${isWorkspaceOpen ? "panel-active-view" : "panel-hidden-right"}`}>

      <IntroSplash onComplete={() => setSplashActive(false)} />

      <LoaderPortal statusState={statusState} />

      <div className="sliding-stage-wrapper">

        {/* ======================================================================
            🌐 PAGE 1: 100% FULL-SCREEN SCROLLABLE SAAS LIGHT LANDING ENVIRONMENT
            ====================================================================== */}
        <div className="landing-page-full">

          {/* Top Header Navbar Row */}
          <div className="logo-box-full">
            <div className="logo-layout-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: splashActive ? 0 : 1, transition: 'opacity 0.3s ease' }}>
                <img src="/logo.png" alt="Candels Logo" style={{ height: '45px', objectFit: 'cover' }} />
                <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px', color: '#1d1d1f' }}>CANDELS</span>
              </div>
            </div>
            <button className="action-launch-workspace-btn" onClick={() => setIsWorkspaceOpen(true)}>
              Sign In to Portal
            </button>
          </div>

          {/* Core Typography Billboard */}
          <div className="hero-intro-text-block">
            <h2>Code Coordinate Deliver<br /> All in One Canvas.</h2>
            <p>
              Connect with your project squads, link seamlessly with faculty mentors,
              track timeline components, and organize documentation files inside an
              isolated, high-performance university workspace framework.
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="hero-btn-primary" onClick={() => setIsWorkspaceOpen(true)}>
                Launch Team Workspace →
              </button>
              <a href="#how-it-works" className="hero-btn-secondary">
                Learn How It Works
              </a>
            </div>
          </div>

          {/* Efficiency Performance Dashboard Panel */}
          <div className="landing-dashboard-metrics">
            <div className="dashboard-metric-card">
              <span className="metric-big-number">100%</span>
              <span className="metric-desc-lbl">Tenant Isolation</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="metric-big-number">&lt; 150ms</span>
              <span className="metric-desc-lbl">Sync Latency</span>
            </div>
            <div className="dashboard-metric-card">
              <span className="metric-big-number">4.8x</span>
              <span className="metric-desc-lbl">Review Velocity</span>
            </div>
          </div>

          {/* SECTION 2: INTERACTIVE FEATURE SHIELD EXPLORER */}
          <div className="landing-section">
            <div className="section-header-centered">
              <span className="section-badge">Product Capabilities</span>
              <h3>Engineered Platform Architecture</h3>
              <p>Explore the unified toolset crafted to bridge the gap between development teams and project mentors.</p>
            </div>

            {/* Interactive Feature Navigation Tabs */}
            <div className="landing-tabs-row">
              <button
                className={`tab-btn-pill ${activeFeatureTab === 'scaffold' ? 'active' : ''}`}
                onClick={() => setActiveFeatureTab('scaffold')}
              >
                💻 Web IDE & Scaffolding
              </button>
              <button
                className={`tab-btn-pill ${activeFeatureTab === 'e2ee' ? 'active' : ''}`}
                onClick={() => setActiveFeatureTab('e2ee')}
              >
                🔒 Client-Side E2EE Chat
              </button>
              <button
                className={`tab-btn-pill ${activeFeatureTab === 'gallery' ? 'active' : ''}`}
                onClick={() => setActiveFeatureTab('gallery')}
              >
                🖼️ Milestone Gallery
              </button>
              <button
                className={`tab-btn-pill ${activeFeatureTab === 'monitor' ? 'active' : ''}`}
                onClick={() => setActiveFeatureTab('monitor')}
              >
                📊 Supervisor Telemetry
              </button>
            </div>

            {/* Feature Content Showcase Panel */}
            <div className="tab-showcase-panel">
              <div className="showcase-details">
                {activeFeatureTab === 'scaffold' && (
                  <>
                    <span className="feature-icon-badge">💻</span>
                    <h4>Automatic Project Scaffolding & Web IDE</h4>
                    <p>Upon setting up your team workspace, our scaffolding engine generates configured directory structures (frontend, backend, database) and template boilerplate code immediately on the server filesystem.</p>
                    <ul className="feature-bullets">
                      <li><strong>Workspace Editor</strong>: Edit codebase files directly in your browser with dynamic line numbering.</li>
                      <li><strong>Scaffolding</strong>: Creates README.md templates, schema.sql scripts, and python requirements files.</li>
                      <li><strong>Git Sync</strong>: Commit version control logs and push changes to main branches straight from the console.</li>
                    </ul>
                  </>
                )}
                {activeFeatureTab === 'e2ee' && (
                  <>
                    <span className="feature-icon-badge">🔒</span>
                    <h4>End-to-End Encrypted Group Messaging</h4>
                    <p>Communicate with your squad without risking configuration data breaches. Conversational details are cryptographically locked using the native browser crypto framework.</p>
                    <ul className="feature-bullets">
                      <li><strong>SubtleCrypto Integration</strong>: Dynamically derives a 256-bit AES-GCM key based on team code salt.</li>
                      <li><strong>Base64 Ciphertext Database</strong>: Only encrypted text is stored in MySQL. Administrators see zero plain text.</li>
                      <li><strong>30-Day Auto Purge</strong>: Messages are recycled automatically every 30 days to avoid long term logs accumulation.</li>
                    </ul>
                  </>
                )}
                {activeFeatureTab === 'gallery' && (
                  <>
                    <span className="feature-icon-badge">🖼️</span>
                    <h4>Interactive Implementation Gallery</h4>
                    <p>Publish screenshot milestones of your application stages to make your team's visual accomplishments visible to peers and guides.</p>
                    <ul className="feature-bullets">
                      <li><strong>Drop Uploader</strong>: Drag and drop screenshots directly, categorizing them by stacks (Frontend, Backend, DB).</li>
                      <li><strong>Milestone Checklist</strong>: Tick off core sprint items as table schemas, APIs, and client views go live.</li>
                      <li><strong>Smooth Lightbox</strong>: Click on card elements to expand screenshots into a premium fullscreen slideshow.</li>
                    </ul>
                  </>
                )}
                {activeFeatureTab === 'monitor' && (
                  <>
                    <span className="feature-icon-badge">📊</span>
                    <h4>Continuous Heartbeat Telemetry Stream</h4>
                    <p>Enables guides and mentors to track team momentum transparently through activity heartbeats without setting up local runtime builds.</p>
                    <ul className="feature-bullets">
                      <li><strong>Live Graphs</strong>: Interactive SVG line graphs displaying active typing intervals.</li>
                      <li><strong>Activity Timelines</strong>: Real-time streams logging who is editing which files and uploading documents.</li>
                      <li><strong>Contribution Scorer</strong>: Auto-computes progress ratios based on Git commits, hours logged, and completed tasks.</li>
                    </ul>
                  </>
                )}
              </div>

              <div className="showcase-mockup-frame">
                <div className="mockup-header-bar">
                  <div className="dots-container">
                    <span className="mock-dot red"></span>
                    <span className="mock-dot yellow"></span>
                    <span className="mock-dot green"></span>
                  </div>
                  <div className="mock-tab vscode-mono-font">
                    {activeFeatureTab === 'scaffold' && "ActiveWorkspace.jsx"}
                    {activeFeatureTab === 'e2ee' && "SecureChat.jsx"}
                    {activeFeatureTab === 'gallery' && "Implementations.jsx"}
                    {activeFeatureTab === 'monitor' && "TelemetryMonitor.jsx"}
                  </div>
                </div>
                <div className="mockup-body">
                  {activeFeatureTab === 'scaffold' && (
                    <img src="/workspace_initial.png" alt="Workspace IDE Mockup" className="mockup-image" />
                  )}
                  {activeFeatureTab === 'e2ee' && (
                    <img src="/workspace_initial.png" alt="E2EE Chat Mockup" className="mockup-image" style={{ filter: 'hue-rotate(60deg) brightness(0.95)' }} />
                  )}
                  {activeFeatureTab === 'gallery' && (
                    <img src="/implementations_view.png" alt="Implementation Gallery Mockup" className="mockup-image" />
                  )}
                  {activeFeatureTab === 'monitor' && (
                    <img src="/monitor_view.png" alt="Telemetry Monitor Mockup" className="mockup-image" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ROLE-BASED VALUE PROPOSITIONS */}
          <div className="landing-section light-accent-section">
            <div className="section-header-centered">
              <span className="section-badge">Target Audiences</span>
              <h3>Designed For Academic Excellence & Professional Sprinting</h3>
              <p>Candels adapts dynamically to the unique workflows of college campuses and software product lines.</p>

              <div className="toggle-segment-bar" style={{ marginTop: '20px' }}>
                <button
                  className={`toggle-segment-item ${activeUserRoleTab === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveUserRoleTab('students')}
                >
                  🎓 College Students & Capstones
                </button>
                <button
                  className={`toggle-segment-item ${activeUserRoleTab === 'professionals' ? 'active' : ''}`}
                  onClick={() => setActiveUserRoleTab('professionals')}
                >
                  💼 Working Professionals & R&D
                </button>
              </div>
            </div>

            <div className="audience-cards-grid">
              {activeUserRoleTab === 'students' ? (
                <>
                  <div className="audience-card">
                    <div className="aud-icon">⚖️</div>
                    <h5>Grading Fairness & Anti-Freeloading</h5>
                    <p>Telemetry tracking monitors active workspace time and typing patterns. Individual contributions are clear, ensuring that everyone receives their fair share of grades.</p>
                  </div>
                  <div className="audience-card">
                    <div className="aud-icon">👀</div>
                    <h5>Effortless Supervisor Alignment</h5>
                    <p>Your faculty guides access a read-only portal showing your milestone gallery, checklist completions, and project charts, eliminating weekly presentation prep.</p>
                  </div>
                  <div className="audience-card">
                    <div className="aud-icon">🎓</div>
                    <h5>Industry-Standard Experience</h5>
                    <p>Integrates Git patch tracking, structured Kanban columns, document linkages, and stack scaffolding to build a portfolio of production engineering skills.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="audience-card">
                    <div className="aud-icon">🔒</div>
                    <h5>Strict Credentials Access Control</h5>
                    <p>Sensitive `.env` and `secrets.key` files are restricted inside the web editor, securing database logs, API endpoints, and private client tokens from code breaches.</p>
                  </div>
                  <div className="audience-card">
                    <div className="aud-icon">🏢</div>
                    <h5>Monthly E2EE Scrubbing Cycle</h5>
                    <p>All sensitive feature design chats and local storage documents are client-side encrypted and fully recycled monthly, keeping corporate intellectual property secure.</p>
                  </div>
                  <div className="audience-card">
                    <div className="aud-icon">⚡</div>
                    <h5>Unified Developer Space</h5>
                    <p>Aggregates code repositories, sprint board items, asset links, and live dashboard monitoring in one central hub to accelerate product deployment.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION 4: HOW TO ACTIVATE TIMELINE */}
          <div id="how-it-works" className="landing-section">
            <div className="section-header-centered">
              <span className="section-badge">Workflow Timeline</span>
              <h3>Getting Started in 4 Simple Steps</h3>
              <p>Follow our structured lifecycle timeline to provision, sign, and activate your engineering hub.</p>
            </div>

            <div className="steps-flow-timeline">
              <div className="timeline-step">
                <div className="step-circle">1</div>
                <h5>Create the Team</h5>
                <p>Register or log in, and click "Create Team" in your dashboard. Provide your project name, subject topic, target timeline, and team size limits to generate a unique team code.</p>
              </div>
              <div className="timeline-step">
                <div className="step-circle">2</div>
                <h5>Connect Peers & Sign</h5>
                <p>Invite teammates using the generated team code. Members link onto the dashboard and sign the project declaration document to commit to sprint responsibilities.</p>
              </div>
              <div className="timeline-step">
                <div className="step-circle">3</div>
                <h5>Supervisor Signoff</h5>
                <p>Assign your faculty guide to the team. The supervisor accesses the declaration panel and digitally signs it, moving status to Active and unlocking the workspace cluster.</p>
              </div>
              <div className="timeline-step">
                <div className="step-circle">4</div>
                <h5>Scaffold & Launch</h5>
                <p>The leader initializes the project tech stack (React, Flask, Express, MySQL, etc.). This instantly provisions the filesystem environment, scaffold packages, and IDE workspace.</p>
              </div>
            </div>
          </div>

          {/* SECTION 5: SECURITY DEEP DIVE */}
          <div className="landing-section dark-security-section">
            <div className="security-content-box">
              <span className="security-badge-lbl"> Security & Integrity</span>
              <h3>Zero-Trust File Protection & Lockout</h3>
              <p>To guard against data breaches, the Candels IDE blocks reading or writing credentials files inside the browser client. Keys, database passwords, and client identifiers stay perfectly secure.</p>
              <div className="security-bullet-list">
                <div className="sec-bullet-item">
                  <span className="bullet-icon">🔒</span>
                  <div>
                    <h6>Explorer Locks</h6>
                    <p>Protected configuration files such as <code>.env</code> and <code>secrets.key</code> show up marked with padlock icons in the sidebar file explorer tree. Attempting to open them displays a security warning layout.</p>
                  </div>
                </div>
                <div className="sec-bullet-item">
                  <span className="bullet-icon">🔑</span>
                  <div>
                    <h6>Dynamic SubtleCrypto</h6>
                    <p>Conversations are encrypted client-side using 256-bit AES-GCM. Plaintext chat data never leaves the client or enters database tables.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="security-image-box">
              <div className="security-mockup-frame">
                <div className="mockup-header-bar">
                  <div className="dots-container">
                    <span className="mock-dot red"></span>
                    <span className="mock-dot yellow"></span>
                    <span className="mock-dot green"></span>
                  </div>
                  <div className="mock-tab vscode-mono-font">.env</div>
                </div>
                <div className="mockup-body" style={{ background: '#fafafa' }}>
                  <img src="/env_lock.png" alt="Credentials Locked Screen" className="mockup-image" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Branding Area */}
          <div className="landing-footer" style={{ borderTop: '1px solid #d2d2d7', paddingTop: '30px', paddingBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#86868b', fontSize: '13px' }}>
            <span>&copy; 2026 Candels Systems Inc. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span>Security Audited</span>
              <span>Terms of Service</span>
              <span>API Gateway</span>
            </div>
          </div>

        </div>

        {/* ======================================================================
            ⚙️ PAGE 2: 100% FULL-SCREEN LIGHT LOGIN AUTHENTICATION WORKSPACE
            ====================================================================== */}
        <div className="login-page-full-view">

          {/* Back Action Trigger to move back left onto landing stage */}
          <button className="back-to-landing-arrow-btn" onClick={() => setIsWorkspaceOpen(false)}>
            ← Back to Product Overview
          </button>

          <div className="login-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logo.png" alt="Candels Logo" style={{ height: '36px', objectFit: 'contain' }} />
                <span style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px', color: '#1d1d1f' }}>CANDELS</span>
              </div>
            </div>
            <h2>Account Login</h2>
            <p>Please enter your credentials to access the platform.</p>

            {errorMessage && (
              <div style={{ color: "#ef4444", background: "#fee2e2", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "14px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleFormSubmission}>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="login-options">
                <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                  <input type="checkbox" /> Remember me
                </label>
                <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
              </div>

              <button className="login-btn" type="submit" style={{ backgroundColor: '#2b2a2a' }}>
                Login
              </button>
            </form>

            <div className="divider">or</div>

            <div id="google-signin-target" style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "44px" }}></div>

            <p className="register-link">
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;