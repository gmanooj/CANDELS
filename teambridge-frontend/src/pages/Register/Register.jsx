import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoaderPortal from "../../components/LoaderPortal/LoaderPortal";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  
  // View mode state framework: 'form' | 'otp_verify'
  const [viewMode, setViewMode] = useState("form");
  const [targetEmail, setTargetEmail] = useState("");
  
  // Multi-Digit Array Matrix
  const [otpArray, setOtpArray] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);

  // Resend Timer Hooks
  const [countdown, setCountdown] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");

  // Status Animation States: 'idle' | 'loading' | 'success_popup' | 'error_popup'
  const [statusAnimation, setStatusAnimation] = useState("idle");

  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", role: "", password: "", confirmPassword: ""
  });

  const [errorMessage, setErrorMessage] = useState("");

  // Countdown clock loop handles resend availability windows smoothly
  useEffect(() => {
    let timer;
    if (viewMode === "otp_verify" && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown, viewMode]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Automated Segmented Focus Traversal Engine
  const handleOtpBoxChange = (element, index) => {
    const val = element.value.replace(/\D/g, ""); 
    if (!val) return;

    const updatedOtp = [...otpArray];
    updatedOtp[index] = val.substring(val.length - 1); 
    setOtpArray(updatedOtp);

    if (index < 5 && element.value) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otpArray[index] && index > 0) {
        inputRefs.current[index - 1].focus();
      } else {
        const updatedOtp = [...otpArray];
        updatedOtp[index] = "";
        setOtpArray(updatedOtp);
      }
    }
  };

  // API TASK 1: Basic profiles processing initialization
  const handleFormSubmission = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    setStatusAnimation("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password
        })
      });

      const serverPayload = await response.json();
      setStatusAnimation("idle");

      if (!response.ok) throw new Error(serverPayload.error || "Registration step failed.");

      setTargetEmail(formData.email);
      setNewEmailInput(formData.email);
      setViewMode("otp_verify");
      setCountdown(30);
      setIsResendDisabled(true);
      setOtpArray(new Array(6).fill(""));

    } catch (err) {
      setStatusAnimation("idle");
      setErrorMessage(err.message);
    }
  };

  // API TASK 2: Advanced Verification Challenge Handshake
  const handleOtpVerificationSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    const fullCompiledOtp = otpArray.join("");

    if (fullCompiledOtp.length < 6) {
      setErrorMessage("Please complete the 6-digit verification sequence.");
      return;
    }

    setStatusAnimation("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, otp: fullCompiledOtp })
      });

      const data = await response.json();

      if (!response.ok) {
        setStatusAnimation("error_popup");
        throw new Error(data.error || "Verification authentication failed.");
      }

      // Success Trigger: Display account compilation animation screens cleanly
      setStatusAnimation("success_popup");
      try {
        new Audio("/success.mp3").play();
      } catch (err) { console.log("Audio skipped", err); }

      setTimeout(() => {
        setStatusAnimation("idle");
        navigate("/"); // Smooth fallback navigation down straight onto Login View
      }, 3500);

    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleResendOtpRequest = async () => {
    setErrorMessage("");
    setOtpArray(new Array(6).fill(""));
    setStatusAnimation("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });

      setStatusAnimation("idle");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Resend processing failed.");
      }

      setCountdown(30);
      setIsResendDisabled(true);
    } catch (err) {
      setStatusAnimation("idle");
      setErrorMessage(err.message);
    }
  };

  const handleUpdateEmailSubmit = async () => {
    setErrorMessage("");
    if (!newEmailInput.trim() || newEmailInput === targetEmail) {
      setIsEditingEmail(false);
      return;
    }

    setStatusAnimation("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/update-registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_email: targetEmail, new_email: newEmailInput })
      });

      const data = await response.json();
      setStatusAnimation("idle");

      if (!response.ok) throw new Error(data.error || "Email transition rejected.");

      setTargetEmail(data.new_email);
      setIsEditingEmail(false);
      setCountdown(30);
      setIsResendDisabled(true);
      setOtpArray(new Array(6).fill(""));
    } catch (err) {
      setStatusAnimation("idle");
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="register-container-viewport">

      {/* =========================================================
          🔮 DYNAMIC HIGH-END STATUS INTERFACE OVERLAYS
          ========================================================= */}
      
      <LoaderPortal 
        statusState={
          statusAnimation === "loading" 
            ? "loading" 
            : statusAnimation === "success_popup" 
              ? "success" 
              : "idle"
        } 
        customText="Synchronizing security protocols..."
      />

      {statusAnimation === "error_popup" && (
        <div className="custom-motion-overlay red-block">
          <div className="motion-wrapper-card failure-bounce">
            <div className="red-warning-circle-shell">
              <div className="cross-close-icon">×</div>
            </div>
            <h2 className="motion-title" style={{ color: "#ef4444" }}>Access Denied</h2>
            <p className="motion-desc">{errorMessage || "Invalid passcode signatures."}</p>
            <button className="error-dismiss-btn" onClick={() => setStatusAnimation("idle")}>Re-verify Fields</button>
          </div>
        </div>
      )}

      {/* BRANDING SIDE PANEL */}
      <div className="register-branding-sidebar">
        <div className="logo-box" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Candels Logo" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} />
          <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px', color: '#fff' }}>CANDELS</span>
        </div>
        <div className="sidebar-marketing-hero">
          <h2>Build Better Projects Together</h2>
          <p>Join Candels and collaborate with teammates, connect with faculty mentors, and manage all project resources from one platform.</p>
        </div>
        <div className="sidebar-footer-signature">
          <span>Standardized Workspace Protocol v2.4</span>
        </div>
      </div>

      {/* REGISTRATION CORE FRAME WORKSPACE */}
      <div className="register-form-workspace-panel">
        <div className="register-scrollable-inner-card">
          
          {viewMode === "form" ? (
            <>
              <h2>Create Account</h2>
              <p className="card-subtitle-caption">Create your Candels account to get started.</p>

              {errorMessage && <div className="inline-alert-banner style-err">{errorMessage}</div>}

              <form onSubmit={handleFormSubmission} className="main-register-form-tree">
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Enter your full name" required />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email" required />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Enter your phone number" />
                </div>
                <div className="input-group">
                  <label>Select Role</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="">Choose Role</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Create password" required />
                </div>
                <div className="input-group">
                  <label>Confirm Password</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm password" required />
                </div>
                <button type="submit" className="login-btn">Create Account</button>
              </form>
              <p className="register-link">Already have an account? <Link to="/">Login</Link></p>
            </>
          ) : (
            <>
              <h2>Verify Identity</h2>
              <p style={{ marginBottom: "10px" }} className="card-subtitle-caption">A secure 6-digit passcode has been transmitted to your mailbox:</p>
              
              <div className="email-management-badge-container">
                {isEditingEmail ? (
                  <div className="inline-edit-input-wrapper-row">
                    <input 
                      type="email" 
                      value={newEmailInput} 
                      onChange={(e) => setNewEmailInput(e.target.value)} 
                      className="inline-email-txt-box" 
                    />
                    <button type="button" className="inline-save-btn" onClick={handleUpdateEmailSubmit}>Save</button>
                    <button type="button" className="inline-cancel-btn" onClick={() => setIsEditingEmail(false)}>×</button>
                  </div>
                ) : (
                  <div className="inline-display-pill-box">
                    <span className="masked-target-email-lbl">{targetEmail}</span>
                    <button type="button" className="inline-modify-trigger-btn" onClick={() => setIsEditingEmail(true)}>Change Email ✏️</button>
                  </div>
                )}
              </div>

              {errorMessage && statusAnimation === "idle" && (
                <div className="inline-alert-banner style-err" style={{ marginTop: "15px" }}>{errorMessage}</div>
              )}

              <form onSubmit={handleOtpVerificationSubmit} style={{ marginTop: "25px" }}>
                <div className="segmented-otp-grid-row">
                  {otpArray.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength="1"
                      ref={(el) => (inputRefs.current[idx] = el)}
                      value={digit}
                      onChange={(e) => handleOtpBoxChange(e.target, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="single-digit-input-block"
                    />
                  ))}
                </div>

                <button type="submit" className="login-btn action-verify-btn">Verify Access Credentials</button>
              </form>

              <div className="otp-action-management-footer">
                {countdown > 0 ? (
                  <p className="countdown-timer-prompt">
                    Resend available in: <strong>00:{countdown < 10 ? `0${countdown}` : countdown}</strong>
                  </p>
                ) : (
                  <button 
                    type="button" 
                    className="trigger-resend-action-link" 
                    onClick={handleResendOtpRequest}
                  >
                    🔄 Resend Security Code
                  </button>
                )}
              </div>

              <p className="register-link">
                <button className="back-to-form-btn-link" onClick={() => { setViewMode("form"); setErrorMessage(""); }}>
                  ← Back to Details Registration
                </button>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default Register;