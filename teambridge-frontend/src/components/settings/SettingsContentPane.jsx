import React, { useState } from 'react';
import { Key, Copy, Check, Smartphone, Laptop, Trash2, X, Plus } from 'lucide-react';

export default function SettingsContentPane({
  activeTab,
  settings,
  setSettings,
  onSave,
  userEmail
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyDeviceName, setNewKeyDeviceName] = useState('');
  
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  
  const [newExtension, setNewExtension] = useState('');

  const fetchSessions = async () => {
    const token = sessionStorage.getItem('auth_token');
    if (!token) return;
    setLoadingSessions(true);
    try {
      const response = await fetch(__BACKEND_URL__ + '/api/v1/user/settings/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchApiKeys = async () => {
    if (!userEmail) return;
    setLoadingKeys(true);
    try {
      const response = await fetch(`${__BACKEND_URL__}/api/cli/keys/list?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setApiKeys(data.keys || []);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
    if (activeTab === 'cli') {
      fetchApiKeys();
    }
  }, [activeTab, userEmail]);

  const handleTextChange = (field, val) => {
    setSettings((prev) => ({ ...prev, [field]: val }));
  };

  const handleToggleChange = (field, val) => {
    setSettings((prev) => ({ ...prev, [field]: val }));
  };

  const handleSelectChange = (field, val) => {
    setSettings((prev) => ({ ...prev, [field]: val }));
  };

  // Extension chips helpers
  const getIgnoredExtensionsList = () => {
    if (!settings.ignored_extensions) return [];
    return settings.ignored_extensions
      .split(',')
      .map(ext => ext.trim())
      .filter(ext => ext.length > 0);
  };

  const handleAddExtension = () => {
    let cleanExt = newExtension.trim();
    if (!cleanExt) return;
    if (!cleanExt.startsWith('.')) {
      cleanExt = '.' + cleanExt;
    }
    const currentList = getIgnoredExtensionsList();
    if (currentList.includes(cleanExt)) {
      setNewExtension('');
      return;
    }
    const newList = [...currentList, cleanExt].join(',');
    const updated = { ...settings, ignored_extensions: newList };
    setSettings(updated);
    onSave(['ignored_extensions'], updated);
    setNewExtension('');
  };

  const handleRemoveExtension = (extToRemove) => {
    const currentList = getIgnoredExtensionsList();
    const newList = currentList.filter(ext => ext !== extToRemove).join(',');
    const updated = { ...settings, ignored_extensions: newList };
    setSettings(updated);
    onSave(['ignored_extensions'], updated);
  };

  // Generate API key via backend
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('auth_token');
    if (!token) return;

    const deviceName = newKeyDeviceName.trim() || 'Developer Machine';
    try {
      const response = await fetch(__BACKEND_URL__ + '/api/v1/cli/key/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ device_name: deviceName })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setNewKey(data.key);
        setShowKeyModal(true);
        setNewKeyDeviceName('');
        fetchApiKeys();
      } else {
        alert(data.message || 'Failed to generate API Key');
      }
    } catch (err) {
      console.error('Failed to generate key:', err);
      alert('Network error generating API Key');
    }
  };

  // Revoke API key via backend
  const handleRevokeApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this CLI access key?')) return;
    try {
      const response = await fetch(__BACKEND_URL__ + '/api/cli/keys/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key_id: keyId,
          email: userEmail
        })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        fetchApiKeys();
      } else {
        alert(data.message || 'Failed to revoke API key.');
      }
    } catch (err) {
      console.error('Failed to revoke API key:', err);
      alert('Network error revoking API key.');
    }
  };

  // Revoke login session via backend
  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to log out of this remote session?')) return;
    const token = sessionStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch(`${__BACKEND_URL__}/api/v1/user/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        fetchSessions();
      } else {
        alert(data.message || 'Failed to revoke session.');
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
      alert('Network error revoking session.');
    }
  };

  // Copy API key utility
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const iOSSwitch = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`ios-switch-btn ${checked ? 'checked' : ''}`}
    >
      <span className="ios-switch-thumb" />
    </button>
  );

  return (
    <div className="settings-content-wrapper">
      {/* 👤 MY ACCOUNT */}
      {activeTab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="settings-section-header">
            <h2>My Account</h2>
            <p>Configure your personal profile details and contact options.</p>
          </div>

          <div className="settings-card">
            <div className="settings-card-body">
              <div className="settings-form-row-grid">
                <div className="settings-form-row">
                  <label className="settings-label-title">First Name</label>
                  <input
                    type="text"
                    value={settings.first_name || ''}
                    onChange={(e) => handleTextChange('first_name', e.target.value)}
                    className="settings-input"
                  />
                </div>
                <div className="settings-form-row">
                  <label className="settings-label-title">Last Name</label>
                  <input
                    type="text"
                    value={settings.last_name || ''}
                    onChange={(e) => handleTextChange('last_name', e.target.value)}
                    className="settings-input"
                  />
                </div>
              </div>

              <div className="settings-form-row">
                <label className="settings-label-title">Phone Number</label>
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => handleTextChange('phone', e.target.value)}
                  className="settings-input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="settings-form-row">
                <label className="settings-label-title">Bio / Description</label>
                <textarea
                  value={settings.bio || ''}
                  onChange={(e) => handleTextChange('bio', e.target.value)}
                  rows={4}
                  className="settings-textarea"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            <div className="settings-card-meta-list">
              <div className="settings-meta-item">
                <span className="settings-meta-item-label">Email Address</span>
                <span className="settings-meta-item-value mono">{settings.email}</span>
              </div>
              <div className="settings-meta-item">
                <span className="settings-meta-item-label">Account Role</span>
                <span className="settings-meta-item-value badge">{settings.role}</span>
              </div>
              <div className="settings-meta-item">
                <span className="settings-meta-item-label">Identity Code</span>
                <span className="settings-meta-item-value mono">{settings.user_code}</span>
              </div>
            </div>

            <div className="settings-card-footer">
              <button
                onClick={() => onSave(['first_name', 'last_name', 'phone', 'bio'])}
                className="settings-primary-btn"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💻 CLI & WORKSPACE */}
      {activeTab === 'cli' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="settings-section-header">
            <h2>CLI & Workspace Settings</h2>
            <p>Configure telemetry behavior and manage CLI integration credentials.</p>
          </div>

          <div className="settings-card">
            <div className="settings-card-body">
              <div className="settings-form-row">
                <label className="settings-label-title" style={{ marginBottom: '4px' }}>Local Telemetry Sync Mode</label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>Controls how frequently local terminal telemetry logs sync to the cloud database.</p>
                
                <div className="settings-segmented-picker">
                  {['Real-time', 'Daily', 'Weekly', 'Manual'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        const updated = { ...settings, telemetry_sync_mode: mode };
                        handleSelectChange('telemetry_sync_mode', mode);
                        onSave(['telemetry_sync_mode'], updated);
                      }}
                      className={`settings-segmented-btn ${
                        settings.telemetry_sync_mode === mode ? 'active' : ''
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-body">
              <div className="settings-form-row">
                <label className="settings-label-title" style={{ marginBottom: '4px' }}>Telemetry Ignored File Extensions</label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>Terminal heartbeats will skip indexing code adjustments inside files matching these extensions.</p>
                
                <div className="settings-chips-container">
                  {getIgnoredExtensionsList().map((ext) => (
                    <span key={ext} className="settings-chip">
                      {ext}
                      <button
                        onClick={() => handleRemoveExtension(ext)}
                        className="settings-chip-close"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {getIgnoredExtensionsList().length === 0 && (
                    <span className="settings-chips-empty">No extensions excluded. Telemetry logs index all files.</span>
                  )}
                </div>

                <div className="settings-chip-input-group" style={{ marginTop: '12px' }}>
                  <input
                    type="text"
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExtension()}
                    placeholder="e.g. .log, .env"
                    className="settings-input"
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  />
                  <button
                    onClick={handleAddExtension}
                    className="settings-chip-add-btn"
                  >
                    <Plus className="w-3.5 h-3.5" /> Exclude
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Terminal CLI API Keys</h3>
              <p>Use these credentials in your local terminal context. Do not share your live keys.</p>
            </div>

            <div className="settings-list-container">
              {loadingKeys ? (
                <div className="settings-list-loading">Loading CLI keys...</div>
              ) : apiKeys.length === 0 ? (
                <div className="settings-list-empty">No active keys generated. Set up a key below to connect your local terminal.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {apiKeys.map((k) => (
                    <div key={k.id} className="settings-list-item">
                      <div className="settings-list-item-left">
                        <div className="settings-list-item-icon">
                          <Key className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="settings-list-item-name" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{k.preview}</div>
                          <div className="settings-list-item-desc">
                            {k.device_name} • Created: {k.created_at || 'Recently'} • Last used: {k.last_used_at}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeApiKey(k.id)}
                        className="settings-list-item-trash-btn"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleGenerateKey} className="settings-list-generator-form">
              <input
                type="text"
                required
                value={newKeyDeviceName}
                onChange={(e) => setNewKeyDeviceName(e.target.value)}
                placeholder="e.g. MacBook Pro, VS Code Sandbox"
                className="settings-input"
                style={{ fontSize: '12px', padding: '8px 12px' }}
              />
              <button
                type="submit"
                className="settings-primary-btn"
                style={{ padding: '8px 14px' }}
              >
                Generate API Key
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="settings-section-header">
            <h2>Notification Settings</h2>
            <p>Configure when and where you receive notifications regarding project milestones and reviews.</p>
          </div>

          <div className="settings-card">
            <div className="settings-card-body">
              <div className="settings-switch-row">
                <div className="settings-switch-info">
                  <h3>Notify on Faculty Guide Review</h3>
                  <p>Receive alert markers whenever a Faculty guide reviews or signs your Workspace charter.</p>
                </div>
                <iOSSwitch
                  checked={!!settings.notify_on_faculty_review}
                  onChange={(val) => {
                    const updated = { ...settings, notify_on_faculty_review: val };
                    handleToggleChange('notify_on_faculty_review', val);
                    onSave(['notify_on_faculty_review'], updated);
                  }}
                />
              </div>

              <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.5)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="settings-label-title">Default Notification Channel</label>
                <select
                  value={settings.notification_routing || 'In-app Dashboard'}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = { ...settings, notification_routing: val };
                    handleSelectChange('notification_routing', val);
                    onSave(['notification_routing'], updated);
                  }}
                  className="settings-select"
                  style={{ maxWidth: '400px' }}
                >
                  <option value="In-app Dashboard">In-app Dashboard</option>
                  <option value="Email Alert">Email Alert</option>
                  <option value="In-app and Email">In-app and Email</option>
                  <option value="Push Notification">Push Notification</option>
                </select>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>Select the main delivery mechanism for system alerts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 SECURITY & PRIVACY */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="settings-section-header">
            <h2>Security & Privacy</h2>
            <p>Audit active sessions on other devices and manage active security tokens.</p>
          </div>

          <div className="settings-card">
            <div className="settings-card-body">
              <div className="settings-form-row">
                <label className="settings-label-title" style={{ marginBottom: '4px' }}>Active Bearer JWT Context Token</label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>Use this authenticated JWT context payload token to make direct platform REST inquiries.</p>
                
                <div className="settings-copy-group">
                  <input
                    type="password"
                    readOnly
                    value={sessionStorage.getItem('auth_token') || 'No active session token.'}
                    className="settings-copy-input"
                  />
                  <button
                    onClick={() => copyToClipboard(sessionStorage.getItem('auth_token') || 'No active session token.', 'token')}
                    className="settings-copy-btn"
                  >
                    {copiedToken ? <Check className="w-4.5 h-4.5 text-emerald-500" /> : <Copy className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <h3>Logged-in Active Sessions</h3>
              <p>Authorized devices currently connected to your Candels profile context.</p>
            </div>

            <div className="settings-list-container">
              {loadingSessions ? (
                <div className="settings-list-loading">Loading active login sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="settings-list-empty">No session markers found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sessions.map((s) => (
                    <div key={s.id} className="settings-list-item">
                      <div className="settings-list-item-left">
                        <div className="settings-list-item-icon">
                          {s.device_name.toLowerCase().includes('mac') || s.device_name.toLowerCase().includes('windows') || s.device_name.toLowerCase().includes('linux') ? (
                            <Laptop className="w-4.5 h-4.5" />
                          ) : (
                            <Smartphone className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div>
                          <div className="settings-list-item-name">
                            {s.device_name}
                            {s.is_current && (
                              <span className="settings-list-item-tag">
                                Current Session
                              </span>
                            )}
                          </div>
                          <div className="settings-list-item-desc">
                            IP: {s.ip_address} • Last active: {s.last_active ? new Date(s.last_active).toLocaleString() : 'Recently'}
                          </div>
                        </div>
                      </div>

                      {!s.is_current && (
                        <button
                          onClick={() => handleRevokeSession(s.id)}
                          className="settings-list-item-revoke-btn"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎨 APPEARANCE & EDITOR */}
      {activeTab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="settings-section-header">
            <h2>Appearance & Editor Preferences</h2>
            <p>Configure layout themes and code workspace customization options.</p>
          </div>

          <div className="settings-card">
            <div className="settings-card-body">
              <div className="settings-form-row">
                <label className="settings-label-title" style={{ marginBottom: '12px' }}>System Theme Layout</label>
                
                <div className="settings-theme-grid">
                  {/* Light Theme box */}
                  <button
                    onClick={() => {
                      const updated = { ...settings, theme: 'light' };
                      handleSelectChange('theme', 'light');
                      onSave(['theme'], updated);
                    }}
                    className={`settings-theme-option-box ${
                      settings.theme === 'light' ? 'active' : ''
                    }`}
                  >
                    <div className="settings-theme-visual-preview light-preview">
                      <div className="settings-preview-bar" />
                      <div className="settings-preview-body">
                        <div className="settings-preview-sidebar" />
                        <div className="settings-preview-lines">
                          <div className="settings-preview-line" />
                          <div className="settings-preview-line" />
                          <div className="settings-preview-line short" />
                        </div>
                      </div>
                    </div>
                    <span className="settings-theme-label">Light Mode</span>
                  </button>

                  {/* Dark Theme box */}
                  <button
                    onClick={() => {
                      const updated = { ...settings, theme: 'dark' };
                      handleSelectChange('theme', 'dark');
                      onSave(['theme'], updated);
                    }}
                    className={`settings-theme-option-box ${
                      settings.theme === 'dark' ? 'active' : ''
                    }`}
                  >
                    <div className="settings-theme-visual-preview dark-preview">
                      <div className="settings-preview-bar" />
                      <div className="settings-preview-body">
                        <div className="settings-preview-sidebar" />
                        <div className="settings-preview-lines">
                          <div className="settings-preview-line" />
                          <div className="settings-preview-line" />
                          <div className="settings-preview-line short" />
                        </div>
                      </div>
                    </div>
                    <span className="settings-theme-label">Dark Mode</span>
                  </button>

                  {/* Frosted Glass Theme box */}
                  <button
                    onClick={() => {
                      const updated = { ...settings, theme: 'frosted' };
                      handleSelectChange('theme', 'frosted');
                      onSave(['theme'], updated);
                    }}
                    className={`settings-theme-option-box ${
                      settings.theme === 'frosted' ? 'active' : ''
                    }`}
                  >
                    <div className="settings-theme-visual-preview frosted-preview">
                      <div className="settings-preview-bar" />
                      <div className="settings-preview-body">
                        <div className="settings-preview-sidebar" />
                        <div className="settings-preview-lines">
                          <div className="settings-preview-line" />
                          <div className="settings-preview-line" />
                          <div className="settings-preview-line short" />
                        </div>
                      </div>
                    </div>
                    <span className="settings-theme-label">Frosted Mode</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <h3>IDE Code Editor Fonts</h3>
              <p>Customize font family and font sizing inside code editors.</p>
            </div>

            <div className="settings-card-body">
              <div className="settings-form-row-grid">
                <div className="settings-form-row">
                  <label className="settings-label-title">Font Family</label>
                  <select
                    value={settings.ide_font_family || 'SF Mono'}
                    onChange={(e) => handleSelectChange('ide_font_family', e.target.value)}
                    className="settings-select"
                    style={{ fontFamily: 'monospace' }}
                  >
                    <option value="SF Mono">SF Mono</option>
                    <option value="Fira Code">Fira Code</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Consolas">Consolas</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                <div className="settings-form-row">
                  <label className="settings-label-title">Font Size (px)</label>
                  <input
                    type="number"
                    min={9}
                    max={24}
                    value={settings.ide_font_size || 13}
                    onChange={(e) => handleTextChange('ide_font_size', e.target.value)}
                    className="settings-input"
                  />
                </div>
              </div>

              <div className="settings-form-row" style={{ marginTop: '10px' }}>
                <label className="settings-label-title">Font Preview</label>
                <div
                  style={{
                    fontFamily: settings.ide_font_family || 'SF Mono',
                    fontSize: `${settings.ide_font_size || 13}px`
                  }}
                  className="settings-font-terminal-preview"
                >
                  <span className="settings-font-preview-comment">// Candels IDE Font Preview</span>
                  <br />
                  <span className="settings-font-preview-keyword">const</span> <span className="settings-font-preview-variable">config</span> = &#123;
                  <br />
                  &nbsp;&nbsp;theme: <span className="settings-font-preview-string">"{settings.theme}"</span>,
                  <br />
                  &nbsp;&nbsp;fontSize: <span className="settings-font-preview-number">{settings.ide_font_size}</span>,
                  <br />
                  &nbsp;&nbsp;fontFamily: <span className="settings-font-preview-string">"{settings.ide_font_family}"</span>
                  <br />
                  &#125;;
                </div>
              </div>
            </div>

            <div className="settings-card-footer">
              <button
                onClick={() => onSave(['ide_font_family', 'ide_font_size'])}
                className="settings-primary-btn"
              >
                Save Font Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API KEY DETAILS MODAL */}
      {showKeyModal && newKey && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal-card">
            <div className="settings-modal-body">
              <h3 className="settings-modal-title">
                <Key className="w-5 h-5" style={{ color: '#ff9500', marginRight: '4px' }} /> CLI API Key Generated
              </h3>
              <p className="settings-modal-desc">
                Copy this key now. It will not be shown again for security reasons.
              </p>

              <div className="settings-copy-group" style={{ marginTop: '16px' }}>
                <input
                  type="text"
                  readOnly
                  value={newKey}
                  className="settings-copy-input"
                />
                <button
                  onClick={() => copyToClipboard(newKey, 'key')}
                  className="settings-copy-btn"
                >
                  {copiedKey === newKey ? <Check className="w-4.5 h-4.5 text-emerald-500" /> : <Copy className="w-4.5 h-4.5" />}
                </button>
              </div>

              <div className="settings-modal-warning-box">
                <span className="settings-modal-warning-icon">⚠️</span>
                <div className="settings-modal-warning-text">
                  Once you click close, this token is permanently masked in our database. Store it in a secret vault (e.g. environment variable or password manager).
                </div>
              </div>
            </div>

            <div className="settings-card-footer">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setNewKey(null);
                }}
                className="settings-primary-btn"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
