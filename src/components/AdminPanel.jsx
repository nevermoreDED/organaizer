import { useState, useEffect } from 'react';
import { createUser, getAllUsers, deleteUser, updateUser } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const departments = [
  { id: 'dept1', name: 'Логистика' },
  { id: 'dept3', name: 'Бухгалтерия' },
  { id: 'dept4', name: 'Бронирование' },
  { id: 'dept5', name: 'Качество' }
  // Отдел IT удалён
];

export default function AdminPanel({ currentUser, onClose }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('dept1');
  const [isIT, setIsIT] = useState(false);  // чекбокс
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleDelete = async (userId) => {
    if (window.confirm('Удалить пользователя?')) {
      await deleteUser(userId);
      loadUsers();
    }
  };

  const handleResetPassword = async (userId, currentPassword) => {
    const newPwd = prompt('Введите новый пароль для пользователя:', currentPassword);
    if (newPwd) {
      await updateUser(userId, { password: newPwd });
      alert('Пароль изменён');
      loadUsers();
    }
  };

  const handleToggleIT = async (userId, currentIT) => {
    await updateUser(userId, { isIT: !currentIT });
    loadUsers();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>Панель администратора</h3>
        <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
          <h4>Создать нового сотрудника</h4>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
            <input type="checkbox" checked={isIT} onChange={e => setIsIT(e.target.checked)} />
            IT (админские права, не отображается в графиках)
          </label>
          <button className="primary" type="submit">Создать пользователя</button>
        </form>

        <h4>Список сотрудников</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Логин</th><th>ФИО</th><th>Роль</th><th>IT</th><th>Отдел</th><th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.login}</td><td>{u.fullName}</td><td>{u.role}</td>
                  <td><input type="checkbox" checked={u.isIT || false} onChange={() => handleToggleIT(u.id, u.isIT)} /></td>
                  <td>{departments.find(d => d.id === u.departmentId)?.name || u.departmentId}</td>
                  <td>
                    <button className="secondary" onClick={() => handleResetPassword(u.id, u.password)}>Сменить пароль</button>
                    <button className="danger" onClick={() => handleDelete(u.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {status && <p style={{ marginTop: 10 }}>{status}</p>}
        <button className="secondary" onClick={onClose} style={{ marginTop: 16 }}>Закрыть</button>
      </div>
    </div>
  );
}