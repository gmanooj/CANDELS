import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import html2pdf from 'html2pdf.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import './DigitalDeclaration.css';

// Initialize your Socket.io client (adjust the URL port to match your Flask configuration)
const socket = io(__BACKEND_URL__, { transports: ["websocket"], upgrade: false });

const DigitalDeclaration = ({ teamCode, currentUser }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [docDetails, setDocDetails] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [teamFormDetails, setTeamFormDetails] = useState(null); // 🛠️ FIXED: Container for structural workspace telemetry
  const [loading, setLoading] = useState(true);

  // 1. Fetch initial status & setup real-time socket listeners
  useEffect(() => {
    const token = sessionStorage.getItem("auth_token");
    // 🛠️ FIXED: Dual parallel fetch pipeline gathers baseline row configurations AND roster contexts simultaneously
    Promise.all([
      fetch(`${__BACKEND_URL__}/api/declaration/${teamCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`${__BACKEND_URL__}/api/team/digital-form-context?team_code=${teamCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
    .then(([declarationData, formContextData]) => {
      if (declarationData.document) {
        setDocDetails(declarationData.document);
        setParticipants(declarationData.signatures);
      }
      if (!formContextData.error) {
        setTeamFormDetails(formContextData); // Stores photos, timeline strings, and industry tracks safely
      }
      setLoading(false);
    })
    .catch((err) => {
      console.error("Error loading complete declaration framework nodes:", err);
      setLoading(false);
    });

    // Join the team-specific socket room
    socket.emit('join_declaration', { team_code: teamCode });

    // Listen for live teammate signature updates
    socket.on('signature_updated', (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_name === data.user_name
            ? { ...p, signature_image: data.signature_image, signed_at: data.signed_at }
            : p
        )
      );
    });

    // --- AUTOMATED FIREBASE CLOUD COMPILATION & UPLOAD ---
    socket.on('declaration_complete', async (data) => {
      setDocDetails((prev) => ({ ...prev, is_fully_declared: true, declared_date: data.declared_date }));
      
      setTimeout(async () => {
        const element = document.getElementById('declaration-document');
        
        const opt = {
          margin:       0.4,
          filename:     `${teamCode}(Declaration).pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        try {
          const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
          const storage = getStorage();
          const storageRef = ref(storage, `declarations/${teamCode}(Declaration).pdf`);

          const uploadResult = await uploadBytes(storageRef, pdfBlob);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          
          console.log("File saved to Firebase Storage successfully:", downloadURL);

          await fetch(__BACKEND_URL__ + '/api/declaration/save-cloud-url', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem("auth_token")}`
            },
            body: JSON.stringify({ team_code: teamCode, firebase_url: downloadURL })
          });

        } catch (error) {
          console.error("Firebase structural upload failure:", error);
        } finally {
          window.location.href = '/work-env';
        }
      }, 1500);
    });

    return () => {
      socket.off('signature_updated');
      socket.off('declaration_complete');
    };
  }, [teamCode]);

  // Canvas Drawing Engine Context Actions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); };

  // Canvas Drawing Engine Context Actions (Touch/Mobile)
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    const base64Image = canvas.toDataURL('image/png');

    try {
      const response = await fetch(__BACKEND_URL__ + '/api/declaration/sign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem("auth_token")}`
        },
        body: JSON.stringify({
          team_code: teamCode,
          user_name: currentUser.name, 
          signature_base64: base64Image
        })
      });
      const data = await response.json();
      if (data.status !== 'success') alert('Failed to finalize authorization signature block.');
    } catch (err) {
      console.error("Error signing document engine context:", err);
    }
  };

  if (loading) return <div className="loading" style={{ padding: "40px", textAlign: "center" }}>Loading Consensus Instrument Parameters...</div>;

  const userSignatureObj = participants.find(p => p.user_name === currentUser.name);
  const hasSigned = userSignatureObj?.signature_image !== null;

  return (
    <div className="declaration-container">
      <div className="document-paper" id="declaration-document">
        
        {/* Dynamic Digital Completion Seal Overlay */}
        {docDetails?.is_fully_declared && (
          <div className="official-seal animate-seal">
            <div className="seal-inner">
              <span>DECLARED</span>
              <small>COMPLETED</small>
              <small style={{ fontSize: "9px" }}>{docDetails.declared_date}</small>
            </div>
          </div>
        )}

        {/* Document Header Metadata Section */}
        <div className="doc-header">
          <h1>DIGITAL DOCUMENT</h1>
          <p className="team-badge">TEAM CODE : {teamCode}</p>
          <div className="project-meta-box">
            <h2>Project Title: <span>{docDetails?.project_name || teamFormDetails?.project_name}</span></h2>
            <div>Subject/Course: <span>{docDetails?.subject_details || teamFormDetails?.subject}</span></div>
            <div>Duration: <span>{teamFormDetails?.timeline || "N/A"}</span></div>
            <div>Target Sector: <span>{teamFormDetails?.target_industry || "Technology"}</span></div>
            <div>Date: <span>{docDetails?.created_at ? new Date(docDetails.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span></div>
          </div>
        </div>

        <hr className="doc-divider" />

        {/* 🛠️ FIXED: Renders the active Faculty Supervisor segment containing their profile avatar photo explicitly */}
        {teamFormDetails?.faculty && (
          <div className="faculty-supervisor-section">
            <h3>Academic Faculty Guide</h3>
            <div className="faculty-supervisor-banner">
              <div className="faculty-avatar-container">
                {teamFormDetails.faculty.photo ? (
                  <img src={teamFormDetails.faculty.photo} alt="Faculty supervisor" className="faculty-avatar" />
                ) : (
                  <div className="avatar-placeholder">🎓</div>
                )}
              </div>
              <div className="faculty-info">
                <h3>{teamFormDetails.faculty.name}</h3>
                <p>Assigned Academic Faculty Research Guide <code>{teamFormDetails.faculty.email}</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Teammates Section Wrapper */}
        <div className="teammates-section">
          <h3>Workspace Signatories Matrix</h3>
          <div className="participants-grid">
            {participants.map((person, index) => {
              const isGuide = person.user_role === 'Guide';
              
              // 🛠️ FIXED: Cross-references the active list to locate matching roster profile photos dynamically
              const matchingRosterItem = teamFormDetails?.roster?.find(r => r.name === person.user_name);
              const userPhotoUrl = matchingRosterItem?.photo;

              return (
                <div key={index} className={`participant-card ${isGuide ? 'guide-highlight' : ''}`}>
                  <div className="card-badge">{isGuide ? "Project Guide" : person.user_role.toUpperCase()}</div>
                  
                  {/* 🛠️ FIXED: Injects individual student profile photos directly inside each grid card container */}
                  <div className="participant-identity-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {userPhotoUrl ? (
                      <img src={userPhotoUrl} alt="" className="roster-inline-photo" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="roster-photo-placeholder" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#94a3b8', border: '2px solid #e2e8f0' }}>👤</div>
                    )}
                    <h3 className="card-name-text" style={{ margin: 0 }}>{person.user_name}</h3>
                  </div>
                  
                  <div className="signature-area-display">
                    {person.signature_image ? (
                      <img src={person.signature_image} alt={`${person.user_name} auth mark`} className="rendered-sig" />
                    ) : (
                      <div className="sig-status-pending">⏳ Pending Signature</div>
                    )}
                  </div>
                  <p className="sig-label">Authorized Verification Sign</p>
                </div>
              );
            })}
          </div>
        </div>

        <hr className="doc-divider" />

        {/* Active Capture Canvas Sign Box Component for Logged-In Identity */}
        {!hasSigned && !docDetails?.is_fully_declared && (
          <div className="active-signature-section">
            <h3>Interactive Signatory Canvas Pad: <span className="user-highlight">{currentUser.name}</span></h3>
            <p className="instruction">Apply signature validation framework into the boundary parameters below:</p>
            
            <div className="canvas-wrapper">
              <canvas
                ref={canvasRef}
                width={450}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
            
            <div className="canvas-controls">
              <button className="btn-clear" onClick={clearCanvas}>Reset Pad</button>
              <button className="btn-submit" onClick={submitSignature}>Authorize & Lock Signature</button>
            </div>
          </div>
        )}

        {hasSigned && !docDetails?.is_fully_declared && (
          <div className="waiting-banner">
            🎉 Your validation mark has been checked into the node matrix. Waiting on outstanding teammates and the project guide signature parameters...
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalDeclaration;