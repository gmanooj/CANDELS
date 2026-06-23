import { useState, useEffect } from "react";
import "./IntroSplash.css";

export default function IntroSplash({ onComplete }) {
  const [phase, setPhase] = useState("animating"); // 'animating' | 'shrinking' | 'fading' | 'hidden'

  useEffect(() => {
    // Check if the splash was already shown in the current session
    if (sessionStorage.getItem("intro_shown") === "true") {
      setPhase("hidden");
      onComplete();
      return;
    }

    // 1. Let the shine animation play centered for 2.2 seconds
    const shrinkTimer = setTimeout(() => {
      setPhase("shrinking");
    }, 2200);

    // 2. Start fading out the entire overlay 0.9s after shrinking starts
    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, 3100);

    // 3. Mark complete and hide component 0.8s after fade starts
    const completeTimer = setTimeout(() => {
      sessionStorage.setItem("intro_shown", "true");
      setPhase("hidden");
      onComplete();
    }, 3900);

    return () => {
      clearTimeout(shrinkTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (phase === "hidden") return null;

  return (
    <div className={`splash-overlay ${phase === "shrinking" || phase === "fading" ? "shrinking" : ""} ${phase === "fading" ? "fade-out" : ""}`}>
      <div className={`splash-content ${phase === "animating" ? "centered" : "shrunk"}`}>
        <img src="/logo.png" alt="Candels Logo" className="splash-logo" />
        <span className="splash-text">CANDELS</span>
      </div>
    </div>
  );
}
