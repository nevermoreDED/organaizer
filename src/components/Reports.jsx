import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveReport, getReports, getAllReports, getUserById } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function Reports({ userId, isAdmin }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [calls, setCalls] = useState('');
  const [sales, setSales] = useState('');
  const [rating, setRating] = useState('');
  const [myReports, setMyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [usersCache, setUsersCache] = useState({});
  const [loading, setLoading] = useState(false);

  const loadMyReports = async () => {
    setLoading(true);
    const reports = await getReports(userId, filterStart || null, filterEnd || null);
    setMyReports(reports);
    setLoading(false);
  };

  const loadAllReports = async () => {
    if (!isAdmin) return;
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    loadMyReports();
    if (isAdmin) loadAllReports();
  }, [filterStart, filterEnd]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !calls || !sales || !rating) {
      alert('Заполните все поля');
      return;
    }
    await saveReport(userId, { date, calls: parseInt(calls), sales: parseInt(sales), rating: parseFloat(rating) });
    setCalls('');
    setSales('');
    setRating('');
    loadMyReports();
    if (isAdmin) loadAllReports();
    alert('Отчёт сохранён');
  };

  const exportToExcel = () => {
    const data = allReports.map(r => ({
      'Сотрудник': usersCache[r.userId] || r.userId,
      'Дата': r.date,
      'Звонки': r.calls,
      'Продажи': r.sales,
      'Рейтинг': r.rating
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёты');
    XLSX.writeFile(wb, `reports_${filterStart || 'all'}_${filterEnd || 'all'}.xlsx`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card">
      <h2>📊 Личные отчёты (KPI)</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        <input type="number" placeholder="Звонки" value={calls} onChange={e => setCalls(e.target.value)} required />
        <input type="number" placeholder="Продажи" value={sales} onChange={e => setSales(e.target.value)} required />
        <input type="number" step="0.1" placeholder="Рейтинг" value={rating} onChange={e => setRating(e.target.value)} required />
        <button className="primary" type="submit">Добавить отчёт</button>
      </form>

      <div style={{ marginBottom: 15, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} placeholder="с" />
        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} placeholder="по" />
        {isAdmin && <button className="secondary" onClick={exportToExcel}>📎 Экспорт в Excel</button>}
      </div>

      <h3>Мои отчёты</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr><th>Дата</th><th>Звонки</th><th>Продажи</th><th>Рейтинг</th></tr>
          </thead>
          <tbody>
            {myReports.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.calls}</td>
                <td>{r.sales}</td>
                <td>{r.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <>
          <h3>Все отчёты</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr><th>Сотрудник</th><th>Дата</th><th>Звонки</th><th>Продажи</th><th>Рейтинг</th></tr>
              </thead>
              <tbody>
                {allReports.map(r => (
                  <tr key={r.id}>
                    <td>{usersCache[r.userId] || r.userId}</td>
                    <td>{r.date}</td>
                    <td>{r.calls}</td>
                    <td>{r.sales}</td>
                    <td>{r.rating}</td>
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