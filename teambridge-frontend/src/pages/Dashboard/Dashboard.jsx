import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateTeam from "../CreateTeam/CreateTeam";
import PermanentAllocationBanner from "../../components/PermanentAllocationBanner/PermanentAllocationBanner"; 
import DigitalDeclaration from "../../components/DigitalDeclarationForm/DigitalDeclaration"; // Imported real-time component[cite: 3]
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeProjectsList, setActiveProjectsList] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState({ operational: "Connecting...", completed: "0 Pipelines", standing: "Syncing...", latency: "0ms" });
  const [systemNotifications, setSystemNotifications] = useState([]);

  const [activeTeamCode, setActiveTeamCode] = useState(sessionStorage.getItem("active_charter_code") || "");
  const [digitalCharter, setDigitalCharter] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [animationAlert, setAnimationAlert] = useState(null);
  const [facultySearchId, setFacultySearchId] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(100);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const sessionData = sessionStorage.getItem("user_session");
    if (!sessionData) {
      navigate("/");
      return;
    }
    const loggedInUser = JSON.parse(sessionData);
    setUser(loggedInUser);

    if (loggedInUser && loggedInUser.user_code) {
      fetchProfileStatusHeader(loggedInUser.user_code, loggedInUser);
      fetchUserWorkspaceMatrix(loggedInUser.user_code);
      fetchLiveAlertFeeds(loggedInUser.user_code);
      
      const cachedCharterCode = sessionStorage.getItem("active_charter_code");
      if (cachedCharterCode) {
        setActiveTeamCode(cachedCharterCode);
        fetchDigitalDocumentInstrument(cachedCharterCode);
      }

      const alertPollingInterval = setInterval(() => {
        fetchLiveAlertFeeds(loggedInUser.user_code);
      }, 60000);

      return () => clearInterval(alertPollingInterval);
    }
  }, [navigate]); 

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
  });

  const fetchProfileStatusHeader = async (userCode, currentUserSession) => {
    try {
      const response = await fetch(`${__BACKEND_URL__}/api/users/profile-context?user_code=${userCode}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const dbData = await response.json();
        setCompletionPercentage(dbData.completion_percentage);
        
        const refreshedUser = { ...currentUserSession, ...dbData };
        setUser(refreshedUser);
        sessionStorage.setItem("user_session", JSON.stringify(refreshedUser));
      }
    } catch (e) {
      console.warn("Header profile sync warning handled.");
    }
  };

  const fetchUserWorkspaceMatrix = async (userCode) => {
    try {
      const response = await fetch(`${__BACKEND_URL__}/api/users/dashboard-context?user_code=${userCode}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const projects = data.projects || [];
        setActiveProjectsList(projects);
        setWorkspaceStats(data.stats || {});

        // 🔗 AUTO-SYNC ARCHITECTURE: If no charter link is set, lock in the user's primary project token instantly
        if (projects.length > 0 && !sessionStorage.getItem("active_charter_code")) {
          const primaryTeamCode = projects[0].team_code;
          setActiveTeamCode(primaryTeamCode);
          sessionStorage.setItem("active_charter_code", primaryTeamCode);
          fetchDigitalDocumentInstrument(primaryTeamCode);
          setRefreshTrigger(prev => prev + 1);
        }
      } else {
        setErrorMessage("Network interface failed to fetch active channel contexts.");
      }
    } catch (e) {
      setErrorMessage("Could not connect to backend server framework.");
    }
  };

  const fetchLiveAlertFeeds = async (userCode) => {
    try {
      const response = await fetch(`${__BACKEND_URL__}/api/notifications/fetch?user_code=${userCode}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSystemNotifications(data.notifications || []);
      }
    } catch (e) {
      console.warn("Notification polling synchronization dropped.");
    }
  };

  const fetchDigitalDocumentInstrument = async (teamCode) => {
    try {
      const response = await fetch(`${__BACKEND_URL__}/api/team/digital-form-context?team_code=${teamCode}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setDigitalCharter(data);
      }
    } catch (e) {
      console.warn("Error streaming dynamic digital form profiles.");
    }
  };

  const handleNotificationResolution = async (notifId, action) => {
    setErrorMessage("");
    try {
      const response = await fetch(__BACKEND_URL__ + "/api/notifications/respond", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ notification_id: notifId, user_code: user.user_code, action: action })
      });
      
      const resData = await response.json();
      
      if (response.ok) {
        if (action === "Accept") {
          setAnimationAlert(`🎉 Workspace Linked! You have successfully signed into the project workspace.`);
          setActiveTeamCode(resData.team_code);
          sessionStorage.setItem("active_charter_code", resData.team_code);
          fetchDigitalDocumentInstrument(resData.team_code);
          setCurrentTab("team_declaration");
          setRefreshTrigger(prev => prev + 1);
          setTimeout(() => setAnimationAlert(null), 3500);
        } else {
          setSuccessMessage("Invitation declined and removed successfully.");
          setTimeout(() => setSuccessMessage(""), 2500);
        }
        
        fetchLiveAlertFeeds(user.user_code);
        fetchUserWorkspaceMatrix(user.user_code);
      } else {
        setErrorMessage(resData.error || "Failed to finalize contract declaration response.");
      }
    } catch (e) {
      setErrorMessage("Network structural failure processing resolution transaction logic.");
    }
  };

  const handleFacultyBinding = async (e) => {
    e.preventDefault();
    if (!facultySearchId.trim()) return;

    // Direct guard clause protection to keep from sending blank tokens
    if (!activeTeamCode) {
      setErrorMessage("Cannot link faculty. No active team code is currently selected in your system context.");
      return;
    }

    try {
      const res = await fetch(__BACKEND_URL__ + "/api/team/assign-faculty", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ team_code: activeTeamCode, faculty_id: facultySearchId.trim().toUpperCase() })
      });
      
      const resData = await res.json();

      if (res.ok) {
        setSuccessMessage("Faculty Guide linked cleanly to instrument template metadata.");
        setFacultySearchId("");
        fetchDigitalDocumentInstrument(activeTeamCode);
        setRefreshTrigger(prev => prev + 1);
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        setErrorMessage(resData.error || "Faculty unique identifier token unverified in institution records.");
      }
    } catch (err) {
      setErrorMessage("Network structural breakdown handling transaction lines.");
    }
  };

  const handleTeamGenerationRouting = (compiledTeamCode) => {
    setActiveTeamCode(compiledTeamCode);
    sessionStorage.setItem("active_charter_code", compiledTeamCode);
    fetchDigitalDocumentInstrument(compiledTeamCode);
    setRefreshTrigger(prev => prev + 1);
    setCurrentTab("team_declaration");
  };

  return (
    <div className="dashboard-container">
      {animationAlert && (
        <div className="prestige-success-overlay">
          <div className="success-anim-card">
            <div className="success-checkmark-circle">✓</div>
            <h2>Consensus Verified</h2>
            <p>{animationAlert}</p>
          </div>
        </div>
      )}

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-backdrop active"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile top-bar — hidden on desktop via CSS */}
      <div className="mobile-topbar" style={{ display: 'none' }}>
        <button
          className={`hamburger-toggle-btn ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="ham-bar" />
          <span className="ham-bar" />
          <span className="ham-bar" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Candels" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
          <span style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '0.5px' }}>CANDELS</span>
        </div>
        <div style={{ width: '44px' }} />
      </div>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '44px' }}>
          <img src="/logo.png" alt="Candels Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
          <span style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>CANDELS</span>
        </div>
        
        <nav className="sidebar-menu">
          <span className="menu-section-title">Operations Center</span>
          <button className={`menu-btn-item ${currentTab === "overview" ? "active" : ""}`} onClick={() => setCurrentTab("overview")}>System Overview </button>
          <button className={`menu-btn-item ${currentTab === "create_team" ? "active" : ""}`} onClick={() => { setCurrentTab("create_team"); setSidebarOpen(false); }}>Initialize Workspace</button>
          <button className="menu-btn-item" onClick={() => { navigate("/workspace"); setSidebarOpen(false); }}>Workspace</button>
          <button className={`menu-btn-item ${currentTab === "team_declaration" ? "active" : ""}`} onClick={() => { setCurrentTab("team_declaration"); setSidebarOpen(false); }}>Team Declaration Form</button>
          <button className="menu-btn-item" onClick={() => { navigate("/profile"); setSidebarOpen(false); }}> Account </button>
          <button className="menu-btn-item font-semibold text-blue-600 dark:text-blue-400" onClick={() => { navigate("/settings"); setSidebarOpen(false); }}>Settings</button>
        </nav>

        <div className="sidebar-user-footer">
          <div className="user-info-short" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
            {user?.profile_image ? (
              <img src={user.profile_image} alt="Avatar" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "var(--dev-blue)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{user?.first_name ? user.first_name[0] : "?"}</div>
            )}
            <div>
              <p className="user-name-footer" style={{ fontSize: "14px" }}>{user?.first_name} {user?.last_name}</p>
              <span className="user-role-badge" style={{ fontSize: "9px" }}>{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={() => { sessionStorage.clear(); navigate("/"); }}> Sign Out </button>
        </div>
      </aside>

      <main className="main-content">
        
      {activeTeamCode && (
        <PermanentAllocationBanner 
          teamCode={activeTeamCode} 
          refreshTrigger={refreshTrigger}
          onOpenAllocationMatrix={() => setCurrentTab("create_team")}
        />
      )}

        {systemNotifications.map((notif) => {
          const isDetailedFacultyReq = notif.message.includes('|');
          
          let leaderText = "";
          let titleText = "";
          let domainText = "";

          if (isDetailedFacultyReq) {
            const parts = notif.message.split('|');
            leaderText = parts[0]?.replace("Leader:", "").trim();
            titleText = parts[1]?.replace("Title:", "").trim();
            domainText = parts[2]?.replace("Domain:", "").trim();
          }

          return (
            <div 
              key={notif.id} 
              className="premium-alert-banner animation-slide-in" 
              style={{ 
                background: "#ffffff", 
                borderLeft: isDetailedFacultyReq ? "4px solid #10b981" : "4px solid var(--dev-blue)", 
                padding: "24px", 
                borderRadius: "14px", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                boxShadow: "0 10px 25px rgba(0,0,0,0.04)", 
                marginBottom: "20px" 
              }}
            >
              <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flex: 1 }}>
                <div style={{ 
                  width: "44px", 
                  height: "44px", 
                  borderRadius: "50%", 
                  background: isDetailedFacultyReq ? "#ecfdf5" : "#eff6ff", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "20px" 
                }}>
                  {isDetailedFacultyReq ? "👨‍🏫" : "📨"}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "600", color: "#1d1d1f" }}>
                    {isDetailedFacultyReq ? "Project Guide Allocation Request" : "Project Workspace Affiliation Request"}
                  </h4>
                  
                  {isDetailedFacultyReq ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      <p style={{ margin: 0, fontSize: "14px", color: "#424245" }}>
                        <strong>Student Leader:</strong> {leaderText}
                      </p>
                      <p style={{ margin: 0, fontSize: "14px", color: "#424245" }}>
                        <strong>Proposed Title:</strong> <span style={{ color: "#0066cc", fontWeight: "500" }}>{titleText}</span>
                      </p>
                      <p style={{ margin: 0, fontSize: "13px", color: "#6e6e73" }}>
                        <strong>Subject Domain:</strong> {domainText}
                      </p>
                      <span style={{ fontSize: "11px", color: "#86868b", background: "#f5f5f7", padding: "2px 6px", borderRadius: "4px", width: "fit-content", marginTop: "4px" }}>
                        Cluster Token: {notif.team_code || "System Managed"}
                      </span>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "13px", color: "#86868b" }}>{notif.message}</p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginLeft: "20px" }}>
                <button 
                  className="form-submit-btn blue" 
                  style={{ padding: "10px 22px", fontSize: "13px", margin: 0, borderRadius: "8px", width: "auto", background: isDetailedFacultyReq ? "#10b981" : "#0066cc" }} 
                  onClick={() => handleNotificationResolution(notif.id, "Accept")}
                >
                  ✓ Accept Role
                </button>
                <button 
                  className="form-submit-btn" 
                  style={{ padding: "10px 22px", fontSize: "13px", margin: 0, borderRadius: "8px", background: "#f5f5f7", color: "#1d1d1f", border: "1px solid #d2d2d7", width: "auto", cursor: "pointer" }} 
                  onClick={() => handleNotificationResolution(notif.id, "Reject")}
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })}

        {completionPercentage < 100 && (
          <div className="alert-box error" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚠️ <strong>System Profile Alert:</strong> Your data completion state is at <strong>{completionPercentage}%</strong>. Populate missing links to achieve 100% network data fidelity.</span>
              <button className="back-link-btn" style={{ margin: 0, textDecoration: "underline", color: "#b91c1c" }} onClick={() => navigate("/profile")}>Route to Profile</button>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${completionPercentage}%`, backgroundColor: "#ef4444" }}></div>
            </div>
          </div>
        )}

        {errorMessage && <div className="alert-box error" style={{ marginBottom: "20px" }}>{errorMessage}</div>}
        {successMessage && <div className="alert-box success" style={{ marginBottom: "20px" }}>{successMessage}</div>}

        {currentTab === "overview" && (
          <section style={{ animation: "motionFadeIn 0.25s ease" }}>
            <header className="content-header">
              <div>
                <h1>Workspace Engine Analytics</h1>
                <p className="subtitle">Welcome back, {user?.first_name}. Tracking live relational workspace allocations.</p>
              </div>
              <span className="user-code-display">{user?.user_code}</span>
            </header>

            <div className="workspace-metrics-bar">
              <div className="metric-pill-card"><span className="lbl">Data Base Status</span><span className="num" style={{ fontSize: "20px" }}>{workspaceStats.operational}</span></div>
              <div className="metric-pill-card"><span className="lbl">Active Projects</span><span className="num" style={{ fontSize: "20px" }}>{workspaceStats.completed}</span></div>
              <div className="metric-pill-card"><span className="lbl">Review Standing</span><span className="num" style={{ fontSize: "20px" }}>{workspaceStats.standing}</span></div>
              <div className="metric-pill-card"><span className="lbl">User Link Code</span><span className="num" style={{ fontSize: "13px", wordBreak: "break-all" }}>{activeTeamCode || "None Active"}</span></div>
            </div>

            <div className="panel-block-container">
              <h3>Active Projects</h3>
              <div className="premium-data-table-wrapper">
                <table className="premium-data-table">
                  <thead>
                    <tr><th>Title</th><th>Subject</th><th>Affiliated Corporate/School Entity</th><th>Team Size</th></tr>
                  </thead>
                  <tbody>
                    {activeProjectsList.length > 0 ? activeProjectsList.map((proj, idx) => (
                      <tr key={idx} onClick={() => {
                        setActiveTeamCode(proj.team_code);
                        sessionStorage.setItem("active_charter_code", proj.team_code);
                        fetchDigitalDocumentInstrument(proj.team_code);
                        setRefreshTrigger(prev => prev + 1); 
                        setCurrentTab("team_declaration");
                      }} style={{ cursor: "pointer", background: activeTeamCode === proj.team_code ? "#f0fdf4" : "transparent" }}>
                        <td><strong>{proj.project_name}</strong></td>
                        <td>{proj.subject}</td>
                        <td>{proj.workplace_name}</td>
                        <td><span className="status-badge-inline progress">{proj.members_count} </span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" style={{ textAlign: "center", color: "black", padding: "40px" }}>No dynamic database pipeline listings found. Go to 'Initialize Workspace' to spawn channels.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {currentTab === "create_team" && (
          <CreateTeam 
            user={user} 
            fetchUserWorkspaceMatrix={fetchUserWorkspaceMatrix}
            onNavigationSuccess={handleTeamGenerationRouting}
          />
        )}

        {/* --- DYNAMIC REAL-TIME TEAM DECLARATION COMPONENT HARNESS --- */}
        {currentTab === "team_declaration" && (
          <section style={{ animation: "motionFadeIn 0.2s ease" }}>
            {activeTeamCode ? (
              <div className="digital-paper-container" style={{ background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                {/* Embedded Signature Canvas Component Engine */}
                <DigitalDeclaration 
                  teamCode={activeTeamCode} 
                  currentUser={{
                    name: user ? `${user.first_name} ${user.last_name}`.trim() : "Unknown Node",
                    user_code: user?.user_code
                  }} 
                />

                {/* Shared Faculty Assignment Layout block footer */}
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "30px", marginTop: "30px" }}>
                  <h4 className="doc-section-heading" style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px" }}>Affiliated Governance Guide Allocation</h4>
                  {digitalCharter && digitalCharter.faculty ? (
                    <div className="doc-faculty-card animation-slide-in" style={{ display: "flex", alignItems: "center", gap: "15px", background: "#f0fdf4", padding: "15px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      {digitalCharter.faculty.photo ? (
                        <img src={digitalCharter.faculty.photo} className="doc-avatar-img" alt="Faculty Guide" style={{ width: "45px", height: "45px", borderRadius: "50%" }} />
                      ) : (
                        <div className="doc-avatar-fallback" style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{digitalCharter.faculty.name[0]}</div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: "15px", color: "#14532d" }}>Guide Name: {digitalCharter.faculty.name}</h4>
                        <span className="doc-code-txt" style={{ fontSize: "12px", color: "#166534" }}>Authorized Guide Token: {digitalCharter.faculty.user_code}</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleFacultyBinding} style={{ display: "flex", gap: "12px", maxWidth: "500px" }}>
                      <input 
                        type="text" 
                        value={facultySearchId} 
                        onChange={(e) => setFacultySearchId(e.target.value)} 
                        placeholder="Enter Unique Faculty Token ID (e.g., TB-FAC-8058)" 
                        style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" }} 
                        required 
                      />
                      <button type="submit" className="form-submit-btn blue" style={{ width: "auto", margin: 0, padding: "0 24px" }}>Assign Guide Matrix</button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="alert-box error" style={{ padding: "50px", textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                <h3 style={{ color: "#0f172a", marginBottom: "12px" }}>No Workspace Cluster Linked</h3>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px", maxWidth: "480px", margin: "0 auto 24px auto" }}>
                  Your identity token is currently unassigned to any team code. Accept an invite from your alerts feed or spin up a workspace cluster.
                </p>
                <button 
                  className="form-submit-btn blue" 
                  style={{ width: "auto", display: "inline-block", padding: "12px 24px" }}
                  onClick={() => setCurrentTab("create_team")}
                >
                  🚀 Spin Up Workspace Cluster
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;