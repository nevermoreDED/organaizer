import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  getShiftsByMonth, setShiftForDate, createShiftRequest,
  getShiftRequestsForManager, updateShiftRequest, getAllUsers,
  saveShiftsBatch, createOvertimeRequest, getOvertimeRequestsForManager,
  updateOvertimeRequest, addLog, updateUsersOrder
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import ImportModal from './ImportModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const departments = [
  { id: 'dept1', name: 'Логистика' },
  { id: 'dept3', name: 'Бухгалтерия' },
  { id: 'dept4', name: 'Бронирование' },
  { id: 'dept5', name: 'Качество' }
];

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const SortableRow = ({ user, children, isEditing }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isEditing ? 'grab' : 'default',
  };

  return (
    <tr ref={setNodeRef} style={style} {...(isEditing ? attributes : {})} {...(isEditing ? listeners : {})}>
      {children}
    </tr>
  );
};

export default function Schedule({ currentUser }) {
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
  const [workingNow, setWorkingNow] = useState([]);
  const [isLightTheme, setIsLightTheme] = useState(document.body.classList.contains('light-theme'));
  const [sortedUsers, setSortedUsers] = useState([]);
  const [showFillModal, setShowFillModal] = useState(false);
  const [fillEmployeeId, setFillEmployeeId] = useState('');
  const [fillValue, setFillValue] = useState('');
  const [fillEmployeesList, setFillEmployeesList] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const canEdit = () => currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.isIT === true;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.body.classList.contains('light-theme'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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
      const filteredUsers = allUsers.filter(u => u.role !== 'admin' && u.departmentId !== 'dept2');
      const sorted = filteredUsers.sort((a, b) => {
        const indexA = departments.findIndex(d => d.id === a.departmentId);
        const indexB = departments.findIndex(d => d.id === b.departmentId);
        if (indexA !== indexB) return indexA - indexB;
        const orderA = a.order !== undefined ? a.order : 9999;
        const orderB = b.order !== undefined ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.fullName.localeCompare(b.fullName);
      });
      setSortedUsers(sorted);
      setEditedShifts({});
      setPendingChanges([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkingNow = async () => {
    try {
      const allUsers = await getAllUsers();
      const yearMonthNow = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const shiftsData = await getShiftsByMonth(yearMonthNow);
      const shiftsMap = {};
      shiftsData.forEach(s => { shiftsMap[`${s.userId}_${s.date}`] = s.value; });
      const novosibirskTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Novosibirsk' }));
      const today = novosibirskTime.toISOString().split('T')[0];
      const currentHour = novosibirskTime.getHours();
      const currentMinute = novosibirskTime.getMinutes();
      const working = [];
      for (const u of allUsers) {
        if (u.role === 'admin' || u.departmentId === 'dept2') continue;
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
    }
  };

  useEffect(() => {
    loadData();
    loadWorkingNow();
    const interval = setInterval(loadWorkingNow, 3600000);
    return () => clearInterval(interval);
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
      await addLog(currentUser.id, currentUser.fullName, 'Сохранение графика', `Месяц: ${yearMonth}, изменено ${entries.length} ячеек`);
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
    await addLog(currentUser.id, currentUser.fullName, 'Запрос на изменение графика', `Месяц: ${yearMonth}, изменено ${pendingChanges.length} ячеек`);
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
    await addLog(currentUser.id, currentUser.fullName, 'Запрос на переработку', `Месяц: ${yearMonth}, отправлено ${pendingChanges.length} запросов`);
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
    await addLog(currentUser.id, currentUser.fullName, 'Одобрение запроса на смену', `Запрос от ${users.find(u => u.id === req.fromUserId)?.fullName}`);
    loadRequests();
    loadData();
  };

  const handleRejectRequest = async (req) => {
    await updateShiftRequest(req.id, 'rejected');
    await addLog(currentUser.id, currentUser.fullName, 'Отклонение запроса на смену', `Запрос от ${users.find(u => u.id === req.fromUserId)?.fullName}`);
    loadRequests();
    loadData();
  };

  const handleApproveOvertime = async (req) => {
    const currentValue = shifts[`${req.fromUserId}_${req.shiftDate}`] || '';
    const newValue = `${currentValue}+${req.overtimeHours}`;
    await setShiftForDate(req.fromUserId, req.shiftDate, newValue);
    await updateOvertimeRequest(req.id, 'approved');
    await addLog(currentUser.id, currentUser.fullName, 'Одобрение переработки', `${users.find(u => u.id === req.fromUserId)?.fullName}, +${req.overtimeHours}ч`);
    loadRequests();
    loadData();
  };

  const handleRejectOvertime = async (req) => {
    await updateOvertimeRequest(req.id, 'rejected');
    await addLog(currentUser.id, currentUser.fullName, 'Отклонение переработки', `${users.find(u => u.id === req.fromUserId)?.fullName}, +${req.overtimeHours}ч`);
    loadRequests();
    loadData();
  };

  const exportToExcel = async () => {
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
    await addLog(currentUser.id, currentUser.fullName, 'Экспорт графика', `Месяц: ${yearMonth}`);
  };

  const handleImportData = async (rows) => {
    const newShifts = {};
    for (const row of rows) {
      const employeeName = row['Сотрудник'];
      const date = row['Дата'];
      const value = row['Значение'];
      const user = sortedUsers.find(u => u.fullName === employeeName);
      if (user && date && value !== undefined) {
        newShifts[`${user.id}_${date}`] = value;
      }
    }
    if (Object.keys(newShifts).length === 0) {
      throw new Error('Не найдено соответствий. Проверьте имена сотрудников и даты.');
    }
    setEditedShifts(newShifts);
    await addLog(currentUser.id, currentUser.fullName, 'Импорт графика', `Импортировано ${Object.keys(newShifts).length} записей`);
    alert(`Импортировано ${Object.keys(newShifts).length} записей. Нажмите "Сохранить график" для применения.`);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const activeUser = sortedUsers.find(u => u.id === active.id);
      const overUser = sortedUsers.find(u => u.id === over.id);
      if (activeUser && overUser && activeUser.departmentId === overUser.departmentId) {
        const oldIndex = sortedUsers.findIndex(u => u.id === active.id);
        const newIndex = sortedUsers.findIndex(u => u.id === over.id);
        const newOrder = arrayMove(sortedUsers, oldIndex, newIndex);
        setSortedUsers(newOrder);
        const deptUsers = newOrder.filter(u => u.departmentId === activeUser.departmentId);
        await updateUsersOrder(deptUsers);
        await addLog(currentUser.id, currentUser.fullName, 'Изменение порядка сотрудников', `Отдел: ${activeUser.departmentId}`);
      } else if (activeUser && overUser) {
        alert('Нельзя перемещать сотрудников между разными отделами');
      }
    }
  };

  const openFillModal = () => {
    let employees = [];
    if (currentUser.role === 'admin' || currentUser.isIT) {
      employees = sortedUsers;
    } else {
      employees = sortedUsers.filter(u => u.departmentId === currentUser.departmentId);
    }
    setFillEmployeesList(employees);
    setFillEmployeeId('');
    setFillValue('');
    setShowFillModal(true);
  };

  const handleFillMonth = async () => {
    if (!fillEmployeeId || !fillValue) {
      alert('Выберите сотрудника и укажите значение');
      return;
    }
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const newShifts = { ...editedShifts };
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isWeekendDay = isWeekend(selectedYear, selectedMonth, day);
      if (!isWeekendDay) {
        newShifts[`${fillEmployeeId}_${date}`] = fillValue;
      }
    }
    setEditedShifts(newShifts);
    setShowFillModal(false);
    alert(`Для выбранного сотрудника заполнены будние дни значением "${fillValue}". Не забудьте сохранить график.`);
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const borderColor = isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.03)';
  const monthBg = isLightTheme ? '#A2C5E5' : 'rgba(162,197,229,0.12)';
  const weekdayBg = isLightTheme ? '#D6EBCE' : 'rgba(214,235,206,0.08)';
  const deptBg = isLightTheme ? '#B6E1CD' : 'rgba(182,225,205,0.1)';
  const weekendBg = isLightTheme ? 'rgba(249,115,22,0.35)' : 'rgba(249,115,22,0.15)';
  const defaultCellBg = isLightTheme ? 'rgba(214,235,206,0.2)' : 'rgba(214,235,206,0.03)';
  const textColor = isLightTheme ? '#000' : 'var(--text-primary)';

  const thStyle = {
    border: `1px solid ${borderColor}`,
    padding: '8px',
    backgroundColor: weekdayBg,
    color: textColor,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap'
  };
  const tdStyle = {
    border: `1px solid ${borderColor}`,
    padding: '8px',
    textAlign: 'center',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap'
  };

  const renderTable = () => {
    // Строка с названием месяца (будет в начале)
    const monthRow = (
      <tr key="month">
        <td colSpan={monthDays.length + 1} style={{ backgroundColor: monthBg, color: textColor, padding: '4px', textAlign: 'center', border: `1px solid ${borderColor}`, fontWeight: 'bold' }}>
          {monthNames[selectedMonth]} {selectedYear}
        </td>
      </tr>
    );

    // Шапка для дней недели (первая ячейка пустая)
    const weekdaysRow = (
      <tr key="weekdays">
        <th style={thStyle}></th>
        {monthDays.map(day => (
          <th key={`wd_${day}`} style={thStyle}>{getWeekdayForDate(selectedYear, selectedMonth, day)}</th>
        ))}
      </tr>
    );

    // Шапка для дат (первая ячейка пустая)
    const datesRow = (
      <tr key="dates">
        <th style={thStyle}></th>
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
            <td colSpan={monthDays.length + 1} style={{ backgroundColor: deptBg, color: textColor, fontWeight: 'bold', padding: '4px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
              {deptName}
            </td>
          </tr>
        );
        // Добавляем строки с днями недели и датами после названия отдела
        bodyRows.push(weekdaysRow);
        bodyRows.push(datesRow);
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
              backgroundColor: isWeekendDay ? weekendBg : defaultCellBg,
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
                style={{ width: '100%', textAlign: 'center', background: 'var(--bg-card)', color: 'var(--text-primary)', border: `1px solid ${borderColor}`, borderRadius: '4px', fontSize: '0.65rem', padding: '2px' }}
              />
            ) : (
              value || ''
            )}
          </td>
        );
      });

      bodyRows.push(
        <SortableRow key={user.id} user={user} isEditing={canEdit()}>
          <td style={{ ...tdStyle, fontWeight: 'bold', background: 'rgba(255,255,255,0.05)' }}>{user.fullName}</td>
          {cells}
        </SortableRow>
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedUsers.map(u => u.id)}
          strategy={verticalListSortingStrategy}
        >
          <table style={{ width: 'max-content', borderCollapse: 'collapse' }}>
            <thead>
              {monthRow}
            </thead>
            <tbody>
              {bodyRows}
            </tbody>
        </table>
        </SortableContext>
      </DndContext>
    );
  };

  if (loading) return <LoadingSpinner />;

  const hasPendingChanges = pendingChanges.length > 0;
  const hasEditedShifts = Object.keys(editedShifts).length > 0;

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="card" style={{ display: 'inline-block', padding: '20px', width: 'max-content', boxSizing: 'border-box', textAlign: 'left' }}>
        <h2>⏰ Сейчас работают (Новосибирск)</h2>
        {workingNow.length === 0 ? <p>Никто не работает в данный момент</p> : (
          <ul>
            {workingNow.map(name => <li key={name}>{name}</li>)}
          </ul>
        )}

        <h2 style={{ marginTop: '20px' }}>📅 График смен</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {monthNames.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
          </select>

          {canEdit() && (
            <>
              <button className="secondary" onClick={exportToExcel}>📎 Экспорт</button>
              <button className="secondary" onClick={() => setShowImportModal(true)}>📂 Импорт</button>
              <button className="secondary" onClick={openFillModal}>📋 Заполнить 5/2</button>
              {hasEditedShifts && (
                <button className="primary" onClick={saveAllChanges} disabled={saving}>
                  {saving ? 'Сохранение...' : '💾 Сохранить'}
                </button>
              )}
            </>
          )}

          {!canEdit() && hasPendingChanges && (
            <>
              <button className="primary" onClick={sendChangeRequest}>📨 Изменить график</button>
              <button className="primary" onClick={sendOvertimeRequest}>⏱️ Переработка</button>
            </>
          )}

          {canEdit() && (
            <>
              <button className="secondary" onClick={() => { loadRequests(); setShowRequests(!showRequests); }}>
                {showRequests ? 'Скрыть смены' : 'Запросы смен'}
              </button>
              <button className="secondary" onClick={() => { loadRequests(); setShowOvertimeRequests(!showOvertimeRequests); }}>
                {showOvertimeRequests ? 'Скрыть переработки' : 'Запросы переработок'}
              </button>
            </>
          )}
        </div>

        {showRequests && canEdit() && (
          <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
            <h4>Запросы на изменение графика</h4>
            {requests.length === 0 ? <p>Нет запросов</p> : (
              requests.map(req => (
                <div key={req.id} style={{ borderBottom: `1px solid ${borderColor}`, marginBottom: 8, padding: 8 }}>
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
          <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 }}>
            <h4>Запросы на переработку</h4>
            {overtimeRequests.length === 0 ? <p>Нет запросов</p> : (
              overtimeRequests.map(req => (
                <div key={req.id} style={{ borderBottom: `1px solid ${borderColor}`, marginBottom: 8, padding: 8 }}>
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

        {showFillModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Заполнить будние дни по шаблону 5/2</h3>
              <select value={fillEmployeeId} onChange={e => setFillEmployeeId(e.target.value)}>
                <option value="">Выберите сотрудника</option>
                {fillEmployeesList.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({departments.find(d => d.id === emp.departmentId)?.name})</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Значение (например, 9-18 или Д)"
                value={fillValue}
                onChange={e => setFillValue(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15 }}>
                <button className="primary" onClick={handleFillMonth}>Заполнить</button>
                <button className="secondary" onClick={() => setShowFillModal(false)}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}