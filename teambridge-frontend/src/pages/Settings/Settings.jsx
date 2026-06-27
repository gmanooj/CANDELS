import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsSidebar from '../../components/settings/SettingsSidebar';
import SettingsContentPane from '../../components/settings/SettingsContentPane';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('account');
  
  // Manage settings in state
  const [settings, setSettings] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    role: 'student',
    user_code: 'TB-STU-0000',
    telemetry_sync_mode: 'Real-time',
    ignored_extensions: '',
    notify_on_faculty_review: true,
    notification_routing: 'In-app Dashboard',
    theme: 'light',
    ide_font_family: 'SF Mono',
    ide_font_size: 13
  });

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // Load preferences from the backend API on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const token = sessionStorage.getItem('auth_token');
      if (!token) {
        setSaveStatus({ type: 'error', message: 'No authentication token found. Redirecting...' });
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      try {
        const response = await fetch(__BACKEND_URL__ + '/api/v1/user/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
          const userSettings = data.settings;
          setSettings(userSettings);
          
          setUser({
            first_name: userSettings.first_name || '',
            last_name: userSettings.last_name || '',
            email: userSettings.email || '',
            role: userSettings.role || 'student',
            user_code: userSettings.user_code || 'TB-STU-0000'
          });
        } else {
          setSaveStatus({ type: 'error', message: data.message || 'Failed to fetch system preferences.' });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setSaveStatus({ type: 'error', message: 'Network error fetching system preferences.' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [navigate]);

  // Sync theme changes with document.body and localStorage
  useEffect(() => {
    document.body.classList.remove('dark', 'frosted');
    if (settings.theme === 'dark') {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (settings.theme === 'frosted') {
      document.body.classList.add('frosted');
      localStorage.setItem('theme', 'frosted');
    } else {
      localStorage.setItem('theme', 'light');
    }
  }, [settings.theme]);

  // Handle saving specific settings in database
  const handleSaveSettings = async (fieldsToSave, customSettings = null) => {
    setSaveStatus(null);
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      setSaveStatus({ type: 'error', message: 'Authorization token not found.' });
      return;
    }

    const activeSettings = customSettings || settings;
    const payload = {};
    fieldsToSave.forEach(field => {
      payload[field] = activeSettings[field];
    });

    try {
      const response = await fetch(__BACKEND_URL__ + '/api/v1/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        const userSettings = data.settings;
        setSettings(userSettings);

        // Update sessionStorage if profile info changed
        if (fieldsToSave.includes('first_name') || fieldsToSave.includes('last_name')) {
          const updatedUser = {
            ...user,
            first_name: userSettings.first_name,
            last_name: userSettings.last_name
          };
          setUser(updatedUser);
          sessionStorage.setItem('user_session', JSON.stringify(updatedUser));
        }

        // Update editor configs in localStorage for global IDE pickup
        if (fieldsToSave.includes('ide_font_family')) {
          localStorage.setItem('ide_font_family', userSettings.ide_font_family);
        }
        if (fieldsToSave.includes('ide_font_size')) {
          localStorage.setItem('ide_font_size', userSettings.ide_font_size.toString());
        }
        if (fieldsToSave.includes('theme')) {
          localStorage.setItem('theme', userSettings.theme);
        }

        setSaveStatus({
          type: 'success',
          message: 'System preferences successfully committed to datastore.'
        });
      } else {
        setSaveStatus({
          type: 'error',
          message: data.message || 'Failed to update preferences.'
        });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveStatus({
        type: 'error',
        message: 'Network error saving system preferences.'
      });
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (loading) {
    return (
      <div className="data-fetching-overlay">
        <div className="fetching-loader-box">
          <div className="fetching-spinner"></div>
          <div className="fetching-message-container">
            <div className="fetching-message-track">
              <div className="fetching-message-item">Synchronizing Candles preferences...</div>
              <div className="fetching-message-item">Connecting to user datastore...</div>
              <div className="fetching-message-item">Assembling settings portal...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`settings-window-container ${settings.theme === 'dark' ? 'dark' : ''}`}>
      {/*  window top status bar */}
      <div className="settings-window-header">
        <div className="settings-mac-dots">
          <button
            onClick={() => navigate('/dashboard')}
            className="settings-dot close"
            title="Go back to Dashboard"
          >
            <span>×</span>
          </button>
          <div className="settings-dot minimize" />
          <div className="settings-dot maximize" />
          
          <div className="settings-window-divider" />
          <span className="settings-window-title">
            System Settings — Candels
          </span>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="settings-back-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" style={{ marginRight: '4px' }} /> Back to Dashboard
        </button>
      </div>

      {/* Main Settings Stage */}
      <div className="settings-main-stage">
        {/* Toast Notification Alert Banner */}
        {saveStatus && (
          <div className={`settings-toast-banner ${saveStatus.type === 'success' ? 'success' : 'error'}`}>
            {saveStatus.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5" /> : <AlertCircle className="w-4.5 h-4.5" />}
            <span className="settings-toast-message">{saveStatus.message}</span>
          </div>
        )}

        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <SettingsContentPane
          activeTab={activeTab}
          settings={settings}
          setSettings={setSettings}
          onSave={handleSaveSettings}
          userEmail={user?.email}
        />
      </div>
    </div>
  );
}
