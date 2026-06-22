import React, { useState, useEffect } from 'react';

const PermanentAllocationBanner = ({ teamCode, refreshTrigger, onOpenAllocationMatrix }) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAllocationFidelity = async () => {
      if (!teamCode) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`${__BACKEND_URL__}/api/team/validation-status?team_code=${teamCode}`);
        const result = await response.json();
        
        if (result.status === 'success') {
          setStatusData(result.data);
        } else {
          console.warn("Validation API message:", result.error);
        }
      } catch (error) {
        console.error("Fidelity verification error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAllocationFidelity();
  }, [teamCode, refreshTrigger]); // Pinned to tracking changes when a guide is assigned

  if (loading || !statusData) return null;

  // Render nothing if a guide/faculty member is successfully detected in memberships
  if (statusData.guideAllotted) return null;

  return (
    <div className="w-full mb-6" style={{ width: "100%", marginBottom: "20px" }}>
      <div 
        style={{ 
          borderRadius: "14px", 
          borderLeft: "4px solid #d97706", 
          padding: "20px", 
          background: "#fffbeb", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)" 
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div 
            style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "50%", 
              background: "#fef3c7", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "18px" 
            }}
          >
            ⚠️
          </div>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#78350f" }}>
              Action Required: Missing Team Guide/Faculty Allocation
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#92400e", lineHeight: "1.4" }}>
              Your workspace team node (<strong>{statusData.teamCode}</strong>) does not have a Project Guide allotted. 
              The <u>Digital Declaration Form</u> features remain locked until a Faculty member joins your cluster roster matrix.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAllocationMatrix}
          className="form-submit-btn blue"
          style={{ padding: "10px 20px", fontSize: "13px", margin: 0, borderRadius: "8px", width: "auto" }}
        >
          Allot Faculty Guide →
        </button>
      </div>
    </div>
  );
};

export default PermanentAllocationBanner;