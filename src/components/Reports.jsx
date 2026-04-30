import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveReport, getReports, getAllReports, getUserById, addLog, getUsersByDepartment } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const departments = [
  { id: 'dept1', name: 'Логистика' },
  { id: 'dept3', name: 'Бухгалтерия' },
  { id: 'dept4', name: 'Бронирование' },
  { id: 'dept5', name: 'Качество' }
];

export default function Reports({ userId, currentUserRole, currentUserDepartmentId, currentUser }) {
  const [currentUserObj, setCurrentUserObj] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [allowDateEdit, setAllowDateEdit] = useState(false);
  const [orders, setOrders] = useState('');
  const [requests, setRequests] = useState('');
  const [transferred, setTransferred] = useState('');
  const [calls, setCalls] = useState('');
  const [incoming, setIncoming] = useState('');
  const [closed, setClosed] = useState('');
  const [foundDriver, setFoundDriver] = useState('');
  const [notFoundDriver, setNotFoundDriver] = useState('');
  const [comment, setComment] = useState('');
  const [myReports, setMyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [usersCache, setUsersCache] = useState({});
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUserById(userId);
      setCurrentUserObj(user);
    };
    loadUser();
  }, [userId]);

  const loadMyReports = useCallback(async () => {
    setLoadingMy(true);
    try {
      const reports = await getReports(userId, filterStart || null, filterEnd || null);
      setMyReports(reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMy(false);
    }
  }, [userId, filterStart, filterEnd]);

  const loadAllReports = useCallback(async () => {
    // Показываем всё для админов и пользователей с флагом IT
    if (currentUserRole === 'admin' || (currentUser && currentUser.isIT)) {
      setLoadingAll(true);
      try {
        const reports = await getAllReports(filterStart || null, filterEnd || null);
        const usersMap = {};
        for (const report of reports) {
          if (!usersMap[report.userId]) {
            const user = await getUserById(report.userId);
            usersMap[report.userId] = user?.fullName || report.userId;
          }
        }
        setUsersCache(usersMap);
        setAllReports(reports);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAll(false);
      }
      return;
    }

    // Для менеджеров — только по их отделу
    if (currentUserRole === 'manager') {
      setLoadingAll(true);
      try {
        const all = await getAllReports(filterStart || null, filterEnd || null);
        const deptUsers = await getUsersByDepartment(currentUserDepartmentId);
        const userIds = deptUsers.map(u => u.id);
        const reports = all.filter(r => userIds.includes(r.userId));
        const usersMap = {};
        for (const report of reports) {
          if (!usersMap[report.userId]) {
            const user = await getUserById(report.userId);
            usersMap[report.userId] = user?.fullName || report.userId;
          }
        }
        setUsersCache(usersMap);
        setAllReports(reports);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAll(false);
      }
      return;
    }

    // Для остальных — ничего не загружаем (нет прав)
  }, [currentUserRole, currentUserDepartmentId, filterStart, filterEnd]);

  useEffect(() => {
    loadMyReports();
    // Показываем общие отчёты для admin, manager и пользователей с флагом isIT
    if (currentUserRole === 'admin' || currentUserRole === 'manager' || (currentUser && currentUser.isIT)) {
      loadAllReports();
    }
  }, [filterStart, filterEnd, currentUserRole, currentUserDepartmentId, userId, currentUser, loadMyReports, loadAllReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !orders || !requests || !transferred || !calls || !incoming || !closed) {
      alert('Заполните все обязательные поля');
      return;
    }
    await saveReport(userId, {
      date,
      orders: parseInt(orders),
      requests: parseInt(requests),
      transferred: parseInt(transferred),
      calls: parseInt(calls),
      incoming: parseInt(incoming),
      closed: parseInt(closed),
      foundDriver: parseInt(foundDriver) || 0,
      notFoundDriver: parseInt(notFoundDriver) || 0,
      comment
    });
    await addLog(currentUser.id, currentUser.fullName, 'Сохранение отчёта', `Дата: ${date}`);
    loadMyReports();
    if (currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'it') {
      loadAllReports();
    }
    setOrders('');
    setRequests('');
    setTransferred('');
    setCalls('');
    setIncoming('');
    setClosed('');
    setFoundDriver('');
    setNotFoundDriver('');
    setComment('');
  };

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleExportMy = () => {
    const data = myReports.map(r => ({
      Дата: r.date,
      Заказы: r.orders,
      Запросы: r.requests,
      Переданные: r.transferred,
      Звонки: r.calls,
      Входящие: r.incoming,
      Закрытые: r.closed,
      Комментарий: r.comment || ''
    }));
    exportToExcel(data, `мой_отчёт_${date}`);
  };

  const handleExportAll = () => {
    const data = allReports.map(r => ({
      Дата: r.date,
      Сотрудник: usersCache[r.userId] || r.userId,
      Заказы: r.orders,
      Запросы: r.requests,
      Переданные: r.transferred,
      Звонки: r.calls,
      Входящие: r.incoming,
      Закрытые: r.closed,
      Комментарий: r.comment || ''
    }));
    exportToExcel(data, `все_отчёты_${date}`);
  };

  if (loadingMy) return <LoadingSpinner />;

  return (
    <div className="card">
      <h2>📊 Отчёты KPI</h2>
      
      <form onSubmit={handleSubmit} style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24,
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Дата отчёта:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Заказы:</label>
            <input
              type="number"
              placeholder="Заказы"
              value={orders}
              onChange={e => setOrders(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Запросы:</label>
            <input
              type="number"
              placeholder="Запросы"
              value={requests}
              onChange={e => setRequests(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Переданные:</label>
            <input
              type="number"
              placeholder="Переданные"
              value={transferred}
              onChange={e => setTransferred(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Звонки:</label>
            <input
              type="number"
              placeholder="Звонки"
              value={calls}
              onChange={e => setCalls(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Входящие:</label>
            <input
              type="number"
              placeholder="Входящие"
              value={incoming}
              onChange={e => setIncoming(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Закрытые:</label>
            <input
              type="number"
              placeholder="Закрытые"
              value={closed}
              onChange={e => setClosed(e.target.value)}
              style={{ width: '100%', padding: 10 }}
              required
            />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button type="submit" className="primary" style={{ flex: 1 }}>Сохранить отчёт</button>
            <button type="button" className="secondary" onClick={handleExportMy} style={{ flex: 1 }}>Экспорт моего отчёта</button>
          </div>
        </div>
      </form>

      <h3>📋 Мои отчёты</h3>
      {loadingMy ? (
        <LoadingSpinner />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                <th style={{ border: '1px solid var(--border-light)', padding: 8 }}>Дата</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Заказы</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Запросы</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Переданные</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Звонки</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Входящие</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Закрытые</th>
                <th style={{ border: '1px solid var(--border-light)', padding: 8 }}>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {myReports.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>Нет отчётов</td>
                </tr>
              ) : (
                myReports.map(r => (
                  <tr key={r.id}>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8 }}>{formatDate(r.date)}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.orders}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.requests}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.transferred}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.calls}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.incoming}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.closed}</td>
                    <td style={{ border: '1px solid var(--border-light)', padding: 8 }}>{r.comment || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {(currentUserRole === 'admin' || currentUserRole === 'manager' || (currentUser && currentUser.isIT)) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>📋 Все отчёты сотрудников</h3>
            <button className="secondary" onClick={handleExportAll}>Экспорт всех отчётов</button>
          </div>
          
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="date"
              placeholder="Дата с"
              value={filterStart}
              onChange={e => setFilterStart(e.target.value)}
              style={{ padding: 8 }}
            />
            <input
              type="date"
              placeholder="Дата по"
              value={filterEnd}
              onChange={e => setFilterEnd(e.target.value)}
              style={{ padding: 8 }}
            />
            <button className="secondary" onClick={loadAllReports}>Обновить</button>
          </div>

          {loadingAll ? (
            <LoadingSpinner />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8 }}>Дата</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8 }}>Сотрудник</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Заказы</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Запросы</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Переданные</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Звонки</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Входящие</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>Закрытые</th>
                    <th style={{ border: '1px solid var(--border-light)', padding: 8 }}>Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {allReports.map(r => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8 }}>{formatDate(r.date)}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8 }}>{usersCache[r.userId] || r.userId}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.orders}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.requests}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.transferred}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.calls}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.incoming}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8, textAlign: 'right' }}>{r.closed}</td>
                      <td style={{ border: '1px solid var(--border-light)', padding: 8 }}>{r.comment || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
