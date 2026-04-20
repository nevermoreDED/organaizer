import { useState, useEffect } from 'react';
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
      setReceived(receivedData);
      setGiven(givenData);
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

  const renderCard = (a, type) => {
    const isReceived = type === 'received';
    const dept = departments.find(d => d.id === a.toDepartmentId);
    const toUser = users.find(u => u.id === a.toUserId);
    const fromUser = users.find(u => u.id === a.fromUserId);
    return (
      <div key={a.id} style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 12, marginBottom: 12, background: 'rgba(255,255,255,0.05)' }}>
        <div><strong>Текст:</strong> {a.text}</div>
        <div><strong>Отдел:</strong> {dept?.name || a.toDepartmentId}</div>
        {a.toUserId && <div><strong>Исполнитель:</strong> {toUser?.fullName || a.toUserId}</div>}
        {isReceived && <div><strong>От кого:</strong> {fromUser?.fullName}</div>}
        {!isReceived && <div><strong>Кому:</strong> {toUser?.fullName || dept?.name}</div>}
        {a.deadline && <div><strong>Срок:</strong> {a.deadline}</div>}
        <div><strong>Статус:</strong> 
          {isReceived ? (
            <select value={a.status} onChange={(e) => handleStatusChange(a.id, e.target.value)}>
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) : (
            <span style={{ color: statuses.find(s => s.value === a.status)?.color }}>{statuses.find(s => s.value === a.status)?.label}</span>
          )}
        </div>
        {a.comment && <div><strong>Комментарий:</strong> {a.comment}</div>}
        {isReceived && (
          <div style={{ marginTop: 8 }}>
            <input 
              type="text" 
              placeholder="Ваш комментарий..." 
              value={commentText[a.id] || ''} 
              onChange={(e) => setCommentText({ ...commentText, [a.id]: e.target.value })}
              style={{ marginRight: 8 }}
            />
            <button className="secondary" onClick={() => handleComment(a.id)}>Отправить</button>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="card" style={{ color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div className="card">
      <h2>📋 Поручения</h2>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-light)', marginBottom: 20 }}>
        <button className={activeTab === 'received' ? 'primary' : 'secondary'} onClick={() => setActiveTab('received')}>Мне поручили</button>
        <button className={activeTab === 'given' ? 'primary' : 'secondary'} onClick={() => setActiveTab('given')}>Я поручил</button>
        {activeTab === 'given' && (
          <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ marginLeft: 'auto' }}>➕ Новое поручение</button>
        )}
      </div>

      {activeTab === 'received' && (
        <div>{received.length === 0 ? <p>Нет входящих поручений</p> : received.map(a => renderCard(a, 'received'))}</div>
      )}

      {activeTab === 'given' && (
        <>
          {showCreateForm && (
            <form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 20 }}>
              <h3>Новое поручение</h3>
              <select required value={newAssignment.toDepartmentId} onChange={e => setNewAssignment({...newAssignment, toDepartmentId: e.target.value, toUserId: ''})}>
                <option value="">Выберите отдел</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              
              {newAssignment.toDepartmentId && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={newAssignment.toSpecificUser}
                      onChange={e => setNewAssignment({...newAssignment, toSpecificUser: e.target.checked, toUserId: ''})}
                    />
                    Конкретному сотруднику
                  </label>
                  {newAssignment.toSpecificUser && (
                    <select 
                      value={newAssignment.toUserId} 
                      onChange={e => setNewAssignment({...newAssignment, toUserId: e.target.value})}
                      style={{ marginTop: 8 }}
                    >
                      <option value="">Выберите сотрудника</option>
                      {usersByDept.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  )}
                </div>
              )}
              
              <textarea placeholder="Текст поручения" required value={newAssignment.text} onChange={e => setNewAssignment({...newAssignment, text: e.target.value})} rows={2} style={{ width: '100%', marginTop: 10 }} />
              <input type="date" placeholder="Срок" value={newAssignment.deadline} onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})} style={{ marginTop: 10 }} />
              <div style={{ marginTop: 15, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="primary" type="submit">Создать</button>
                <button className="secondary" type="button" onClick={() => setShowCreateForm(false)}>Отмена</button>
              </div>
            </form>
          )}
          <div>{given.length === 0 ? <p>Нет исходящих поручений</p> : given.map(a => renderCard(a, 'given'))}</div>
        </>
      )}
    </div>
  );
}