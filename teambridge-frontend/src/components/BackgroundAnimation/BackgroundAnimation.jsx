import "./BackgroundAnimation.css";

function BackgroundAnimation() {
  return (
    <div className="apple-parallax-bg-container">
      {/*  Dribbble-Inspired Light Hybrid Iridescent Orbs */}
      <div className="dribbble-gradient-circle primary-blue-orb"></div>
      <div className="dribbble-gradient-circle indigo-royal-orb"></div>
      <div className="dribbble-gradient-circle sky-ambient-orb"></div>
      
      {/* Soft overlay filter grid to ensure crisp typography contrast ratios */}
      <div className="apple-glass-matte-overlay"></div>
    </div>
  );
}

export default BackgroundAnimation;