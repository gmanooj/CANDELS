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
    <div className={styles.createTeamPageWrapper}>
      
      {/* SECTION A: COMBINED WORKSPACE INITIALIZATION MAPPING FORM */}
      <section className={styles.formWorkspaceSection}>
        <div className={styles.formContainerHeader}>
          <h2>Initialize New Project Ecosystem</h2>
          <p>Setup framework constraints and map structural identity tokens for your teammates and guide simultaneously.</p>
        </div>

        {errorMessage && <div className={`${styles.alertBox} ${styles.error}`}>{errorMessage}</div>}
        {successMessage && <div className={`${styles.alertBox} ${styles.success}`}>{successMessage}</div>}

        <form onSubmit={handleDeployPipeline} className={styles.deployForm}>
          
          {/* Left Inputs Pillar */}
          <div className={styles.formColLeft}>
            <div className="dash-input-group">
              <label>Project Operational Title</label>
              <input type="text" name="project_name" value={teamMeta.project_name} onChange={handleInputChange} placeholder="e.g., Autonomous Edge Routing Mesh" required />
            </div>

            <div className="dash-input-group">
              <label>Subject Domain Identifier</label>
              <input type="text" name="subject" value={teamMeta.subject} onChange={handleInputChange} placeholder="e.g., Advanced Distributed Architecture" required />
            </div>

            <div className={styles.formGridTwoCol}>
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

            <div className={styles.formGridTwoCol}>
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

            <button type="submit" className="form-submit-btn blue">Submit & Send Invitations</button>
          </div>

          {/* Right Token Mapping Matrix Box */}
          <div className={styles.formColRight}>
            <div>
              <label className={styles.formLabelHeader}>🛡️ Governance Guide Assignment</label>
              <input 
                type="text" 
                value={guideInputId}
                onChange={(e) => setGuideInputId(e.target.value)}
                placeholder="Enter Target Faculty Token (e.g., TB-FAC-8058)" 
                required
              />
            </div>

            <div>
              <label className={styles.formLabelHeader}>👥 Peer Node Assignment Matrix</label>
              <div className={styles.peerMatrixContainer}>
                {/* Master Node Slot */}
                <div className={styles.peerMatrixCard}>
                  <strong>Slot 1 (Creator):</strong> {user?.user_code} (You)
                </div>

                {/* Sub Node Invitation Inputs */}
                {[...Array(teamMeta.max_team_size - 1).keys()].map((idx) => {
                  const currentSlot = idx + 2;
                  return (
                    <div key={currentSlot} className={styles.peerMatrixSlotInputGroup}>
                      <span>Slot {currentSlot} Assignment Input:</span>
                      <input 
                        type="text"
                        value={peerInputs[currentSlot] || ""}
                        onChange={(e) => handlePeerIdChange(currentSlot, e.target.value)}
                        placeholder="Enter Colleague Token (e.g., TB-STU-7622)"
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
      <section className={styles.ledgerSection}>
        <h3>Dynamic Database Pipeline Tracking Ledger</h3>
        
        <div className={styles.premiumDataTableWrapper}>
          <table className={styles.premiumDataTable}>
            <thead>
              <tr>
                <th>Action</th>
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
                    <tr>
                      <td>
                        <button 
                          onClick={() => toggleExpandRow(index, pipeline.team_code)}
                          className={`${styles.expandRowBtn} ${isCurrentRowExpanded ? styles.expanded : ''}`}
                        >
                          {isCurrentRowExpanded ? "−" : "＋"}
                        </button>
                      </td>
                      <td><strong>{pipeline.project_name}</strong></td>
                      <td>{pipeline.subject}</td>
                      <td><span className={styles.badgeRole}>{userRoleContext}</span></td>
                      <td>
                        <span className={`status-badge-inline progress ${styles.badgeStatusInline}`}>
                          Active Review
                        </span>
                      </td>
                    </tr>

                    {/* DYNAMIC ROW EXPANSION INJECTION */}
                    {isCurrentRowExpanded && (
                      <tr className={styles.expandedRosterRow}>
                        <td colSpan="5" className={styles.expandedRosterCell}>
                          <div className={styles.rosterContainer}>
                            <h5> Emitters & Consensus Node Status Matrix</h5>
                            <div className={styles.rosterGrid}>
                              {expandedRoster.map((node, nIdx) => {
                                const statusClass = node.status === "Approved" ? styles.approved : styles.pending;
                                return (
                                  <div key={nIdx} className={styles.rosterNodeCard}>
                                    <div>
                                      <p>{node.name}</p>
                                      <span>{node.user_code}</span>
                                    </div>
                                    <span className={`${styles.nodeStatusBadge} ${statusClass}`}>
                                      {node.status === "Approved" ? "✓ Bound" : "⏳ Pending"}
                                    </span>
                                  </div>
                                );
                              })}
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
                  <td colSpan="5" className={styles.emptyLedgerText}>No active tracking ledger records verified in database clusters.</td>
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