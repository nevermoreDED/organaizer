import { useState, useEffect } from 'react';
import { getUserById, changePassword } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const roleNames = {
  admin: 'Администратор',
  manager: 'Руководитель отдела',
  employee: 'Сотрудник',
  it: 'IT'
};

export default function ProfileCard({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getUserById(userId);
      setUser(data);
      setLoading(false);
    };
    load();
  }, [userId]);

  const getSeniorityBonus = (startDate) => {
    if (!startDate) return 0;
    const years = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24 * 365));
    if (years < 1) return 0;
    if (years < 2) return 3000;
    if (years < 3) return 5000;
    return 8000;
  };

  const handleChangePassword = async () => {
    try {
      await changePassword(userId, oldPassword, newPassword, false);
      alert('Пароль изменён');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2>👤 Ваш профиль</h2>
      <p><strong>ФИО:</strong> {user.fullName}</p>
      <p><strong>Логин:</strong> {user.login}</p>
      <p><strong>Роль:</strong> {roleNames[user.role] || user.role}</p>
      <p><strong>Отдел:</strong> {user.departmentId === 'dept1' ? 'Логистика' : user.departmentId === 'dept3' ? 'Бухгалтерия' : user.departmentId === 'dept4' ? 'Бронирование' : user.departmentId === 'dept5' ? 'Качество' : user.departmentId}</p>
      <p><strong>Личные баллы:</strong> {user.points || 0}</p>
      <p><strong>Стаж:</strong> {user.seniorityStartDate ? Math.floor((new Date() - new Date(user.seniorityStartDate)) / (1000 * 60 * 60 * 24 * 365)) : 0} лет (надбавка {getSeniorityBonus(user.seniorityStartDate)} руб.)</p>
      <button className="primary" onClick={() => setShowChangePassword(true)}>Сменить пароль</button>

      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Смена пароля</h3>
            <input type="password" placeholder="Старый пароль" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            <input type="password" placeholder="Новый пароль" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={handleChangePassword}>Сохранить</button>
              <button className="secondary" onClick={() => setShowChangePassword(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}