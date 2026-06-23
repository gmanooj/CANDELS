import React, { useEffect, useState } from 'react';

const NotificationBell = ({ userCode }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userCode) return;

    const fetchNotifications = async () => {
      try {
        // 🔒 FIX: Added absolute Port 5000 path context matching Dashboard queries
        const response = await fetch(`${__BACKEND_URL__}/api/notifications/fetch?user_code=${userCode}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error("Error checking notification bell logs:", err);
      }
    };

    fetchNotifications();

    // Intelligent background polling sweep
    const intervalId = setInterval(fetchNotifications, 30000); 

    return () => clearInterval(intervalId);
  }, [userCode]);

  return (
    <div className="relative" style={{ display: "inline-block", cursor: "pointer" }}>
      <span style={{ fontSize: "20px" }}>🔔</span>
      {notifications.length > 0 && (
        <span 
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            backgroundColor: "#ef4444",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: "10px",
            fontWeight: "700",
            border: "2px solid #ffffff",
          }}
        >
          {notifications.length}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;