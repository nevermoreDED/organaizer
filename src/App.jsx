import { useState, useEffect } from 'react';
import Login from './components/Login';
import AttentionBlock from './components/AttentionBlock';
import Calendar from './components/Calendar';
import TaskList from './components/TaskList';
import UpcomingView from './components/UpcomingView';
import Assignments from './components/Assignments';
import ResourcesPanel from './components/ResourcesPanel';
import Logistics from './components/Logistics';
import Booking from './components/Booking';
import Employees from './components/Employees';
import Development from './components/Development';
import Reports from './components/Reports';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [timezone, setTimezone] = useState(localStorage.getItem('timezone') || 'Europe/Moscow');
  const [mainTab, setMainTab] = useState('organizer');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('timezone', timezone);
  }, [timezone]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.isIT === true;

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '40px',
          padding: '8px 16px',
          cursor: 'pointer',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'all 0.2s'
        }}
      >
        {theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема'}
      </button>

      <div className="app-container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '40px' }} />
            <h1>Органайзер CRM</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
              <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
              <option value="Europe/London">Лондон (UTC+0)</option>
              <option value="America/New_York">Нью-Йорк (UTC-4)</option>
            </select>
            <button className={`nav-button ${mainTab === 'organizer' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('organizer')}>Органайзер</button>
            <button className={`nav-button ${mainTab === 'logistics' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('logistics')}>Логистика</button>
            <button className={`nav-button ${mainTab === 'booking' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('booking')}>Бронирование</button>
            <button className={`nav-button ${mainTab === 'employees' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('employees')}>Сотрудники</button>
            <button className={`nav-button ${mainTab === 'development' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('development')}>Развитие</button>
            <button className={`nav-button ${mainTab === 'reports' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('reports')}>Отчёты</button>
            {isAdmin && <button className="danger" onClick={() => setShowAdmin(true)}>👑 Админ-панель</button>}
            <button className="secondary" onClick={() => setCurrentUser(null)}>Выйти</button>
          </div>
        </header>

        {mainTab === 'organizer' && (
          <>
            <AttentionBlock userId={currentUser.id} departmentId={currentUser.departmentId} />
            <Calendar userId={currentUser.id} timezone={timezone} />
            <TaskList userId={currentUser.id} filter="today" />
            <UpcomingView userId={currentUser.id} />
            <Assignments currentUser={currentUser} />
            <ResourcesPanel />
          </>
        )}

        {mainTab === 'logistics' && <Logistics userId={currentUser.id} />}
        {mainTab === 'booking' && <Booking userId={currentUser.id} />}
        {mainTab === 'employees' && <Employees currentUserId={currentUser.id} />}
        {mainTab === 'development' && <Development userId={currentUser.id} departmentId={currentUser.departmentId} />}
        {mainTab === 'reports' && <Reports userId={currentUser.id} isAdmin={isAdmin} />}
        {showAdmin && <AdminPanel currentUser={currentUser} onClose={() => setShowAdmin(false)} />}
      </div>
    </>
  );
}

export default App;