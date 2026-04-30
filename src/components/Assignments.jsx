import { useState, useEffect } from 'react';
import { 
  getAssignmentsReceived, getAssignmentsGiven, createAssignment, updateAssignment,
  getUniqueDepartments, getAllUsers
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import { formatDate } from '../utils/dateUtils';

const statusColors = {
  new: '#ffc107',
  in_progress: '#0d6efd',
  done: '#198754',
  no_response: '#dc3545'
};

const statusLabels = {
  new: '🟡 Поставено',
  in_progress: '🔵 В работе',
  done: '🢞 Выполнено',
  no_response: '🔴 Нет ответа'
};

export default function Assignments({ currentUser }) {
  const [activeTab, setActiveTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [given, setGiven] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    toDepartmentId: '',
    toUserId: '',
    text: '',
    deadline: '',
    toSpecificUser: false,
  });
  const [commentText, setCommentText] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersByDept, setUsersByDept] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const ITEMS_PER_PAGE = 3;
  const BUBBLE_HEIGHT = 100;

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
      const sortedReceived = receivedData.sort((a, b) => 
        new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0)
      );
      const sortedGiven = givenData.sort((a, b) => 
        new Date(b.createdAt?.toDate?.() || b.createdAt || 0) - new Date(a.createdAt?.toDate?.() || a.createdAt || 0)
      );
      setReceived(sortedReceived);
      setGiven(sortedGiven);
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
    try {
      await createAssignment({
        fromUserId: currentUser.id,
        toDepartmentId: newAssignment.toDepartmentId,
        toUserId: newAssignment.toSpecificUser && newAssignment.toUserId ? newAssignment.toUserId : null,
        text: newAssignment.text,
        deadline: newAssignment.deadline || null,
        status: 'new',
      });
      setShowCreateForm(false);
      setNewAssignment({ 
        toDepartmentId: '', 
        toUserId: '', 
        text: '', 
        deadline: '', 
        toSpecificUser: false 
      });
      loadAssignments();
      window.dispatchEvent(new Event('assignments-updated'));
    } catch (err) {
      setError('Ошибка создания поручения');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateAssignment(id, { status: newStatus });
      loadAssignments();
      window.dispatchEvent(new Event('assignments-updated'));
    } catch (err) {
      setError('Ошибка изменения статуса');
    }
  };

  const handleComment = async (id) => {
    const comment = commentText[id];
    if (!comment) return;
    try {
      await updateAssignment(id, { comment });
      setCommentText({ ...commentText, [id]: '' });
      loadAssignments();
      window.dispatchEvent(new Event('assignments-updated'));
    } catch (err) {
      setError('Ошибка добавления комментария');
    }
  };

  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const renderChatBubble = (a, type) => {
    const isReceived = type === 'received';
    const dept = departments.find(d => d.id === a.toDepartmentId);
    const toUser = users.find(u => u.id === a.toUserId);
    const fromUser = users.find(u => u.id === a.fromUserId);
    
    const counterparty = isReceived 
      ? (fromUser?.fullName || 'Неизвестный')
      : (toUser?.fullName || dept?.name || 'Неизвестный');
    
    const avatar = isReceived ? '📥' : '📤';
    const bubbleStyle = {
      display: 'flex',
      gap: '10px',
      padding: '12px 16px',
      marginBottom: '8px',
      borderRadius: '16px',
      background: isReceived ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0, 123, 255, 0.1)',
      border: `1px solid ${isReceived ? 'rgba(255, 152, 0, 0.3)' : 'rgba(0, 123, 255, 0.3)'}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      maxWidth: '100%',
      alignItems: 'flex-start'
    };

    const statusColor = statusColors[a.status] || '#6c757d';

    return (
      <div 
        key={a.id} 
        style={bubbleStyle}
        onClick={() => setSelectedAssignment({...a, type})}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(3px)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ 
          fontSize: '24px', 
          flexShrink: 0,
          marginTop: '2px'
        }}>
          {avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '4px',
            gap: '8px'
          }}>
            <span style={{ 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              wordBreak: 'break-word'
            }}>
              {counterparty}
            </span>
            {!isReceived && (
              <span style={{ 
                fontSize: '0.85rem',
                color: statusColor,
                fontWeight: '500',
                flexShrink: 0
              }}>
                {statusLabels[a.status]}
              </span>
            )}
          </div>
          <div style={{ 
            fontSize: '0.95rem', 
            color: 'var(--text-primary)',
            marginBottom: '6px',
            lineHeight: '1.4',
            wordBreak: 'break-word'
          }}>
            {truncateText(a.text, 120)}
          </div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            <span>{formatDate(a.deadline || a.createdAt?.toDate?.() || a.createdAt || '')}</span>
            {isReceived && a.status && (
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: statusColor,
                display: 'inline-block'
              }} />
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="card" style={{ color: 'var(--color-danger)' }}>{error}</div>;

  const currentList = activeTab === 'received' ? received : given;

  return (
    <>
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2>📋 Поручения</h2>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          borderBottom: '1px solid var(--border-light)', 
          marginBottom: '16px',
          flexShrink: 0
        }}>
          <button 
            className={activeTab === 'received' ? 'primary' : 'secondary'} 
            onClick={() => { setActiveTab('received'); setSelectedAssignment(null); }}
          >
            📥 Мне поручили
          </button>
          <button 
            className={activeTab === 'given' ? 'primary' : 'secondary'} 
            onClick={() => { setActiveTab('given'); setSelectedAssignment(null); }}
          >
            📤 Я поручил
          </button>
          {activeTab === 'given' && (
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)} 
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            >
              ➕ Новое
            </button>
          )}
        </div>

        {showCreateForm && activeTab === 'given' && (
          <form onSubmit={handleCreate} style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '16px',
            flexShrink: 0
          }}>
            <div style={{ marginBottom: '12px' }}>
              <select 
                required 
                value={newAssignment.toDepartmentId} 
                onChange={e => setNewAssignment({...newAssignment, toDepartmentId: e.target.value, toUserId: ''})}
                style={{ width: '100%' }}
              >
                <option value="">Выберите отдел</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            {newAssignment.toDepartmentId && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={newAssignment.toSpecificUser}
                    onChange={e => setNewAssignment({...newAssignment, toSpecificUser: e.target.checked, toUserId: ''})}
                  />
                  Конретному сотруднику
                </label>
                {newAssignment.toSpecificUser && (
                  <select 
                    value={newAssignment.toUserId} 
                    onChange={e => setNewAssignment({...newAssignment, toUserId: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="">Выберите сотрудника</option>
                    {usersByDept.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                )}
              </div>
            )}
            
            <textarea 
              placeholder="Текст поручения" 
              required 
              value={newAssignment.text} 
              onChange={e => setNewAssignment({...newAssignment, text: e.target.value})} 
              rows={3} 
              style={{ width: '100%', marginBottom: '12px', resize: 'vertical' }}
            />
            <input 
              type="date" 
              placeholder="Срок (опционально)" 
              value={newAssignment.deadline} 
              onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
              style={{ width: '100%', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="primary" type="submit">Создать</button>
              <button className="secondary" type="button" onClick={() => setShowCreateForm(false)}>Отмена</button>
            </div>
          </form>
        )}

        <div style={{ 
          flex: '0 0 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '4px',
          marginBottom: '8px',
          minHeight: `${Math.min(ITEMS_PER_PAGE, currentList.length) * BUBBLE_HEIGHT}px`,
          maxHeight: `${ITEMS_PER_PAGE * BUBBLE_HEIGHT}px`
        }}>
          {currentList.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px', 
              color: 'var(--text-secondary)' 
            }}>
              {activeTab === 'received' ? '📭 Нет входящих поручений' : '📤 Нет исходящих поручений'}
            </div>
          ) : (
            currentList.map(a => renderChatBubble(a, activeTab))
          )}
        </div>
      </div>

      {selectedAssignment && (
        <div 
          className="modal-overlay"
          onClick={() => setSelectedAssignment(null)}
          style={{ 
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
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="modal-content"
            style={{ 
              width: '95%',
              maxWidth: '1200px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              color: 'var(--text-primary)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedAssignment(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontWeight: 'bold',
                lineHeight: 1
              }}
            >
              ×
            </button>
            
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
              {selectedAssignment.type === 'received' ? '📥 Входящее поручение' : '📤 Исходящее поручение'}
            </h3>
            
            <div>
              <div style={{ marginBottom: '12px' }}>
                <strong>{selectedAssignment.type === 'received' ? 'От кого:' : 'Кому:'}</strong>{' '}
                {selectedAssignment.type === 'received'
                  ? users.find(u => u.id === selectedAssignment.fromUserId)?.fullName || 'Неизвестный'
                  : (users.find(u => u.id === selectedAssignment.toUserId)?.fullName ||
                     departments.find(d => d.id === selectedAssignment.toDepartmentId)?.name ||
                     'Неизвестный')
                }
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Текст:</strong> {selectedAssignment.text}
              </div>
              {selectedAssignment.deadline && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>Срок:</strong> {formatDate(selectedAssignment.deadline)}
                </div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <strong>Статус:</strong>{' '}
                {selectedAssignment.type === 'received' ? (
                  <select 
                    value={selectedAssignment.status} 
                    onChange={(e) => {
                      handleStatusChange(selectedAssignment.id, e.target.value);
                      setSelectedAssignment({...selectedAssignment, status: e.target.value});
                    }}
                    style={{ marginLeft: '8px', padding: '4px 8px' }}
                  >
                    {Object.entries(statusLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ color: statusColors[selectedAssignment.status] }}>
                    {statusLabels[selectedAssignment.status]}
                  </span>
                )}
              </div>
              {selectedAssignment.comment && (
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(0,0,0,0.05)', 
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <strong>Комментарий:</strong> {selectedAssignment.comment}
                </div>
              )}
              {selectedAssignment.type === 'received' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ваш комментарий..."
                    value={commentText[selectedAssignment.id] || ''}
                    onChange={(e) => setCommentText({ ...commentText, [selectedAssignment.id]: e.target.value })}
                    style={{ flex: 1, padding: '8px' }}
                  />
                  <button 
                    className="secondary"
                    onClick={() => {
                      handleComment(selectedAssignment.id);
                      setSelectedAssignment(prev => ({ ...prev, comment: commentText[selectedAssignment.id] || '' }));
                    }}
                  >
                    Отправить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
