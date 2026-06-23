import React from 'react';
import { User, Terminal, Bell, Lock, Paintbrush } from 'lucide-react';

const categories = [
  { id: 'account', label: 'My Account', icon: User, color: 'blue' },
  { id: 'cli', label: 'CLI & Workspace', icon: Terminal, color: 'gray' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'green' },
  { id: 'security', label: 'Security & Privacy', icon: Lock, color: 'red' },
  { id: 'appearance', label: 'Appearance', icon: Paintbrush, color: 'purple' }
];

export default function SettingsSidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="settings-sidebar-aside">
      <div className="settings-sidebar-header">
        <h1>System Settings</h1>
        <p>Candels macOS Sequoia style</p>
      </div>

      <nav className="settings-sidebar-nav">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeTab === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={`settings-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className={`settings-nav-icon-block ${category.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="settings-nav-label">
                {category.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
