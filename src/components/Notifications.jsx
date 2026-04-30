import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, requestNotificationPermission, sendBrowserNotification } from '../services/dataService';

export default function Notifications({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('notifications_enabled') === 'true');

  const loadNotifications = () => {
    setNotifications(getNotifications());
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('notifications-updated', handleUpdate);
    return () => window.removeEventListener('notifications-updated', handleUpdate);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
        sendBrowserNotification('Уведомления включены', 'Теперь вы будете получать уведомления о важных событиях');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="secondary"
        onClick={() => setShowPanel(!showPanel)}
        style={{ position: 'relative', padding: '8px 12px' }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: 'red',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '0',
          width: '350px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          padding: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid var(--border-light)' }}>
            <strong>Уведомления</strong>
            <div>
              <button className="secondary" onClick={toggleNotifications} style={{ fontSize: '12px', padding: '4px 8px', marginRight: '5px' }}>
                {notificationsEnabled ? '🔔 Вкл' : '🔕 Выкл'}
              </button>
              {unreadCount > 0 && (
                <button className="secondary" onClick={handleMarkAllRead} style={{ fontSize: '12px', padding: '4px 8px' }}>
                  Прочитать все
                </button>
              )}
            </div>
          </div>
          {notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              Нет уведомлений
            </div>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              style={{
                padding: '8px',
                marginBottom: '8px',
                borderRadius: '6px',
                background: n.read ? 'transparent' : 'rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${n.type === 'error' ? '#dc3545' : n.type === 'warning' ? '#ffc107' : '#28a745'}`,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{getTypeIcon(n.type)}</span>
                <strong>{n.title}</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                {n.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}