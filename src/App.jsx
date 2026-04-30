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
import { updateAssignment } from './services/dataService';
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [timezone, setTimezone] = useState(localStorage.getItem('timezone') || 'Europe/Moscow');
  const [mainTab, setMainTab] = useState('organizer');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const calendarRef = useRef();
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentEditForm, setAssignmentEditForm] = useState({
    text: '',
    deadline: '',
    status: 'new',
    comment: ''
  });

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

  const handleOpenAssignmentEdit = (assignment) => {
    setAssignmentEditForm({
      text: assignment.text,
      deadline: assignment.deadline || '',
      status: assignment.status,
      comment: assignment.comment || ''
    });
    setEditingAssignment(assignment);
  };

  const handleSaveAssignmentEdit = async () => {
    if (!editingAssignment) return;
    try {
      await updateAssignment(editingAssignment.id, assignmentEditForm);
      setEditingAssignment(null);
      window.dispatchEvent(new Event('assignments-updated'));
    } catch (err) {
      console.error('Ошибка сохранения поручения:', err);
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
                <Assignments currentUser={currentUser} onEdit={handleOpenAssignmentEdit} />
                <ResourcesPanel />
              </div>
              <div style={{ justifySelf: 'start' }}>
                <TodayItemsSidebar userId={currentUser.id} departmentId={currentUser.departmentId} onAddClick={handleAddToday} />
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

      {/* Assignment Edit Modal - Global Overlay */}
      {editingAssignment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            width: '520px',
            maxWidth: '95vw',
            color: 'var(--text-primary)',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                Редактирование поручения
              </h3>
              <button
                onClick={() => setEditingAssignment(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.8rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>
                Текст поручения:
              </label>
              <textarea
                value={assignmentEditForm.text}
                onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, text: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontSize: '0.95rem',
                  lineHeight: 1.5
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>
                  Срок выполнения:
                </label>
                <input
                  type="date"
                  value={assignmentEditForm.deadline}
                  onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, deadline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>
                  Статус:
                </label>
                <select
                  value={assignmentEditForm.status}
                  onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="new">🟡 Поставлено</option>
                  <option value="in_progress">🔵 В работе</option>
                  <option value="done">🟢 Выполнено</option>
                  <option value="no_response">🔴 Нет ответа</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>
                Комментарий:
              </label>
              <textarea
                value={assignmentEditForm.comment}
                onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, comment: e.target.value })}
                rows={3}
                placeholder="Добавьте комментарий..."
                style={{
                  width: '100%',
                  padding: 12,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontSize: '0.95rem',
                  lineHeight: 1.5
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <button
                className="secondary"
                onClick={() => setEditingAssignment(null)}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                Отмена
              </button>
              <button
                className="primary"
                onClick={handleSaveAssignmentEdit}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
