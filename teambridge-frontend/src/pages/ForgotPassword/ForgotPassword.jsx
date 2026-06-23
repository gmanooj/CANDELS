import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import LoaderPortal from "../../components/LoaderPortal/LoaderPortal";
import "../Login/Login.css";
import "./ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Detect if there is a token in the URL path string (e.g., ?token=XYZ)
  const tokenFromUrl = searchParams.get("token");

  // Flow control states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusState, setStatusState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Handler for Phase 1: Requesting a reset link via email
  const handleRequestLinkSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setStatusState("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      setStatusState("idle");

      if (!response.ok) throw new Error(data.error || "Something went wrong.");

      setInfoMessage("A secure reset link has been dispatched to your email address! Check your inbox.");
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Handler for Phase 2: Submitting the brand new password securely
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    setStatusState("loading");

    try {
      const response = await fetch(__BACKEND_URL__ + "/api/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromUrl, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setStatusState("idle");
        throw new Error(data.error || "Password reset authorization failed.");
      }

      // Play the premium access sound asset we built earlier
      setStatusState("success");
      try {
        const audio = new Audio("/success.mp3");
        audio.volume = 0.4;
        audio.play();
      } catch (soundErr) { console.log(soundErr); }

      setTimeout(() => {
        navigate("/");
      }, 2500);

    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="login-page-full-view">
      <LoaderPortal statusState={statusState} />

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
        <div className="login-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "30px" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" alt="Candels Logo" style={{ height: '36px', objectFit: 'contain' }} />
              <span style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px', color: '#1d1d1f' }}>CANDELS</span>
            </div>
          </div>

          {/* DYNAMIC RENDERING CONDITION: IF TOKEN IS PRESENT SHOW PASSWORDS RESET, ELSE SHOW REQUEST */}
          {!tokenFromUrl ? (
            <>
              <h2>Forgot Password?</h2>
              <p>Enter your registered email address and we'll transmit a secure access key link right over.</p>

              {errorMessage && <div className="alert-box error">{errorMessage}</div>}
              {infoMessage && <div className="alert-box success" style={{ background: "#dbeafe", color: "#2563eb", borderColor: "#bfdbfe" }}>{infoMessage}</div>}

              <form onSubmit={handleRequestLinkSubmit}>
                <div className="input-group">
                  <input 
                    type="email" 
                    placeholder="Enter your email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <button className="login-btn" type="submit">Send Reset Link</button>
              </form>
            </>
          ) : (
            <>
              <h2>Create New Password</h2>
              <p>Your identity token has been validated. Set up a brand new secure master key.</p>

              {errorMessage && <div className="alert-box error">{errorMessage}</div>}

              <form onSubmit={handleResetPasswordSubmit}>
                <div className="input-group">
                  <input 
                    type="password" 
                    placeholder="New Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                <div className="input-group">
                  <input 
                    type="password" 
                    placeholder="Confirm New Password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>
                <button className="login-btn" type="submit" style={{ background: "#10b981" }}>Update Password</button>
              </form>
            </>
          )}

          <p className="register-link" style={{ marginTop: "20px" }}>
            Back securely to <Link to="/">Login page</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;