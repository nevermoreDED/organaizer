import { useState, useEffect } from 'react';
import { createUser, getAllUsers, deleteUser, updateUser, addLog } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const departments = [
  { id: 'dept1', name: 'Логистика' },
  { id: 'dept3', name: 'Бухгалтерия' },
  { id: 'dept4', name: 'Бронирование' },
  { id: 'dept5', name: 'Качество' }
];

const roleNames = {
  admin: 'Администратор',
  manager: 'Руководитель отдела',
  employee: 'Сотрудник'
};

const formatRole = (user) => {
  const roleText = roleNames[user.role] || user.role;
  if (user.isIT) return <strong>{roleText}</strong>;
  return roleText;
};

export default function AdminPanel({ currentUser, onClose }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('dept1');
  const [isIT, setIsIT] = useState(false);
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    login: '',
    password: '',
    fullName: '',
    role: '',
    departmentId: '',
    isIT: false,
    seniorityStartDate: ''
  });

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!login || !password || !fullName) {
      setStatus('Заполните все поля');
      return;
    }
    setStatus('Создаём...');
    try {
      await createUser({
        login,
        password,
        fullName,
        role,
        departmentId,
        isIT,
        points: 0,
        seniorityStartDate: new Date().toISOString().split('T')[0],
        kpi: {
          day: { calls: 0, sales: 0, rating: 0 },
          week: { calls: 0, sales: 0, rating: 0 },
          month: { calls: 0, sales: 0, rating: 0 }
        }
      });
      await addLog(currentUser.id, currentUser.fullName, 'Создание пользователя', `Создан ${login}`);
      setStatus(`✅ Пользователь ${login} создан.`);
      setLogin('');
      setPassword('');
      setFullName('');
      setIsIT(false);
      loadUsers();
    } catch (err) {
      setStatus(`❌ Ошибка: ${err.message}`);
    }
  };

  const handleDelete = async (userId, userLogin) => {
    if (window.confirm('Удалить пользователя?')) {
      await deleteUser(userId);
      await addLog(currentUser.id, currentUser.fullName, 'Удаление пользователя', `Удалён ${userLogin}`);
      loadUsers();
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      login: user.login,
      password: user.password,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      isIT: user.isIT || false,
      seniorityStartDate: user.seniorityStartDate || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.login || !editForm.fullName) {
      alert('Логин и ФИО обязательны');
      return;
    }
    try {
      const updates = {
        login: editForm.login,
        fullName: editForm.fullName,
        role: editForm.role,
        departmentId: editForm.departmentId,
        isIT: editForm.isIT,
        seniorityStartDate: editForm.seniorityStartDate
      };
      if (editForm.password && editForm.password !== editingUser.password) {
        updates.password = editForm.password;
      }
      await updateUser(editingUser.id, updates);
      await addLog(currentUser.id, currentUser.fullName, 'Редактирование пользователя', `Изменены данные ${editForm.login}`);
      setEditingUser(null);
      loadUsers();
      alert('Данные обновлены');
    } catch (err) {
      alert('Ошибка обновления: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ 
        width: '95%', 
        maxWidth: '1200px', 
        maxHeight: '90vh', 
        overflowY: 'auto',
        padding: '20px'
      }}>
        <h3>Панель администратора</h3>
        <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
          <h4>Создать нового сотрудника</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <input type="text" placeholder="Логин" value={login} onChange={e => setLogin(e.target.value)} required />
            <input type="text" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
            <input type="text" placeholder="ФИО" value={fullName} onChange={e => setFullName(e.target.value)} required />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="employee">Сотрудник</option>
              <option value="manager">Руководитель отдела</option>
              <option value="admin">Администратор</option>
            </select>
            <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={isIT} onChange={e => setIsIT(e.target.checked)} />
              IT (админские права, не отображается в графиках)
            </label>
          </div>
          <button className="primary" type="submit" style={{ marginTop: 10 }}>Создать пользователя</button>
        </form>

        <h4>Список сотрудников</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr>
                <th>Логин</th><th>ФИО</th><th>Роль</th><th>Отдел</th><th>Дата начала работы</th><th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.login}</td>
                  <td>{u.fullName}</td>
                  <td>{formatRole(u)}</td>
                  <td>{departments.find(d => d.id === u.departmentId)?.name || u.departmentId}</td>
                  <td>{u.seniorityStartDate || 'не указана'}</td>
                  <td>
                    <button className="secondary" onClick={() => openEditModal(u)}>✏️ Редактировать</button>
                    <button className="danger" onClick={() => handleDelete(u.id, u.login)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {status && <p style={{ marginTop: 10 }}>{status}</p>}
        <button className="secondary" onClick={onClose} style={{ marginTop: 16 }}>Закрыть</button>
      </div>

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Редактирование пользователя</h3>
            <form onSubmit={handleEditSubmit}>
              <input type="text" placeholder="Логин" value={editForm.login} onChange={e => setEditForm({...editForm, login: e.target.value})} required />
              <input type="text" placeholder="Пароль" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
              <input type="text" placeholder="ФИО" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} required />
              <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                <option value="employee">Сотрудник</option>
                <option value="manager">Руководитель отдела</option>
                <option value="admin">Администратор</option>
              </select>
              <select value={editForm.departmentId} onChange={e => setEditForm({...editForm, departmentId: e.target.value})}>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                <input type="checkbox" checked={editForm.isIT} onChange={e => setEditForm({...editForm, isIT: e.target.checked})} />
                IT (админские права, не отображается в графиках)
              </label>
              <input type="date" placeholder="Дата начала работы" value={editForm.seniorityStartDate} onChange={e => setEditForm({...editForm, seniorityStartDate: e.target.value})} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15 }}>
                <button className="primary" type="submit">Сохранить</button>
                <button className="secondary" onClick={() => setEditingUser(null)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}