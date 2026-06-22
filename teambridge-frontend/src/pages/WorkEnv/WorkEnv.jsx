import React from 'react';

function WorkEnv() {
  const activeCluster = sessionStorage.getItem("active_charter_code") || "Unassigned Track";

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      alignItems: "center", 
      background: "#0f172a", 
      color: "#f8fafc", 
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "20px"
    }}>
      <div style={{ 
        background: "rgba(30, 41, 59, 0.7)", 
        padding: "40px", 
        borderRadius: "16px", 
        border: "1px solid rgba(255,255,255,0.08)", 
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        textAlign: "center",
        maxWidth: "550px",
        width: "100%"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "15px" }}>💻</div>
        <h1 style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px", margin: "0 0 10px 0", color: "#38bdf8" }}>
          WORK ENVIRONMENT
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: "1.6" }}>
          Consensus charter validated and stored successfully on Firebase Cloud. Active Pipeline Node: 
          <code style={{ background: "#334155", padding: "4px 8px", borderRadius: "4px", color: "#f43f5e", marginLeft: "6px", fontWeight: "600" }}>
            {activeCluster}
          </code>
        </p>
        
        <div style={{ 
          marginTop: "30px", 
          padding: "20px", 
          background: "rgba(15, 23, 42, 0.6)", 
          borderRadius: "8px", 
          borderLeft: "4px solid #38bdf8",
          textAlign: "left"
        }}>
          <h4 style={{ margin: "0 0 5px 0", fontSize: "14px", color: "#f8fafc" }}>📦 Next Structural Architecture Phase</h4>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            The development container platform has provisioned successfully. Share your design criteria for this view next to structure your workspace interface layout.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WorkEnv;