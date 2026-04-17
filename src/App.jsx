import { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import AttentionBlock from './components/AttentionBlock';
import Calendar from './components/Calendar';
import UpcomingView from './components/UpcomingView';
import Assignments from './components/Assignments';
import ResourcesPanel from './components/ResourcesPanel';
import Logistics from './components/Logistics';
import Booking from './components/Booking';
import Employees from './components/Employees';
import Development from './components/Development';
import Reports from './components/Reports';
import Schedule from './components/Schedule';
import NotesSidebar from './components/NotesSidebar';
import TodayItemsSidebar from './components/TodayItemsSidebar';
import LogsViewer from './components/LogsViewer';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [timezone, setTimezone] = useState(localStorage.getItem('timezone') || 'Europe/Moscow');
  const [mainTab, setMainTab] = useState('organizer');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const calendarRef = useRef();

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

  const handleAddToday = () => {
    if (calendarRef.current) {
      calendarRef.current.openCreateModal();
    }
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
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '20px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
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
            <button className={`nav-button ${mainTab === 'organizer' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('organizer')}>Профиль</button>
            <button className={`nav-button ${mainTab === 'logistics' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('logistics')}>Логистика</button>
            <button className={`nav-button ${mainTab === 'booking' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('booking')}>Бронирование</button>
            <button className={`nav-button ${mainTab === 'employees' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('employees')}>Сотрудники</button>
            <button className={`nav-button ${mainTab === 'development' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('development')}>Развитие</button>
            <button className={`nav-button ${mainTab === 'reports' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('reports')}>Отчёты</button>
            <button className={`nav-button ${mainTab === 'schedule' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('schedule')}>График</button>
            {isAdmin && <button className="danger" onClick={() => setShowAdmin(true)}>👑 Админ-панель</button>}
            {isAdmin && <button className={`nav-button ${mainTab === 'logs' ? 'primary' : 'secondary'}`} onClick={() => setMainTab('logs')}>Логи</button>}
            <button className="secondary" onClick={() => setCurrentUser(null)}>Выйти</button>
          </div>
        </header>

        {mainTab === 'organizer' && (
          <div className="profile-container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '20px',
              marginTop: '20px'
            }}>
              <div style={{ justifySelf: 'end' }}>
                <NotesSidebar userId={currentUser.id} />
              </div>
              <div style={{ width: '1200px' }}>
                <AttentionBlock userId={currentUser.id} departmentId={currentUser.departmentId} />
                <Calendar ref={calendarRef} userId={currentUser.id} timezone={timezone} />
                <UpcomingView userId={currentUser.id} />
                <Assignments currentUser={currentUser} />
                <ResourcesPanel />
              </div>
              <div style={{ justifySelf: 'start' }}>
                <TodayItemsSidebar userId={currentUser.id} onAddClick={handleAddToday} />
              </div>
            </div>
          </div>
        )}

        {mainTab === 'logistics' && <Logistics userId={currentUser.id} currentUser={currentUser} />}
        {mainTab === 'booking' && <Booking userId={currentUser.id} currentUser={currentUser} />}
        {mainTab === 'employees' && <Employees currentUserId={currentUser.id} />}
        {mainTab === 'development' && <Development userId={currentUser.id} departmentId={currentUser.departmentId} currentUser={currentUser} />}
        {mainTab === 'reports' && <Reports userId={currentUser.id} currentUserRole={currentUser.role} currentUserDepartmentId={currentUser.departmentId} currentUser={currentUser} />}
        {mainTab === 'schedule' && (
          <div className="schedule-container">
            <Schedule currentUser={currentUser} />
          </div>
        )}
        {mainTab === 'logs' && isAdmin && <LogsViewer />}
        {showAdmin && <AdminPanel currentUser={currentUser} onClose={() => setShowAdmin(false)} />}
      </div>
    </>
  );
}

export default App;