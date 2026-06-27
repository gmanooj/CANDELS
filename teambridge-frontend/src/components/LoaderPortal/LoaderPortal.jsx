import { useState, useEffect } from "react";
import "./LoaderPortal.css";

function LoaderPortal({ statusState, customText = "" }) {
  const [animationPhase, setAnimationPhase] = useState("fill"); // 'fill' | 'orbit' | 'vanish'
  const [messageIndex, setMessageIndex] = useState(0);

  const slidingMessages = [
    "You will be logged in within few minutes...",
    "Connecting to Candles platform...",
    "Securing collaborative tunnels...",
    "Validating secure credential tokens...",
    "Establishing real-time file watchers..."
  ];

  useEffect(() => {
    if (statusState === "loading") {
      setAnimationPhase("fill");
      // Phase transitions:
      // Fill takes 2s
      const timer1 = setTimeout(() => {
        setAnimationPhase("orbit");
      }, 2000);

      // Orbit/Vanish starts sweeping at 3.5s
      const timer2 = setTimeout(() => {
        setAnimationPhase("vanish");
      }, 3500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [statusState]);

  useEffect(() => {
    let interval;
    if (statusState === "loading") {
      interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % slidingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [statusState, slidingMessages.length]);

  if (statusState === "idle") return null;

  return (
    <div className="candles-portal-overlay">
      {statusState === "loading" && (
        <div className="candles-loader-card">
          <div className="candles-logo-animation-container">
            {/* The sliding border glow */}
            <div className="candles-logo-border-glow"></div>
            
            {/* The grayscale silhouette of the logo */}
            <img src="/logo.png" alt="Silhouette" className="candles-logo-bg-silhouette" />
            
            {/* The filling colored logo */}
            <img 
              src="/logo.png" 
              alt="Colored Logo" 
              className={`candles-logo-color-fill ${animationPhase === "orbit" || animationPhase === "vanish" ? "is-filled" : ""} ${animationPhase === "vanish" ? "is-vanishing" : ""}`} 
            />
            
            {/* The orbiting star/circle */}
            {(animationPhase === "orbit" || animationPhase === "vanish") && (
              <div className="candles-orbiting-track">
                <div className="candles-orbiting-star">✦</div>
              </div>
            )}
          </div>
          
          <div className="candles-loader-sliding-messages">
            <div className="candles-messages-track" style={{ transform: `translateY(-${messageIndex * 30}px)` }}>
              {slidingMessages.map((msg, i) => (
                <div key={i} className="candles-sliding-message-item">
                  {customText && i === 0 ? customText : msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {statusState === "success" && (
        <div className="candles-success-card success-pop-card">
          <div className="candles-success-checkmark-circle">✓</div>
          <h2 className="candles-success-title">Verification Successful</h2>
          <p className="candles-success-subtitle">Welcome back to your Candles workspace.</p>
        </div>
      )}
    </div>
  );
}

export default LoaderPortal;