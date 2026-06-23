import { useState, useEffect } from "react";
import "./LoaderPortal.css";

function LoaderPortal({ statusState, customText = "" }) {
  const [loadingStep, setLoadingStep] = useState(0);

  // Royal Enfield Style Sequence Arrays
  const loadingSequences = [
    { icon: "🚀", text: "Initializing TeamBridge Gateway..." },
    { icon: "👥", text: "Syncing Team Workspaces..." },
    { icon: "📁", text: "Mounting Document Vaults..." },
    { icon: "⚡", text: "Establishing Secure Bridge Connection..." }
  ];

  // Rotate through loading elements sequentially when active
  useEffect(() => {
    let interval;
    if (statusState === "loading") {
      interval = setInterval(() => {
        setLoadingStep((prevStep) => (prevStep + 1) % loadingSequences.length);
      }, 600);
    }
    return () => clearInterval(interval);
  }, [statusState, loadingSequences.length]);

  // If the component is idle, render absolutely nothing
  if (statusState === "idle") return null;

  return (
    <div className="loading-overlay">
      {statusState === "loading" && (
        <div className="loader-content-box">
          <div className="enfield-icon-display">
            {loadingSequences[loadingStep].icon}
          </div>
          <p className="loader-status-text">
            {customText || loadingSequences[loadingStep].text}
          </p>
        </div>
      )}

      {statusState === "success" && (
        <div className="loader-content-box success-pop-card">
          <div className="success-checkmark-circle">✓</div>
          <h2 className="success-title">Access Granted</h2>
          <p className="success-subtitle">Welcome back to TeamBridge workspace.</p>
        </div>
      )}
    </div>
  );
}

export default LoaderPortal;