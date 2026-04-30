import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getAssignmentsReceived, getAssignmentsGiven, createAssignment, updateAssignment,
  getUniqueDepartments, getAllUsers
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const statuses = [
  { value: 'new', label: '🟡 Поставлено', color: '#ffc107' },
  { value: 'in_progress', label: '🔵 В работе', color: '#0d6efd' },
  { value: 'done', label: '🟢 Выполнено', color: '#198754' },
  { value: 'no_response', label: '🔴 Нет ответа', color: '#dc3545' },
];

export default function Assignments({ currentUser, onEdit = () => {} }) {
  const [activeTab, setActiveTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [given, setGiven] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    toDepartmentId: '',
    toUserId: '',
    text: '',
    deadline: '',
    toSpecificUser: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersByDept, setUsersByDept] = useState([]);

  const receivedEndRef = useRef(null);
  const givenEndRef = useRef(null);

  useEffect(() => {
    loadDepartmentsAndUsers();
  }, []);

  const loadDepartmentsAndUsers = async () => {
    try {
      const [depts, allUsers] = await Promise.all([
        getUniqueDepartments(),
        getAllUsers()
      ]);
      setDepartments(depts);
      setUsers(allUsers.filter(u => u.role !== 'admin'));
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const [receivedData, givenData] = await Promise.all([
        getAssignmentsReceived(currentUser.id, currentUser.departmentId),
        getAssignmentsGiven(currentUser.id),
      ]);

      const sortedReceived = (receivedData || []).sort((a, b) => 
        new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id)
      );
      const sortedGiven = (givenData || []).sort((a, b) => 
        new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id)
      );

      setReceived(sortedReceived);
      setGiven(sortedGiven);
      setVisibleCount(3);
    } catch (err) {
      setError('Ошибка загрузки поручений');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) loadAssignments();
  }, [currentUser]);

  useEffect(() => {
    const handleUpdate = () => loadAssignments();
    window.addEventListener('assignments-updated', handleUpdate);
    return () => window.removeEventListener('assignments-updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (newAssignment.toDepartmentId) {
      const filtered = users.filter(u => u.departmentId === newAssignment.toDepartmentId);
      setUsersByDept(filtered);
    } else {
      setUsersByDept([]);
    }
  }, [newAssignment.toDepartmentId, users]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAssignment.text) return;
    
    const tempId = `temp_${Date.now()}`;
    const newAssignmentData = {
      id: tempId,
      fromUserId: currentUser.id,
      toDepartmentId: newAssignment.toDepartmentId,
      toUserId: newAssignment.toSpecificUser && newAssignment.toUserId ? newAssignment.toUserId : null,
      text: newAssignment.text,
      deadline: newAssignment.deadline || null,
      status: 'new',
      createdAt: new Date().toISOString(),
      comment: ''
    };

    setGiven(prev => [newAssignmentData, ...prev]);
    setShowCreateForm(false);
    setNewAssignment({
      toDepartmentId: '',
      toUserId: '',
      text: '',
      deadline: '',
      toSpecificUser: false
    });

    try {
      const created = await createAssignment({
        fromUserId: currentUser.id,
        toDepartmentId: newAssignment.toDepartmentId,
        toUserId: newAssignment.toSpecificUser && newAssignment.toUserId ? newAssignment.toUserId : null,
        text: newAssignment.text,
        deadline: newAssignment.deadline || null,
        status: 'new',
      });
      
      setGiven(prev => prev.map(a => a.id === tempId ? { ...created, id: created.id } : a));
      await addLog(currentUser.id, currentUser.fullName, 'Создание поручения', newAssignment.text);
      window.dispatchEvent(new Event('assignments-updated'));
    } catch (err) {
      setGiven(prev => prev.filter(a => a.id !== tempId));
      setError('Ошибка создания поручения');
      console.error(err);
    }
  };

  const handleLoadMore = useCallback((tab) => {
    setVisibleCount(prev => prev + 3);
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatChatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const getStatusColor = (status) => {
    return statuses.find(s => s.value === status)?.color || '#6c757d';
  };

  const renderChatListItem = (a, type) => {
    const isReceived = type === 'received';
    const dept = departments.find(d => d.id === a.toDepartmentId);
    const toUser = users.find(u => u.id === a.toUserId);
    const fromUser = users.find(u => u.id === a.fromUserId);
    
    const contactName = isReceived ? fromUser?.fullName : (toUser?.fullName || dept?.name || 'Неизвестно');
    const lastMessage = a.text;
    
    let avatarColor;
    if (isReceived) {
      if (fromUser?.departmentId) {
        const colors = ['#e57373', '#64b5f6', '#81c784', '#ffb74d'];
        const index = parseInt(fromUser.departmentId.slice(-1)) % 4;
        avatarColor = colors[index] || '#9e9e9e';
      } else {
        avatarColor = '#9e9e9e';
      }
    } else {
      avatarColor = '#9e9e9e';
    }

    const itemStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-light)',
      cursor: 'pointer',
      transition: 'background 0.2s',
      borderRadius: 8,
      marginBottom: 2,
    };
    
    const avatarStyle = {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: avatarColor,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      flexShrink: 0,
    };
    
    const contentStyle = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    };
    
    const headerRowStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    };
    
    const nameStyle = {
      fontWeight: 600,
      fontSize: '0.95rem',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
    
    const timeStyle = {
      fontSize: '0.75rem',
      color: 'var(--text-muted)',
      flexShrink: 0,
    };
    
    const messageStyle = {
      fontSize: '0.85rem',
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    };
    
    const statusIndicatorStyle = {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: getStatusColor(a.status),
      flexShrink: 0,
    };

    return (
      <div
        key={a.id}
        style={itemStyle}
        onClick={() => { if (onEdit) onEdit(a); }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={avatarStyle}>
          {getInitials(contactName)}
        </div>
        <div style={contentStyle}>
          <div style={headerRowStyle}>
            <span style={nameStyle} title={contactName}>
              {contactName}
            </span>
            <span style={timeStyle}>
              {formatChatTime(a.createdAt || a.id)}
            </span>
          </div>
          <div style={messageStyle}>
            <span style={{ flexShrink: 0 }}>
              {isReceived ? '📥' : '📤'}
            </span>
            <span title={lastMessage}>
              {lastMessage}
            </span>
            {a.deadline && !isNaN(new Date(a.deadline).getTime()) && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                📅 {new Date(a.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={statusIndicatorStyle} title={statuses.find(s => s.value === a.status)?.label} />
        </div>
      </div>
    );
  };

  const visibleReceived = received.slice(0, visibleCount);
  const visibleGiven = given.slice(0, visibleCount);
  const hasMoreReceived = received.length > visibleCount;
  const hasMoreGiven = given.length > visibleCount;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (activeTab === 'received' && hasMoreReceived) {
              handleLoadMore('received');
            } else if (activeTab === 'given' && hasMoreGiven) {
              handleLoadMore('given');
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentRef = activeTab === 'received' ? receivedEndRef : givenEndRef;
    if (currentRef.current) {
      observer.observe(currentRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab, visibleCount, hasMoreReceived, hasMoreGiven, handleLoadMore]);

  if (loading && received.length === 0 && given.length === 0) return <LoadingSpinner />;
  if (error) return <div className="card" style={{ color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div className="card">
      <h2>📋 Поручения</h2>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-light)', marginBottom: 20 }}>
        <button className={activeTab === 'received' ? 'primary' : 'secondary'} onClick={() => setActiveTab('received')}>
          Мне поручили
        </button>
        <button className={activeTab === 'given' ? 'primary' : 'secondary'} onClick={() => setActiveTab('given')}>
          Я поручил
        </button>
        {activeTab === 'given' && (
          <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ marginLeft: 'auto' }}>
            ➕ Новое поручение
          </button>
        )}
      </div>

      {activeTab === 'received' && (
        <div>
          {visibleReceived.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              Нет входящих поручений
            </p>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {visibleReceived.map(a => renderChatListItem(a, 'received'))}
            </div>
          )}
          {hasMoreReceived && (
            <div ref={receivedEndRef} style={{ textAlign: 'center', padding: 10 }}>
              <button 
                className="secondary"
                onClick={() => handleLoadMore('received')}
                disabled={loading}
                style={{ padding: '8px 24px' }}
              >
                {loading ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'given' && (
        <>
          {showCreateForm && (
            <form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16 }}>Новое поручение</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>Отдел:</label>
                <select 
                  required 
                  value={newAssignment.toDepartmentId} 
                  onChange={e => setNewAssignment({...newAssignment, toDepartmentId: e.target.value, toUserId: ''})}
                  style={{ 
                    width: '100%', 
                    padding: 10,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 6,
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">Выберите отдел</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {newAssignment.toDepartmentId && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newAssignment.toSpecificUser}
                      onChange={e => setNewAssignment({...newAssignment, toSpecificUser: e.target.checked, toUserId: ''})}
                    />
                    <span>Конкретному сотруднику</span>
                  </label>
                  {newAssignment.toSpecificUser && (
                    <div style={{ marginTop: 8 }}>
                      <select
                        value={newAssignment.toUserId}
                        onChange={e => setNewAssignment({...newAssignment, toUserId: e.target.value})}
                        style={{ 
                          width: '100%',
                          padding: 10,
                          marginTop: 4,
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 6,
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="">Выберите сотрудника</option>
                        {usersByDept.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>Текст поручения:</label>
                <textarea
                  placeholder="Введите текст поручения..."
                  required
                  value={newAssignment.text}
                  onChange={e => setNewAssignment({...newAssignment, text: e.target.value})}
                  rows={3}
                  style={{ 
                    width: '100%',
                    padding: 10,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem' }}>Срок выполнения:</label>
                <input
                  type="date"
                  placeholder="Срок"
                  value={newAssignment.deadline}
                  onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: 10,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 6,
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                <button className="secondary" type="button" onClick={() => setShowCreateForm(false)}>
                  Отмена
                </button>
                <button className="primary" type="submit">
                  Создать поручение
                </button>
              </div>
            </form>
          )}
          
          <div>
            {visibleGiven.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                Нет исходящих поручений
              </p>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {visibleGiven.map(a => renderChatListItem(a, 'given'))}
              </div>
            )}
            {hasMoreGiven && (
              <div ref={givenEndRef} style={{ textAlign: 'center', padding: 10 }}>
                <button
                  className="secondary"
                  onClick={() => handleLoadMore('given')}
                  disabled={loading}
                  style={{ padding: '8px 24px' }}
                >
                  {loading ? 'Загрузка...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
