import { useState, useEffect, useRef } from 'react';
import { getAllUsers, getUserById, addPointsToUser, addLog } from '../services/dataService';
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
  const [loading, setLoading] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const reloadTimeout = useRef(null);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const canAwardPoints = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.isIT === true);

  const handleAddPoints = async () => {
    if (!pointsAmount || !pointsReason) {
      alert('Заполните количество и причину');
      return;
    }
    
    const amount = parseInt(pointsAmount);
    const reason = pointsReason;
    
    // Optimistic update
    setUsers(prev => prev.map(u => 
      u.id === selectedUserForPoints.id 
        ? { ...u, points: (u.points || 0) + amount }
        : u
    ));
    
    setShowPointsModal(false);
    setPointsAmount('');
    setPointsReason('');
    
    try {
      await addPointsToUser(currentUser.id, selectedUserForPoints.id, amount, reason);
      await addLog(currentUser.id, currentUser.fullName, 'Начисление баллов', `${selectedUserForPoints.fullName} +${amount} (${reason})`);
      
      // Debounced reload to sync with server, cancel previous pending reload
      if (reloadTimeout.current) {
        clearTimeout(reloadTimeout.current);
      }
      reloadTimeout.current = setTimeout(() => {
        loadData();
      }, 1000);
    } catch (err) {
      // Revert optimistic update on error
      setUsers(prev => prev.map(u => 
        u.id === selectedUserForPoints.id 
          ? { ...u, points: Math.max(0, (u.points || 0) - amount) }
          : u
      ));
      alert('Ошибка начисления баллов');
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="restricted-card">
      <h2>👥 Сотрудники</h2>
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
