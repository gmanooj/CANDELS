import React, { useState, useEffect } from "react";
import styles from "./CreateTeam.module.css";

function CreateTeam({ user, fetchUserWorkspaceMatrix }) {
  const [teamMeta, setTeamMeta] = useState({
    project_name: "",
    subject: "",
    workplaceName: "",
    workplaceType: "College",
    max_team_size: 3,
    timeline_value: 3,
    timeline_unit: "Months",
    target_industry: "Technology",
    workspace_visibility: "Public"
  });

  // Dynamic input fields for invitation mappings
  const [guideInputId, setGuideInputId] = useState("");
  const [peerInputs, setPeerInputs] = useState({}); // e.g., { 2: "TB-STU-XXXX", 3: "TB-STU-YYYY" }

  const [myPipelines, setMyPipelines] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [expandedRoster, setExpandedRoster] = useState([]);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user?.user_code) {
      fetchLocalPipelineLedger();
    }
  }, [user]);

  const fetchLocalPipelineLedger = async () => {
    try {
      const token = sessionStorage.getItem("auth_token");
      // Hits your workspace dashboard-context engine
      const response = await fetch(`${__BACKEND_URL__}/api/users/dashboard-context?user_code=${user.user_code}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Fallback or custom extension to fetch all pending/active team arrays
        setMyPipelines(data.projects || []);
      }
    } catch (e) {
      console.error("Ledger sync error:", e);
    }
  };

  const fetchSpecificRosterDetails = async (teamCode) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${__BACKEND_URL__}/api/team/digital-form-context?team_code=${teamCode}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExpandedRoster(data.roster || []);
      }
    } catch (e) {
      console.warn("Error unpacking sub-matrix nodes.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTeamMeta(prev => ({ ...prev, [name]: value }));
  };

  const handlePeerIdChange = (slot, val) => {
    setPeerInputs(prev => ({ ...prev, [slot]: val.trim().toUpperCase() }));
  };

  const handleDeployPipeline = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!guideInputId.trim()) {
      setErrorMessage("Safety Validation Guard: You must assign a target Faculty/Guide Token before initialization.");
      return;
    }

    const payload = {
      leaderCode: user?.user_code,
      projectName: teamMeta.project_name,
      subject: teamMeta.subject,
      workplaceName: teamMeta.workplaceName,
      workplaceType: teamMeta.workplaceType,
      maxSize: parseInt(teamMeta.max_team_size),
      timelineValue: parseInt(teamMeta.timeline_value),
      timelineUnit: teamMeta.timeline_unit,
      targetIndustry: teamMeta.target_industry,
      workspaceVisibility: teamMeta.workspace_visibility,
      facultyCode: guideInputId.trim().toUpperCase(),
      peers: peerInputs // Passes dictionary of structural slot targets: { 2: "ID", 3: "ID" }
    };

    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(__BACKEND_URL__ + "/api/team/initialize", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage("Project initialization pipeline deployed successfully! Invitation nodes dispatched.");
        setTeamMeta({ project_name: "", subject: "", workplaceName: "", workplaceType: "College", max_team_size: 2, timeline_value: 3, timeline_unit: "Months", target_industry: "Technology", workspace_visibility: "Public" });
        setGuideInputId("");
        setPeerInputs({});
        fetchLocalPipelineLedger();
        if (fetchUserWorkspaceMatrix) fetchUserWorkspaceMatrix(user.user_code);
      } else {
        setErrorMessage(data.error || "Initialization failed.");
      }
    } catch (err) {
      setErrorMessage("Network structural fault connecting to database cluster mapping hooks.");
    }
  };

  const toggleExpandRow = (teamId, teamCode) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      setExpandedRoster([]);
    } else {
      setExpandedTeamId(teamId);
      fetchSpecificRosterDetails(teamCode);
    }
  };

  return (
    <div className="create-team-page-wrapper" style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      
      {/* SECTION A: COMBINED WORKSPACE INITIALIZATION MAPPING FORM */}
      <section className="form-workspace-section" style={{ background: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.01)" }}>
        <div className="form-container-header" style={{ marginBottom: "20px" }}>
          <h2>Initialize New Project Ecosystem</h2>
          <p>Setup framework constraints and map structural identity tokens for your teammates and guide simultaneously.</p>
        </div>

        {errorMessage && <div className="alert-box error" style={{ marginBottom: "16px" }}>{errorMessage}</div>}
        {successMessage && <div className="alert-box success" style={{ marginBottom: "16px" }}>{successMessage}</div>}

        <form onSubmit={handleDeployPipeline} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px" }}>
          
          {/* Left Inputs Pillar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="dash-input-group">
              <label>Project Operational Title</label>
              <input type="text" name="project_name" value={teamMeta.project_name} onChange={handleInputChange} placeholder="e.g., Autonomous Edge Routing Mesh" required />
            </div>

            <div className="dash-input-group">
              <label>Subject Domain Identifier</label>
              <input type="text" name="subject" value={teamMeta.subject} onChange={handleInputChange} placeholder="e.g., Advanced Distributed Architecture" required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="dash-input-group">
                <label>Institution Type</label>
                <select name="workplaceType" value={teamMeta.workplaceType} onChange={handleInputChange}>
                  <option value="College">College</option>
                  <option value="School">School</option>
                  <option value="Organization">Organization</option>
                </select>
              </div>
              <div className="dash-input-group">
                <label>Institution Name</label>
                <input type="text" name="workplaceName" value={teamMeta.workplaceName} onChange={handleInputChange} placeholder="e.g., Kalasalingam University" required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="dash-input-group">
                <label>Ecosystem Visibility</label>
                <select name="workspace_visibility" value={teamMeta.workspace_visibility} onChange={handleInputChange}>
                  <option value="Public">Public (Visible)</option>
                  <option value="Private">Private (Encrypted)</option>
                </select>
              </div>
              <div className="dash-input-group">
                <label>Maximum Student Slots</label>
                <select name="max_team_size" value={teamMeta.max_team_size} onChange={(e) => setTeamMeta(prev => ({ ...prev, max_team_size: parseInt(e.target.value) }))}>
                  <option value="2">2 Slots</option>
                  <option value="3">3 Slots</option>
                  <option value="4">4 Slots</option>
                </select>
              </div>
            </div>

            <button type="submit" className="form-submit-btn blue" style={{ marginTop: "12px", width: "100%" ,backgroundColor: "#252526"}}>Submit & Send Invitations</button>
          </div>

          {/* Right Token Mapping Matrix Box */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1d1d1f", display: "block", marginBottom: "8px" }}>🛡️ Governance Guide Assignment</label>
              <input 
                type="text" 
                value={guideInputId}
                onChange={(e) => setGuideInputId(e.target.value)}
                placeholder="Enter Target Faculty Token (e.g., TB-FAC-8058)" 
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1d1d1f", display: "block", marginBottom: "8px" }}>👥 Peer Node Assignment Matrix</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Master Node Slot */}
                <div style={{ padding: "12px", background: "#f5f5f7", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", color: "#1d1d1f" }}>
                  <strong>Slot 1 (Creator):</strong> {user?.user_code} (You)
                </div>

                {/* Sub Node Invitation Inputs */}
                {[...Array(teamMeta.max_team_size - 1).keys()].map((idx) => {
                  const currentSlot = idx + 2;
                  return (
                    <div key={currentSlot} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#86868b", fontWeight: "500" }}>Slot {currentSlot} Assignment Input:</span>
                      <input 
                        type="text"
                        value={peerInputs[currentSlot] || ""}
                        onChange={(e) => handlePeerIdChange(currentSlot, e.target.value)}
                        placeholder="Enter Colleague Token (e.g., TB-STU-7622)"
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </form>
      </section>

      {/* SECTION B: DYNAMIC TRACKING LEDGER TABLE SYSTEM */}
      <section style={{ background: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.01)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#1d1d1f", fontWeight: "600" }}>Dynamic Database Pipeline Tracking Ledger</h3>
        
        <div className="premium-data-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="premium-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #f5f5f7", color: "#86868b", fontSize: "13px" }}>
                <th style={{ padding: "12px" }}>Action</th>
                <th>Project Architecture Node</th>
                <th>Domain Scope</th>
                <th>Your Role</th>
                <th>Pipeline Standing</th>
              </tr>
            </thead>
            <tbody>
              {myPipelines.map((pipeline, index) => {
                const isCurrentRowExpanded = expandedTeamId === index;
                // Determine user role context flag
                const userRoleContext = pipeline.team_code === sessionStorage.getItem("active_charter_code") ? "Workspace Leader" : "Collaborative Node";

                return (
                  <React.Fragment key={index}>
                    <tr style={{ borderBottom: "1px solid #f5f5f7", fontSize: "14px", color: "#1d1d1f" }}>
                      <td style={{ padding: "12px" }}>
                        <button 
                          onClick={() => toggleExpandRow(index, pipeline.team_code)}
                          style={{ background: isCurrentRowExpanded ? "#e8e8ed" : "#eff6ff", color: isCurrentRowExpanded ? "#1d1d1f" : "#232323", border: "none", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
                        >
                          {isCurrentRowExpanded ? "−" : "＋"}
                        </button>
                      </td>
                      <td><strong>{pipeline.project_name}</strong></td>
                      <td>{pipeline.subject}</td>
                      <td><span style={{ fontSize: "12px", background: "#f5f5f7", padding: "4px 8px", borderRadius: "6px" }}>{userRoleContext}</span></td>
                      <td>
                        <span className={`status-badge-inline progress`} style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>
                          Active Review
                        </span>
                      </td>
                    </tr>

                    {/* DYNAMIC ROW EXPANSION INJECTION */}
                    {isCurrentRowExpanded && (
                      <tr style={{ background: "#fbfbfd" }}>
                        <td colSpan="5" style={{ padding: "16px 24px border-bottom: 1px solid #e5e7eb" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <h5 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#1d1d1f", fontWeight: "600" }}> Emitters & Consensus Node Status Matrix</h5>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                              {expandedRoster.map((node, nIdx) => (
                                <div key={nIdx} style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justify_content: "between", gap: "10px" }}>
                                  <div>
                                    <p style={{ margin: "0 0 2px 0", fontSize: "13px", fontWeight: "600" }}>{node.name}</p>
                                    <span style={{ fontSize: "11px", color: "#86868b" }}>{node.user_code}</span>
                                  </div>
                                  <span style={{ fontSize: "11px", marginLeft: "auto", padding: "2px 8px", borderRadius: "6px", fontWeight: "500", background: node.status === "Approved" ? "#ecfdf5" : "#fff7ed", color: node.status === "Approved" ? "#047857" : "#c2410c" }}>
                                    {node.status === "Approved" ? "✓ Bound" : "⏳ Pending"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {myPipelines.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#86868b" }}>No active tracking ledger records verified in database clusters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

export default CreateTeam;