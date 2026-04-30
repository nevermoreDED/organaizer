import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveReport, getReports, getAllReports, getUserById, addLog } from '../services/dataService';
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

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUserById(userId);
      setCurrentUserObj(user);
    };
    loadUser();
  }, [userId]);

  const loadMyReports = async () => {
    setLoadingMy(true);
    try {
      const reports = await getReports(userId, filterStart || null, filterEnd || null);
      setMyReports(reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMy(false);
    }
  };

  const loadAllReports = async () => {
    if (!(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'it')) return;
    setLoadingAll(true);
    try {
      let reports;
      if (currentUserRole === 'admin' || currentUserRole === 'it') {
        reports = await getAllReports(filterStart || null, filterEnd || null);
      } else {
        const all = await getAllReports(filterStart || null, filterEnd || null);
        const deptUsers = await getUsersByDepartment(currentUserDepartmentId);
        const userIds = deptUsers.map(u => u.id);
        reports = all.filter(r => userIds.includes(r.userId));
      }
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
  };

  useEffect(() => {
    loadMyReports();
    if (currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'it') {
      loadAllReports();
    }
  }, [filterStart, filterEnd]);

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
      foundDriver: foundDriver ? parseInt(foundDriver) : 0,
      notFoundDriver: notFoundDriver ? parseInt(notFoundDriver) : 0,
      comment,
      departmentName: departments.find(d => d.id === currentUserObj?.departmentId)?.name || currentUserObj?.departmentId || ''
    });
    await addLog(userId, currentUser.fullName, 'Добавление отчёта', `Дата: ${date}, заказы: ${orders}, запросы: ${requests}, ...`);
    setOrders('');
    setRequests('');
    setTransferred('');
    setCalls('');
    setIncoming('');
    setClosed('');
    setFoundDriver('');
    setNotFoundDriver('');
    setComment('');
    setAllowDateEdit(false);
    setDate(new Date().toISOString().split('T')[0]);
    loadMyReports();
    if (currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'it') {
      loadAllReports();
    }
    alert('Отчёт сохранён');
  };

  const exportToExcel = () => {
    const data = allReports.map(r => ({
      'Сотрудник': usersCache[r.userId] || r.userId,
      'Отдел': r.departmentName || '',
      'Дата': r.date,
      'Заказы': r.orders,
      'Запросы': r.requests,
      'Передано': r.transferred,
      'Прозвоны': r.calls,
      'Входящие': r.incoming,
      'Закрыто': r.closed,
      'Найден исполнитель': r.foundDriver || 0,
      'Не найден исполнитель': r.notFoundDriver || 0,
      'Комментарии': r.comment || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёты');
    XLSX.writeFile(wb, `reports_${filterStart || 'all'}_${filterEnd || 'all'}.xlsx`);
  };

  const canViewAllReports = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'it';

  if (loadingMy && myReports.length === 0) return <LoadingSpinner />;

  return (
    <div className="restricted-card">
      <h2>📊 Личные отчёты</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
          <div><strong>Сотрудник:</strong> {currentUserObj?.fullName || 'Загрузка...'}</div>
          <div><strong>Отдел:</strong> {departments.find(d => d.id === currentUserObj?.departmentId)?.name || currentUserObj?.departmentId || '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 15 }}>
          <label>
            <input type="checkbox" checked={allowDateEdit} onChange={e => setAllowDateEdit(e.target.checked)} />
            Изменить дату
          </label>
          {allowDateEdit ? (
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          ) : (
            <span>Дата отчёта: {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <input type="number" placeholder="Заказы (внесены в CRM)" value={orders} onChange={e => setOrders(e.target.value)} required />
          <input type="number" placeholder="Запросы (обработаны в почте)" value={requests} onChange={e => setRequests(e.target.value)} required />
          <input type="number" placeholder="Передано" value={transferred} onChange={e => setTransferred(e.target.value)} required />
          <input type="number" placeholder="Прозвоны" value={calls} onChange={e => setCalls(e.target.value)} required />
          <input type="number" placeholder="Входящие" value={incoming} onChange={e => setIncoming(e.target.value)} required />
          <input type="number" placeholder="Закрыто" value={closed} onChange={e => setClosed(e.target.value)} required />
          <input type="number" placeholder="Найден исполнитель (логистика)" value={foundDriver} onChange={e => setFoundDriver(e.target.value)} />
          <input type="number" placeholder="Не найден исполнитель (логистика)" value={notFoundDriver} onChange={e => setNotFoundDriver(e.target.value)} />
        </div>
        <textarea placeholder="Комментарии по смене" value={comment} onChange={e => setComment(e.target.value)} rows={3} style={{ marginTop: 10, width: '100%' }} />
        <button className="primary" type="submit" style={{ marginTop: 15 }}>Добавить отчёт</button>
      </form>

      <div style={{ marginBottom: 15, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>Фильтр по дате:</label>
        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} placeholder="с" />
        <span>—</span>
        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} placeholder="по" />
        {canViewAllReports && <button className="secondary" onClick={exportToExcel}>📎 Экспорт в Excel</button>}
      </div>

      <h3>Мои отчёты</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Дата</th><th>Заказы</th><th>Запросы</th><th>Передано</th><th>Прозвоны</th><th>Входящие</th><th>Закрыто</th><th>Найден</th><th>Не найден</th><th>Комментарии</th>
            </tr>
          </thead>
          <tbody>
            {myReports.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.orders}</td>
                <td>{r.requests}</td>
                <td>{r.transferred}</td>
                <td>{r.calls}</td>
                <td>{r.incoming}</td>
                <td>{r.closed}</td>
                <td>{r.foundDriver || 0}</td>
                <td>{r.notFoundDriver || 0}</td>
                <td>{r.comment || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canViewAllReports && (
        <>
          <h3>Все отчёты</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Сотрудник</th><th>Отдел</th><th>Дата</th><th>Заказы</th><th>Запросы</th><th>Передано</th><th>Прозвоны</th><th>Входящие</th><th>Закрыто</th><th>Найден</th><th>Не найден</th><th>Комментарии</th>
                </tr>
              </thead>
              <tbody>
                {allReports.map(r => (
                  <tr key={r.id}>
                    <td>{usersCache[r.userId] || r.userId}</td>
                    <td>{r.departmentName || ''}</td>
                    <td>{r.date}</td>
                    <td>{r.orders}</td>
                    <td>{r.requests}</td>
                    <td>{r.transferred}</td>
                    <td>{r.calls}</td>
                    <td>{r.incoming}</td>
                    <td>{r.closed}</td>
                    <td>{r.foundDriver || 0}</td>
                    <td>{r.notFoundDriver || 0}</td>
                    <td>{r.comment || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}