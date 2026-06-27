// 📄 Location: frontend/src/components/Logo.jsx
import React from 'react';

const Logo = ({ size = 36, showText = true }) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        userSelect: 'none',
        cursor: 'pointer'
      }}
      onClick={() => window.location.href = '/dashboard'}
    >
      {/* Sharp Vector Logo Badge matching the corporate blue interface palette */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ 
          borderRadius: '8px', 
          boxShadow: '0 4px 10px rgba(37, 99, 235, 0.12)',
          transition: 'transform 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <rect width="40" height="40" fill="#2563EB"/>
        <text 
          x="50%" 
          y="55%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          fill="#FFFFFF" 
          style={{ 
            fontFamily: "Times New Roman, Georgia, serif", 
            fontSize: '21px', 
            fontWeight: '800',
            letterSpacing: '-0.5px'
          }}
        >
          C
        </text>
      </svg>

      {/* Brand Moniker Typography */}
      {showText && (
        <span style={{ 
          fontSize: '19px', 
          fontWeight: '700', 
          color: '#0F172A', 
          letterSpacing: '-0.5px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        }}>
          Candles
        </span>
      )}
    </div>
  );
};

export default Logo;