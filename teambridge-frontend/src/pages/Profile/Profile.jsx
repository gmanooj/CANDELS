import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css"; 
import { storage } from "../../firebaseConfig"; // Adjust relative path based on your folder structure
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileForm, setProfileForm] = useState({
    phone: "", gender: "", dob: "", bio: "", github_url: "", linkedin_url: "", profile_image: ""
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // 🔒 Switched from localStorage to sessionStorage to align with tab-isolated architecture
    const sessionData = sessionStorage.getItem("user_session");
    if (!sessionData) {
      navigate("/");
      return;
    }
    const loggedInUser = JSON.parse(sessionData);
    setUser(loggedInUser);

    if (isMounted) {
      fetchFreshDatabaseProfile(loggedInUser.user_code, loggedInUser);
    }
    return () => { isMounted = false; };
  }, [navigate]);

  const fetchFreshDatabaseProfile = async (userCode, sessionUser) => {
    try {
      const response = await fetch(`${__BACKEND_URL__}/api/users/profile-context?user_code=${userCode}`);
      if (response.ok) {
        const dbData = await response.json();
        
        setProfileForm({
          phone: dbData.phone || "",
          gender: dbData.gender || "",
          dob: dbData.dob ? dbData.dob.split("T")[0] : "",
          bio: dbData.bio || "",
          github_url: dbData.github_url || "",
          linkedin_url: dbData.linkedin_url || "",
          profile_image: dbData.profile_image || ""
        });

        setCompletionPercentage(dbData.completion_percentage);
        
        const refreshedUser = { ...sessionUser, ...dbData };
        setUser(refreshedUser);
        
        // 🔒 Updated profile sync serialization mapping to use tab-isolated sessionStorage
        sessionStorage.setItem("user_session", JSON.stringify(refreshedUser));
      }
    } catch (err) {
      setErrorMessage("Error connecting to root profile database channel.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCloudStorageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Generates a clean separate file node reference path to prevent sibling asset block collisions
    const storageRef = ref(storage, `avatar_nodes/${user.user_code}_${Date.now()}_${file.name}`);
    
    try {
      // Streams binaries directly down to your free 5GB Firebase Storage Bucket
      await uploadBytes(storageRef, file);
      const cloudUrl = await getDownloadURL(storageRef);
      
      setProfileForm(prev => ({ ...prev, profile_image: cloudUrl }));
      setSuccessMessage("Binary image asset pushed successfully to global cloud storage.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage("Cloud bucket rejected data stream binary. Verify Test Mode parameters.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); setSuccessMessage("");

    try {
      const res = await fetch(__BACKEND_URL__ + "/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_code: user.user_code, 
          ...profileForm,
          is_edit_override: isEditingMode 
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Identity metrics synchronized and locked successfully.");
        setCompletionPercentage(data.completion_percentage);
        setIsEditingMode(false); 
        
        const updatedUserSession = { ...user, ...profileForm, completion_percentage: data.completion_percentage };
        setUser(updatedUserSession);
        
        // 🔒 Save profile update changes safely inside tab-level storage
        sessionStorage.setItem("user_session", JSON.stringify(updatedUserSession));
        setTimeout(() => setSuccessMessage(""), 2000);
      } else {
        setErrorMessage(data.error || "Engine rejected profile parameter mutations.");
      }
    } catch (err) {
      setErrorMessage("Network structural breakdown handling transaction lines.");
    }
  };

  if (isLoading) {
    return (
      <div className="profile-loading-screen">
        <div className="spinner-node"></div>
        <p>Loading TB Workspace Profile </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '44px' }}>
          <img src="/logo.png" alt="Candels Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
          <span style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>CANDELS</span>
        </div>
        <nav className="sidebar-menu">
          <span className="menu-section-title">Operations Hub</span>
          <button className="menu-btn-item" onClick={() => navigate("/dashboard")}>Return to Dashboard</button>
          <button className="menu-btn-item active"> Account </button>
        </nav>
        <div className="sidebar-user-footer">
          <div className="user-info-short" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
            {profileForm.profile_image ? (
              <img src={profileForm.profile_image} alt="Avatar" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "var(--dev-blue)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{user?.first_name ? user.first_name[0] : "?"}</div>
            )}
            <div>
              <p className="user-name-footer" style={{ fontSize: "14px" }}>{user?.first_name} {user?.last_name}</p>
              <span className="user-role-badge" style={{ fontSize: "9px" }}>{user?.role}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {errorMessage && <div className="alert-box error">{errorMessage}</div>}
        {successMessage && <div className="alert-box success">{successMessage}</div>}

        <section className="profile-workspace-card">
          
          {/* Header Identity Layout Box Card Component */}
          <div className="profile-header-card">
            <div className="profile-identity-group">
              
              {/* Dynamic Image Canvas Frame featuring 100% Ring Logic assignment */}
              <div className="profile-avatar-wrapper">
                {profileForm.profile_image ? (
                  <img 
                    src={profileForm.profile_image} 
                    alt="User Avatar Node" 
                    className={`profile-avatar-media ${completionPercentage === 100 ? 'complete-fidelity' : 'incomplete-fidelity'}`}
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {user?.first_name ? user.first_name[0] : "?"}
                  </div>
                )}
                {completionPercentage === 100 && (
                  <div className="fidelity-badge-checkmark">✓</div>
                )}
              </div>

              <div className="profile-meta-details">
                <h1>{user?.first_name} {user?.last_name}</h1>
                <p>Internal Identity Reference: <span className="mono-code">{user?.user_code}</span></p>
                <span className="user-role-badge-premium">{user?.role} Unit</span>
              </div>
            </div>

            {/* Premium Apple Standard Action Mode Toggler Button */}
            <button 
              type="button" 
              className={`setup-action-btn secondary ${isEditingMode ? 'active-edit-state' : ''}`} 
              onClick={() => setIsEditingMode(!isEditingMode)}
            >
              {isEditingMode ? " Cancel Modification" : " Edit Profile"}
            </button>
          </div>

          {/* Integrated Analytics Meter Progress Block Status Display Rules */}
          <div className="profile-analytics-meter-box">
            <div className="metric-header-line">
              <span>Fidelity Data Integrity Matrix Metric Mapping</span>
              <span className={`metric-percentage ${completionPercentage === 100 ? 'complete' : 'progress'}`}>
                {completionPercentage}% Complete
              </span>
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill ${completionPercentage === 100 ? 'complete' : 'progress'}`} 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="dashboard-interactive-form">
            <div className="profile-input-grid">
              
              {/* Profile Image Node Input Section */}
              <div className="dash-input-group">
                <label>System Avatar Resource Node</label>
                {profileForm.profile_image && !isEditingMode ? (
                  <div className="cloud-url-stored-badge">
                    <span className="verified-dot"></span>
                    <span className="badge-text">Secure Image</span>
                  </div>
                ) : (
                  <div className="file-upload-input-wrapper">
                    <input type="file" accept="image/*" onChange={handleCloudStorageUpload} disabled={isUploadingImage} />
                  </div>
                )}
                {isUploadingImage && <span className="cloud-upload-status-bar">Streaming compressed bytes to secure cloud storage context pool...</span>}
              </div>

              {/* Secure Communication Phone Line */}
              <div className="dash-input-group">
                <label>
                  Secure Communication Phone Line 
                  {profileForm.phone && <span className="checkmark-validated"> ✓</span>}
                </label>
                <input 
                  type="text" 
                  name="phone"
                  value={profileForm.phone} 
                  onChange={handleInputChange} 
                  disabled={!isEditingMode && profileForm.phone !== ""} 
                  placeholder="+91 XXXXX XXXXX" 
                />
              </div>

              {/* Gender Designation */}
              <div className="dash-input-group">
                <label>
                  Gender Allocation  
                  {profileForm.gender && <span className="checkmark-validated"> ✓</span>}
                </label>
                {!isEditingMode && profileForm.gender !== "" ? (
                  <input 
                    type="text" 
                    value={profileForm.gender.toUpperCase()} 
                    disabled 
                    className="locked-input-style"
                  />
                ) : (
                  <select name="gender" value={profileForm.gender} onChange={handleInputChange}>
                    <option value="">Select Designation Status</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Others</option>
                  </select>
                )}
              </div>

              {/* Date Record of Birth */}
              <div className="dash-input-group">
                <label>
                  Date Record of Birth (DOB) 
                  {profileForm.dob && <span className="checkmark-validated"> ✓</span>}
                </label>
                <input 
                  type="date" 
                  name="dob"
                  value={profileForm.dob} 
                  onChange={handleInputChange} 
                  disabled={!isEditingMode && profileForm.dob !== ""} 
                />
              </div>

              {/* GitHub Target Pipeline URL */}
              <div className="dash-input-group">
                <label>
                  GitHub URL 
                  {profileForm.github_url && <span className="checkmark-validated"> ✓</span>}
                </label>
                <input 
                  type="url" 
                  name="github_url"
                  value={profileForm.github_url} 
                  onChange={handleInputChange} 
                  disabled={!isEditingMode && profileForm.github_url !== ""} 
                  placeholder="https://github.com/username"
                />
              </div>

              {/* LinkedIn Target Node URL */}
              <div className="dash-input-group">
                <label>
                  LinkedIn URL 
                  {profileForm.linkedin_url && <span className="checkmark-validated"> ✓</span>}
                </label>
                <input 
                  type="url" 
                  name="linkedin_url"
                  value={profileForm.linkedin_url} 
                  onChange={handleInputChange} 
                  disabled={!isEditingMode && profileForm.linkedin_url !== ""} 
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>

            {/* Architecture Biography Matrix Text Box Component */}
            <div className="dash-input-group" style={{ marginTop: "12px" }}>
              <label>
                Professional Biography Ledger Architecture 
                {profileForm.bio && <span className="checkmark-validated"> ✓</span>}
              </label>
              <textarea 
                rows="4" 
                name="bio"
                value={profileForm.bio} 
                onChange={handleInputChange} 
                disabled={!isEditingMode && profileForm.bio !== ""} 
                placeholder="Describe system environment core component layer expertise..." 
              ></textarea>
            </div>

            {/* Submit Bar Action Button */}
            {(isEditingMode || completionPercentage < 100) && (
              <button type="submit" className="form-submit-btn blue animated-slide-up">
                Save Profile
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}

export default Profile;