import { useState, useEffect } from 'react';
import { getAllUsers, getUserById, changePassword, getShiftsByMonth, addPointsToUser } from '../services/dataService';
import ShiftSchedule from './ShiftSchedule';
import LoadingSpinner from './LoadingSpinner';

const departments = [
  { id: 'dept1', name: 'Логистика' },
  { id: 'dept3', name: 'Бухгалтерия' },
  { id: 'dept4', name: 'Бронирование' },
  { id: 'dept5', name: 'Качество' }
];

export default function Employees({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentShifts, setCurrentShifts] = useState({});
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [workingNow, setWorkingNow] = useState([]);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, user] = await Promise.all([
        getAllUsers(),
        getUserById(currentUserId)
      ]);
      const filteredUsers = allUsers.filter(u => u.role !== 'admin');
      setUsers(filteredUsers);
      setCurrentUser(user);

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const shiftsData = await getShiftsByMonth(yearMonth);
      const shiftsMap = {};
      shiftsData.forEach(s => { shiftsMap[`${s.userId}_${s.date}`] = s.value; });
      setCurrentShifts(shiftsMap);

      const novosibirskTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Novosibirsk' }));
      const today = novosibirskTime.toISOString().split('T')[0];
      const currentHour = novosibirskTime.getHours();
      const currentMinute = novosibirskTime.getMinutes();

      const working = [];
      for (const u of filteredUsers) {
        const shiftValue = shiftsMap[`${u.id}_${today}`];
        if (shiftValue) {
          const match = shiftValue.match(/(\d{1,2})-(\d{1,2})/);
          if (match) {
            let start = parseInt(match[1]);
            let end = parseInt(match[2]);
            if (end < start) end += 24;
            const currentMinutes = currentHour * 60 + currentMinute;
            const startMinutes = start * 60;
            const endMinutes = end * 60;
            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
              working.push(u.fullName);
            }
          } else if (shiftValue === 'Д') {
            if (currentHour >= 7 && currentHour < 19) working.push(u.fullName);
          } else if (shiftValue === 'Н') {
            if (currentHour >= 19 || currentHour < 7) working.push(u.fullName);
          }
        }
      }
      setWorkingNow(working);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3600000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleChangePassword = async () => {
    try {
      await changePassword(currentUserId, oldPassword, newPassword, false);
      alert('Пароль изменён');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  const getSeniorityBonus = (startDate) => {
    if (!startDate) return 0;
    const years = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24 * 365));
    if (years < 1) return 0;
    if (years < 2) return 3000;
    if (years < 3) return 5000;
    return 8000;
  };

  const canAwardPoints = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.isIT === true);

  const handleAddPoints = async () => {
    if (!pointsAmount || !pointsReason) {
      alert('Заполните количество и причину');
      return;
    }
    await addPointsToUser(currentUser.id, selectedUserForPoints.id, parseInt(pointsAmount), pointsReason);
    setShowPointsModal(false);
    setPointsAmount('');
    setPointsReason('');
    loadData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card">
      <h2>👥 Сотрудники</h2>

      {currentUser && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <h3>Ваш профиль</h3>
          <p><strong>ФИО:</strong> {currentUser.fullName}</p>
          <p><strong>Логин:</strong> {currentUser.login}</p>
          <p><strong>Роль:</strong> {currentUser.role}</p>
          <p><strong>Отдел:</strong> {departments.find(d => d.id === currentUser.departmentId)?.name || currentUser.departmentId}</p>
          <p><strong>Личные баллы:</strong> {currentUser.points || 0}</p>
          <p><strong>Стаж:</strong> {currentUser.seniorityStartDate ? Math.floor((new Date() - new Date(currentUser.seniorityStartDate)) / (1000 * 60 * 60 * 24 * 365)) : 0} лет (надбавка {getSeniorityBonus(currentUser.seniorityStartDate)} руб.)</p>
          <p><strong>KPI (день):</strong> звонков {currentUser.kpi?.day?.calls || 0}, продаж {currentUser.kpi?.day?.sales || 0}, рейтинг {currentUser.kpi?.day?.rating || 0}</p>
          <button className="primary" onClick={() => setShowChangePassword(true)}>Сменить пароль</button>
        </div>
      )}

      <h3>Все сотрудники</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ФИО</th><th>Отдел</th><th>Баллы</th><th>Стаж (лет)</th><th>KPI (день)</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{departments.find(d => d.id === u.departmentId)?.name || u.departmentId}</td>
                <td>{u.points || 0}</td>
                <td>{u.seniorityStartDate ? Math.floor((new Date() - new Date(u.seniorityStartDate)) / (1000 * 60 * 60 * 24 * 365)) : 0}</td>
                <td>{u.kpi?.day?.calls || 0}/{u.kpi?.day?.sales || 0}/{u.kpi?.day?.rating || 0}</td>
                <td>
                  {canAwardPoints && (
                    <button className="secondary" onClick={() => { setSelectedUserForPoints(u); setShowPointsModal(true); }}>🎁</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>⏰ Сейчас работают (Новосибирск)</h3>
      {workingNow.length === 0 ? <p>Никто не работает в данный момент</p> : (
        <ul>
          {workingNow.map(name => <li key={name}>{name}</li>)}
        </ul>
      )}

      <h3>График смен</h3>
      <ShiftSchedule currentUser={currentUser} />

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

      {showPointsModal && selectedUserForPoints && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Начисление баллов {selectedUserForPoints.fullName}</h3>
            <input type="number" placeholder="Количество баллов" value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} />
            <input type="text" placeholder="Причина" value={pointsReason} onChange={e => setPointsReason(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={handleAddPoints}>Начислить</button>
              <button className="secondary" onClick={() => setShowPointsModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}