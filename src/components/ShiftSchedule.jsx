import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  getShiftsByMonth, setShiftForDate, createShiftRequest,
  getShiftRequestsForManager, updateShiftRequest, getAllUsers,
  saveShiftsBatch, createOvertimeRequest, getOvertimeRequestsForManager,
  updateOvertimeRequest
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import ImportModal from './ImportModal';

const departments = [
  { id: 'dept1', name: 'Логистика' },
  { id: 'dept3', name: 'Бухгалтерия' },
  { id: 'dept4', name: 'Бронирование' },
  { id: 'dept5', name: 'Качество' }
];

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

export default function ShiftSchedule({ currentUser }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [shifts, setShifts] = useState({});
  const [editedShifts, setEditedShifts] = useState({});
  const [pendingChanges, setPendingChanges] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showOvertimeRequests, setShowOvertimeRequests] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  if (!currentUser) return <LoadingSpinner />;

  const yearMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftsData, allUsers] = await Promise.all([
        getShiftsByMonth(yearMonth),
        getAllUsers()
      ]);
      const shiftsMap = {};
      shiftsData.forEach(s => { shiftsMap[`${s.userId}_${s.date}`] = s.value; });
      setShifts(shiftsMap);
      setUsers(allUsers.filter(u => u.role !== 'admin' && u.departmentId !== 'dept2'));
      setEditedShifts({});
      setPendingChanges([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const isWeekend = (year, month, day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };
  const getWeekdayForDate = (year, month, day) => {
    const date = new Date(year, month, day);
    return weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1];
  };

  const canEdit = () => currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.isIT === true;

  const getCellValue = (userId, date) => {
    if (canEdit()) {
      return editedShifts[`${userId}_${date}`] !== undefined
        ? editedShifts[`${userId}_${date}`]
        : (shifts[`${userId}_${date}`] || '');
    } else {
      const pending = pendingChanges.find(pc => pc.userId === userId && pc.date === date);
      if (pending) return pending.newValue;
      return shifts[`${userId}_${date}`] || '';
    }
  };

  const handleCellEdit = (userId, date, newValue) => {
    if (canEdit()) {
      setEditedShifts(prev => ({ ...prev, [`${userId}_${date}`]: newValue }));
    } else {
      const existingIndex = pendingChanges.findIndex(pc => pc.userId === userId && pc.date === date);
      if (existingIndex !== -1) {
        const updated = [...pendingChanges];
        updated[existingIndex].newValue = newValue;
        setPendingChanges(updated);
      } else {
        setPendingChanges([...pendingChanges, {
          userId,
          date,
          newValue,
          oldValue: shifts[`${userId}_${date}`] || ''
        }]);
      }
    }
    setEditingCell(null);
  };

  const saveAllChanges = async () => {
    const entries = Object.entries(editedShifts);
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const updates = entries.map(([key, value]) => {
        const [userId, date] = key.split('_');
        return { userId, date, value };
      });
      await saveShiftsBatch(currentUser.id, updates);
      await loadData();
      alert('График сохранён');
    } catch (err) {
      alert('Ошибка сохранения: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendChangeRequest = async () => {
    if (pendingChanges.length === 0) return;
    await createShiftRequest(currentUser.id, pendingChanges, yearMonth);
    setPendingChanges([]);
    alert('Запрос на изменение графика отправлен руководителю');
  };

  const sendOvertimeRequest = async () => {
    if (pendingChanges.length === 0) return;
    const allHavePlus = pendingChanges.every(change => change.newValue.includes('+'));
    if (!allHavePlus) {
      alert('Для отправки запроса на переработку все изменения должны содержать символ "+" (например, Д+3, 9-18+2).');
      return;
    }
    for (const change of pendingChanges) {
      const match = change.newValue.match(/(.+)\+(\d+(?:\.\d+)?)$/);
      if (match) {
        await createOvertimeRequest(currentUser.id, change.date, change.oldValue, parseFloat(match[2]), yearMonth);
      }
    }
    setPendingChanges([]);
    alert('Запрос(ы) на переработку отправлены руководителю');
  };

  const loadRequests = async () => {
    const dept = departments.find(d => d.id === currentUser.departmentId);
    if (dept) {
      const [shiftReqs, overtimeReqs] = await Promise.all([
        getShiftRequestsForManager(dept.id),
        getOvertimeRequestsForManager(dept.id)
      ]);
      setRequests(shiftReqs);
      setOvertimeRequests(overtimeReqs);
    }
  };

  const handleApproveRequest = async (req) => {
    for (const shift of req.proposedShifts) {
      await setShiftForDate(shift.userId, shift.date, shift.newValue);
    }
    await updateShiftRequest(req.id, 'approved', req.proposedShifts);
    loadRequests();
    loadData();
  };

  const handleRejectRequest = async (req) => {
    await updateShiftRequest(req.id, 'rejected');
    loadRequests();
  };

  const handleApproveOvertime = async (req) => {
    const currentValue = shifts[`${req.fromUserId}_${req.shiftDate}`] || '';
    const newValue = `${currentValue}+${req.overtimeHours}`;
    await setShiftForDate(req.fromUserId, req.shiftDate, newValue);
    await updateOvertimeRequest(req.id, 'approved');
    loadRequests();
    loadData();
  };

  const handleRejectOvertime = async (req) => {
    await updateOvertimeRequest(req.id, 'rejected');
    loadRequests();
  };

  const exportToExcel = () => {
    const data = [];
    for (const user of sortedUsers) {
      for (const day of monthDays) {
        const date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const value = shifts[`${user.id}_${date}`] || '';
        data.push({
          'Сотрудник': user.fullName,
          'Дата': date,
          'Значение': value
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'График смен');
    XLSX.writeFile(wb, `graph_${yearMonth}.xlsx`);
  };

  const handleImportData = async (rows) => {
    const newShifts = {};
    for (const row of rows) {
      const employeeName = row['Сотрудник'];
      const date = row['Дата'];
      const value = row['Значение'];
      const user = users.find(u => u.fullName === employeeName);
      if (user && date && value !== undefined) {
        newShifts[`${user.id}_${date}`] = value;
      }
    }
    if (Object.keys(newShifts).length === 0) {
      throw new Error('Не найдено соответствий. Проверьте имена сотрудников и даты.');
    }
    setEditedShifts(newShifts);
    alert(`Импортировано ${Object.keys(newShifts).length} записей. Нажмите "Сохранить график" для применения.`);
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const sortedUsers = [...users]
    .filter(u => departments.some(d => d.id === u.departmentId))
    .sort((a, b) => {
      const indexA = departments.findIndex(d => d.id === a.departmentId);
      const indexB = departments.findIndex(d => d.id === b.departmentId);
      return indexA - indexB;
    });

  const renderTable = () => {
    const headerWeekdays = (
      <tr key="weekdays">
        <th style={thStyle}>Сотрудник</th>
        {monthDays.map(day => (
          <th key={`wd_${day}`} style={thStyle}>{getWeekdayForDate(selectedYear, selectedMonth, day)}</th>
        ))}
      </tr>
    );
    const headerDates = (
      <tr key="dates">
        <th style={thStyle}>Дата</th>
        {monthDays.map(day => (
          <th key={`dt_${day}`} style={thStyle}>{day}</th>
        ))}
      </tr>
    );

    let currentDept = null;
    const bodyRows = [];
    for (const user of sortedUsers) {
      const deptName = departments.find(d => d.id === user.departmentId)?.name || user.departmentId;
      if (currentDept !== deptName) {
        currentDept = deptName;
        bodyRows.push(
          <tr key={`dept_${deptName}`}>
            <td colSpan={monthDays.length + 1} style={{ ...tdStyle, background: 'rgba(216,159,12,0.2)', fontWeight: 'bold', textAlign: 'center' }}>
              {deptName}
            </td>
          </tr>
        );
      }
      const cells = monthDays.map(day => {
        const date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isWeekendDay = isWeekend(selectedYear, selectedMonth, day);
        const value = getCellValue(user.id, date);
        const isEditing = editingCell && editingCell.userId === user.id && editingCell.date === date;
        return (
          <td
            key={`cell_${user.id}_${date}`}
            style={{
              ...tdStyle,
              backgroundColor: isWeekendDay ? 'rgba(216,159,12,0.2)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (isEditing) return;
              setEditingCell({ userId: user.id, date });
            }}
          >
            {isEditing ? (
              <input
                type="text"
                defaultValue={value}
                autoFocus
                onBlur={(e) => handleCellEdit(user.id, date, e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCellEdit(user.id, date, e.target.value);
                  }
                }}
                style={{ width: '90px', textAlign: 'center', background: '#11151E', color: 'white', border: '1px solid var(--border-light)' }}
              />
            ) : (
              value || ''
            )}
          </td>
        );
      });
      bodyRows.push(
        <tr key={`row_${user.id}`}>
          <td style={{ ...tdStyle, fontWeight: 'bold', background: 'rgba(255,255,255,0.08)' }}>{user.fullName}</td>
          {cells}
        </tr>
      );
    }
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {headerWeekdays}
            {headerDates}
          </thead>
          <tbody>
            {bodyRows}
          </tbody>
        </table>
      </div>
    );
  };

  const thStyle = {
    border: '1px solid var(--border-light)',
    padding: '8px',
    background: 'rgba(255,255,255,0.1)',
    textAlign: 'center'
  };
  const tdStyle = {
    border: '1px solid var(--border-light)',
    padding: '8px',
    textAlign: 'center'
  };

  if (loading) return <LoadingSpinner />;

  const hasPendingChanges = pendingChanges.length > 0;
  const hasEditedShifts = Object.keys(editedShifts).length > 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
          {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
        </select>

        {canEdit() && (
          <>
            <button className="secondary" onClick={exportToExcel}>📎 Экспорт графика</button>
            <button className="secondary" onClick={() => setShowImportModal(true)}>📂 Импорт графика</button>
            {hasEditedShifts && (
              <button className="primary" onClick={saveAllChanges} disabled={saving}>
                {saving ? 'Сохранение...' : '💾 Сохранить график'}
              </button>
            )}
          </>
        )}

        {!canEdit() && hasPendingChanges && (
          <>
            <button className="primary" onClick={sendChangeRequest}>📨 Отправить запрос на изменение графика</button>
            <button className="primary" onClick={sendOvertimeRequest}>⏱️ Отправить запрос на переработку</button>
          </>
        )}

        {canEdit() && (
          <>
            <button className="secondary" onClick={() => { loadRequests(); setShowRequests(!showRequests); }}>
              {showRequests ? 'Скрыть запросы на смены' : 'Показать запросы на смены'}
            </button>
            <button className="secondary" onClick={() => { loadRequests(); setShowOvertimeRequests(!showOvertimeRequests); }}>
              {showOvertimeRequests ? 'Скрыть запросы на переработки' : 'Показать запросы на переработки'}
            </button>
          </>
        )}
      </div>

      {showRequests && canEdit() && (
        <div style={{ marginBottom: 20, background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
          <h4>Запросы на изменение графика</h4>
          {requests.length === 0 ? <p>Нет запросов</p> : (
            requests.map(req => (
              <div key={req.id} style={{ borderBottom: '1px solid var(--border-light)', marginBottom: 10, padding: 10 }}>
                <p><strong>Сотрудник:</strong> {users.find(u => u.id === req.fromUserId)?.fullName}</p>
                <ul>
                  {req.proposedShifts.map((shift, idx) => {
                    const user = users.find(u => u.id === shift.userId);
                    return <li key={`${req.id}_${idx}`}>{user?.fullName} – {shift.date}: {shift.oldValue} → {shift.newValue}</li>;
                  })}
                </ul>
                <button className="success" onClick={() => handleApproveRequest(req)}>✅ Одобрить</button>
                <button className="danger" onClick={() => handleRejectRequest(req)}>❌ Отклонить</button>
              </div>
            ))
          )}
        </div>
      )}

      {showOvertimeRequests && canEdit() && (
        <div style={{ marginBottom: 20, background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
          <h4>Запросы на переработку</h4>
          {overtimeRequests.length === 0 ? <p>Нет запросов</p> : (
            overtimeRequests.map(req => (
              <div key={req.id} style={{ borderBottom: '1px solid var(--border-light)', marginBottom: 10, padding: 10 }}>
                <p><strong>Сотрудник:</strong> {users.find(u => u.id === req.fromUserId)?.fullName}</p>
                <p><strong>Дата:</strong> {req.shiftDate}</p>
                <p><strong>Текущее значение:</strong> {req.originalValue}</p>
                <p><strong>Переработка:</strong> +{req.overtimeHours} ч.</p>
                <p><strong>Новое значение:</strong> {req.originalValue}+{req.overtimeHours}</p>
                <button className="success" onClick={() => handleApproveOvertime(req)}>✅ Одобрить</button>
                <button className="danger" onClick={() => handleRejectOvertime(req)}>❌ Отклонить</button>
              </div>
            ))
          )}
        </div>
      )}

      {renderTable()}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportData}
        title="Графика смен"
        expectedColumns={['Сотрудник', 'Дата', 'Значение']}
        requiredColumns={['Сотрудник', 'Дата', 'Значение']}
        sampleTemplate={`Сотрудник,Дата,Значение\nИванов Иван,2025-04-01,Д\nПетрова Анна,2025-04-01,9-18`}
      />
    </div>
  );
}