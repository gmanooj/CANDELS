import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkspaceDashboard.css';

export default function WorkspaceDashboard() {
    const navigate = useNavigate();
    const [myProjects, setMyProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [userDisplayName, setUserDisplayName] = useState("");
    
    // About & Contact tab states
    const [activeTab, setActiveTab] = useState('clusters'); // 'clusters', 'about', 'contact'
    const [userEmail, setUserEmail] = useState("");
    const [contactSubject, setContactSubject] = useState("Bug Report");
    const [contactMessage, setContactMessage] = useState("");
    const [contactPriority, setContactPriority] = useState("Normal");
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const sessionData = sessionStorage.getItem("user_session");
        if (!sessionData) {
            setErrorMessage("No active identity token found inside session registry.");
            setLoading(false);
            return;
        }

        const loggedInUser = JSON.parse(sessionData);
        const userCode = loggedInUser.user_code;       
        
        const firstName = loggedInUser.first_name || "";
        const lastName = loggedInUser.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();
        setUserDisplayName(fullName || userCode);
        
        if (loggedInUser.email) {
            setUserEmail(loggedInUser.email);
        }

        fetch(`${__BACKEND_URL__}/api/users/dashboard-context?user_code=${userCode}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Active resource stream context returned a system connection drop.");
            }
            return res.json();
        })
        .then(data => {
            if (data.projects) {
                setMyProjects(data.projects); 
            } else {
                setErrorMessage("No active workspace allocations mapped to your configuration token.");
            }
            setLoading(false);
        })
        .catch(err => {
            setErrorMessage("Failed to establish operational link with core backend real-time engine.");
            setLoading(false);
        });
    }, []);

    // Explicit handler to route to the Active IDE workspace session
    const handleLaunchWorkspace = (teamCode) => {
        navigate(`/workspace/editor/${teamCode}`);
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        setSubmitError("");
        setSubmitSuccess(false);
        setIsSubmitting(true);

        if (!userEmail || !contactSubject || !contactMessage) {
            setSubmitError("Please fill out all required fields.");
            setIsSubmitting(false);
            return;
        }

        fetch(__BACKEND_URL__ + '/api/workspace/system-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                subject: contactSubject,
                message: contactMessage,
                priority: contactPriority
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => {
                    throw new Error(err.error || "Failed to submit support request.");
                });
            }
            return res.json();
        })
        .then(data => {
            setSubmitSuccess(true);
            setContactMessage("");
            setContactSubject("Bug Report");
            setContactPriority("Normal");
            setIsSubmitting(false);
        })
        .catch(err => {
            setSubmitError(err.message || "Unable to establish communication with the request registry.");
            setIsSubmitting(false);
        });
    };

    return (
        <div className="apple-workspace-wrapper workspace-dashboard-container">
            
            <aside className="apple-inner-sidebar">
                <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
                    <img src="/logo.png" alt="Candels Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>CANDELS</span>
                </div>

                <nav className="apple-menu-list">
                    <span className="menu-section-title">Tools & Directions</span>
                    <button className="apple-menu-item" onClick={() => navigate('/dashboard')}>
                         Back to Dashboard
                    </button>
                    
                    <button 
                        className={`apple-menu-item ${activeTab === 'clusters' ? 'active-segment' : ''}`} 
                        onClick={() => {
                            setActiveTab('clusters');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                         Active IDE Clusters
                    </button>
                    
                    <button 
                        className={`apple-menu-item ${activeTab === 'about' ? 'active-segment' : ''}`} 
                        onClick={() => {
                            setActiveTab('about');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                         About Candels
                    </button>
                    
                    <button 
                        className={`apple-menu-item ${activeTab === 'contact' ? 'active-segment' : ''}`} 
                        onClick={() => {
                            setActiveTab('contact');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                         Contact Request
                    </button>
 
                    <button className="apple-menu-item" onClick={() => navigate('/profile')}>
                         Account Profile
                    </button>
                    
                    <button className="apple-menu-item font-semibold text-blue-600 dark:text-blue-400" onClick={() => navigate('/settings')}>
                         Settings
                    </button>
                </nav>
            </aside>

            <main className="apple-main-canvas">
                <header className="content-header">
                    <div>
                        <h1>Project Workspace </h1>
                        <p className="subtitle">
                            Active Security Node: <span className="node-highlight">{userDisplayName}</span>
                        </p>
                    </div>
                </header>

                {loading && activeTab === 'clusters' && <div className="loading-clusters-text">Querying configuration channels...</div>}
                {errorMessage && activeTab === 'clusters' && <div className="alert-box error has-margin-bottom">❌ {errorMessage}</div>}

                {/* Tab Content Rendering */}
                {activeTab === 'clusters' && (
                    <div className="apple-panel-card">
                        <h3 className="dashboard-section-header">
                            Allocated Project Environments
                        </h3>

                        {!loading && !errorMessage && myProjects.length === 0 && (
                            <div className="empty-projects-message">
                                No active project workspace assignments mapped inside.
                            </div>
                        )}

                        <div className="projects-list">
                            {myProjects.map((project, idx) => (
                                <div 
                                    key={idx} 
                                    className="apple-workspace-card"
                                    onClick={() => handleLaunchWorkspace(project.team_code)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleLaunchWorkspace(project.team_code); }}
                                >
                                    <div>
                                        <span className="project-badge-title">
                                            Cluster Key: {project.team_code}
                                        </span>
                                        <h3>{project.project_name}</h3>
                                        
                                        <div className="project-meta-row">
                                            <span className="apple-pill-tag">
                                                Domain: {project.subject}
                                            </span>
                                            <span className="apple-pill-tag">
                                                Entity: {project.workplace_name}
                                            </span>
                                            <span className="apple-pill-tag accented">
                                                Size: {project.members_count} Members
                                            </span>
                                        </div>
                                    </div>

                                    {/* Turned this into a semantic UI element that matches the parent click seamlessly */}
                                    <div className="apple-workspace-card" onClick={() => navigate(`/workspace/editor/${project.team_code}`)}>
                                        {/* ... */}
                                        <div className="apple-ide-trigger">LAUNCH WORKSPACE →</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div>
                        <div className="about-hero-section">
                            <h2>Welcome to Candels Workspace</h2>
                            <p>
                                An advanced, unified developer IDE portal tailored for seamless Capstone project execution, live code telemetry tracking, real-time collaboration, and automated grading pipelines.
                            </p>
                        </div>

                        <div className="about-features-grid">
                            <div className="about-feature-card">
                                <div className="feature-icon-wrapper">⌨️</div>
                                <h4>Keystroke Telemetry</h4>
                                <p>Real-time telemetry logging of key events, activity statistics, and active developer inputs to assess coding contributions accurately.</p>
                            </div>
                            
                            <div className="about-feature-card">
                                <div className="feature-icon-wrapper">📄</div>
                                <h4>Microsoft Word Replica</h4>
                                <p>A high-fidelity live-sync document replica supporting professional page break visualization, local sync monitor, and layout rendering.</p>
                            </div>
                            
                            <div className="about-feature-card">
                                <div className="feature-icon-wrapper">📊</div>
                                <h4>Slides-as-Code Canvas</h4>
                                <p>Write and present markdown-based presentation decks natively, eliminating heavy third-party rendering frameworks and libraries.</p>
                            </div>

                            <div className="about-feature-card">
                                <div className="feature-icon-wrapper">📋</div>
                                <h4>Kanban Boards</h4>
                                <p>Visual task management interface with drag-and-drop support, status categories, and individual task assignment configurations.</p>
                            </div>

                            <div className="about-feature-card">
                                <div className="feature-icon-wrapper">🏆</div>
                                <h4>Grading & Assessment</h4>
                                <p>A direct, transparent feedback and score assessment console for mentors and faculty leads to validate project milestones.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'contact' && (
                    <div className="contact-layout-grid">
                        <div className="contact-info-sidebar">
                            <div className="contact-info-card">
                                <h4>Support Hub Contacts</h4>
                                <p className="contact-description">
                                    For operational concerns, server status logs, or identity access questions, contact our registry support lines:
                                </p>
                                               <div className="contact-email-item">
                                    <span className="contact-email-label">Core Administration</span>
                                    <a href="mailto:admin@candels.com" className="contact-email-link">admin@candels.com</a>
                                </div>
                                
                                <div className="contact-email-item has-margin">
                                    <span className="contact-email-label">Academic Coordination</span>
                                    <a href="mailto:support@candels.com" className="contact-email-link">support@candels.com</a>
                                </div>
                                
                                <div className="contact-email-item has-margin">
                                    <span className="contact-email-label">DevOps & Server Team</span>
                                    <a href="mailto:devops@candels.com" className="contact-email-link">devops@candels.com</a>
                                </div>
                            </div>

                            <div className="contact-info-card is-light">
                                <h4 className="secondary">Request Processing</h4>
                                <p className="contact-info-desc-text">
                                    Submitted requests are logged directly to the MySQL database under request-tracking protocols. Our administrative leads review tickets based on priority parameters.
                                </p>
                            </div>
                        </div>

                        <div className="contact-form-card">
                            <h3>Submit System Request</h3>
                            
                            {submitSuccess && (
                                <div className="success-banner">
                                    <span>✅ Request registered successfully inside central database node.</span>
                                </div>
                            )}
                            
                            {submitError && (
                                <div className="alert-box error has-margin-bottom-small">
                                    ❌ {submitError}
                                </div>
                            )}

                            <form onSubmit={handleContactSubmit}>
                                <div className="form-group">
                                    <label>Prefilled User Email</label>
                                    <input 
                                        type="email" 
                                        className="form-input-text"
                                        value={userEmail}
                                        readOnly
                                        required
                                    />
                                </div>

                                <div className="form-group-row">
                                    <div className="form-group">
                                        <label>Request Subject</label>
                                        <select 
                                            className="form-select-field"
                                            value={contactSubject}
                                            onChange={(e) => setContactSubject(e.target.value)}
                                        >
                                            <option value="Bug Report">Bug Report</option>
                                            <option value="Feature Proposal">Feature Proposal</option>
                                            <option value="Resource Allocation Request">Resource Allocation Request</option>
                                            <option value="Account Support">Account Support</option>
                                            <option value="Other Support Request">Other Support Request</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Priority Level</label>
                                        <select 
                                            className="form-select-field"
                                            value={contactPriority}
                                            onChange={(e) => setContactPriority(e.target.value)}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Normal">Normal</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Request Details / Message</label>
                                    <textarea 
                                        className="form-textarea-field"
                                        placeholder="Provide description of your system allocation or support requirements..."
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        required
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn-submit-request"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Transmitting Request Node...' : 'TRANSMIT SYSTEM REQUEST →'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}