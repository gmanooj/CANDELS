import React, { useState, useEffect } from 'react';
import { AlertTriangle, UserPlus, ShieldAlert, ArrowRight, CheckSquare, ShieldCheck } from 'lucide-react';

const PendingAllocationHub = ({ teamId }) => {
  const [loading, setLoading] = useState(true);
  const [allocationStatus, setAllocationStatus] = useState({
    guideAllotted: false,
    teammatesAllotted: false,
  });
  const [isSigned, setIsSigned] = useState(false);

  // Check if all validations pass
  const isEverythingReady = allocationStatus.guideAllotted && allocationStatus.teammatesAllotted;

  // Fetch status on component mount
  useEffect(() => {
    fetchStatus();
  }, [teamId]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token'); // Retrieve your JWT token
      const response = await fetch(`/api/team/${teamId}/validation-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAllocationStatus({
          guideAllotted: result.data.guideAllotted,
          teammatesAllotted: result.data.teammatesAllotted,
        });
      }
    } catch (error) {
      console.error("Error fetching allocation status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mock handlers to simulate completing the work directly on this page
  const handleAllotGuide = async () => {
    // In production, open a dropdown/modal and hit your PUT/POST allocation route
    alert("Redirecting or opening Guide allocation matrix...");
    // Simulating completion for demonstration:
    setAllocationStatus(prev => ({ ...prev, guideAllotted: true }));
  };

  const handleAddTeammates = () => {
    alert("Opening teammate node assignment settings...");
    setAllocationStatus(prev => ({ ...prev, teammatesAllotted: true }));
  };

  const handleSubmitDeclaration = () => {
    if (isSigned) {
      alert("Digital Declaration Charter successfully saved and locked!");
      // Logic to push status to backend database
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all">
        
        {/* CONDITION A: If things are still empty, show the Pending Tasks Hub */}
        {!isEverythingReady ? (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="text-amber-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Pending Allocations Detected</h2>
              <p className="text-slate-500 mt-2 text-sm">
                Your profile layout and charter initialization are restricted until the team structure is finalized.
              </p>
            </div>

            <div className="space-y-4">
              {/* Guide Status Card */}
              <div className={`p-5 rounded-xl border flex items-center justify-between dynamic-card ${
                allocationStatus.guideAllotted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200'
              }`}>
                <div className="flex gap-4 items-center">
                  <div className={`p-3 rounded-lg ${allocationStatus.guideAllotted ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm md:text-base">Project Guide / Mentor</h4>
                    <p className="text-xs md:text-sm text-slate-500">
                      {allocationStatus.guideAllotted ? 'Assigned successfully.' : 'No guide has been assigned to this team.'}
                    </p>
                  </div>
                </div>
                {!allocationStatus.guideAllotted && (
                  <button onClick={handleAllotGuide} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors">
                    Allot Guide
                  </button>
                )}
              </div>

              {/* Teammates Status Card */}
              <div className={`p-5 rounded-xl border flex items-center justify-between dynamic-card ${
                allocationStatus.teammatesAllotted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200'
              }`}>
                <div className="flex gap-4 items-center">
                  <div className={`p-3 rounded-lg ${allocationStatus.teammatesAllotted ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm md:text-base">Teammate Group Allocation</h4>
                    <p className="text-xs md:text-sm text-slate-500">
                      {allocationStatus.teammatesAllotted ? 'Team composition criteria met.' : 'Your assignment nodes are missing teammates.'}
                    </p>
                  </div>
                </div>
                {!allocationStatus.teammatesAllotted && (
                  <button onClick={handleAddTeammates} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors">
                    Add Members
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button disabled className="px-5 py-2.5 bg-slate-200 text-slate-400 text-sm rounded-xl font-medium flex items-center gap-2 cursor-not-allowed">
                Proceed to Declaration <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          
          /* CONDITION B: Everything is resolved! Render the Digital Declaration Form */
          <div className="animate-fadeIn">
            <div className="mb-6 text-center">
              <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <ShieldCheck className="text-indigo-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Digital Declaration Form</h2>
              <p className="text-slate-500 mt-2 text-sm">
                All team allocations verified. Please review and digitally sign the Candles charter.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed space-y-3 max-h-60 overflow-y-auto">
              <p className="font-bold">Team Charter Agreements & Guidelines:</p>
              <p>1. We confirm that all structural components, assignments, and mapped guides are correct as declared above.</p>
              <p>2. The team agrees to check the monitoring dashboard layout on a weekly cycle and keep status trees fully operational.</p>
              <p>3. Any dynamic changes to data fidelity or team composition will require mentor approval keys.</p>
            </div>

            {/* Digital Signature Action */}
            <div className="mt-6 flex items-center gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <input 
                type="checkbox" 
                id="sign-check"
                checked={isSigned}
                onChange={(e) => setIsSigned(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="sign-check" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                I hereby sign and authenticate this digital declaration on behalf of my team.
              </label>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSubmitDeclaration}
                disabled={!isSigned}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isSigned 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Submit and Finalize
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PendingAllocationHub;