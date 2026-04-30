import { useState, useEffect } from 'react';
import { getTasksByDateRange, getEvents, updateTask } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const periods = [
  { label: 'Сегодня', days: 0 },
  { label: 'Завтра', days: 1 },
  { label: 'Эта неделя', type: 'week' },
  { label: 'Этот месяц', type: 'month' }
];

export default function UpcomingView({ userId }) {
  const [period, setPeriod] = useState('week');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);
    if (period === 0) {
      end.setDate(start.getDate() + 1);
    } else if (period === 1) {
      start.setDate(today.getDate() + 1);
      end.setDate(today.getDate() + 2);
    } else if (period === 'week') {
      const day = today.getDay();
      const diffToMonday = (day === 0 ? 6 : day - 1);
      start.setDate(today.getDate() - diffToMonday);
      end.setDate(start.getDate() + 7);
    } else if (period === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
    }
    const formatLocal = (d) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    return { start: formatLocal(start), end: formatLocal(end) };
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const range = getDateRange();
      const [tasks, events] = await Promise.all([
        getTasksByDateRange(userId, range.start, range.end),
        getEvents(userId, range.start, range.end + 'T23:59:59')
      ]);
      const taskItems = tasks.map(t => ({
        id: t.id,
        title: t.title,
        date: t.dueDate,
        comment: t.comment,
        status: t.status,
        type: 'task',
        isHot: false
      }));
      const eventItems = events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.datetime,
        comment: e.comment,
        type: 'event',
        status: 'event'
      }));
      const combined = [...taskItems, ...eventItems];
      combined.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setItems(combined);
    } catch (err) {
      setError('Ошибка загрузки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = async (item) => {
    if (item.type !== 'task') return;
    try {
      const newStatus = item.status === 'done' ? 'active' : 'done';
      await updateTask(item.id, { status: newStatus });
      await loadData();
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (err) {
      setError('Ошибка изменения статуса');
    }
  };

  useEffect(() => {
    if (userId) loadData();
  }, [userId, period]);

  useEffect(() => {
    const handleUpdate = () => {
      if (userId) loadData();
    };
    window.addEventListener('tasks-updated', handleUpdate);
    return () => window.removeEventListener('tasks-updated', handleUpdate);
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="card" style={{ color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div className="card">
      <h2>📅 Предстоящие</h2>
      <div style={{ marginBottom: 15 }}>
        {periods.map(p => (
          <button
            key={p.label}
            className={period === (p.days !== undefined ? p.days : p.type) ? 'primary' : 'secondary'}
            onClick={() => setPeriod(p.days !== undefined ? p.days : p.type)}
            style={{ marginRight: 8 }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {items.length === 0 && <p>Нет задач и событий в выбранный период</p>}
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {items.map(item => (
          <li key={`${item.type}_${item.id}`} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '8px' }}>
            <span 
              style={{ 
                flex: 1, 
                cursor: item.type === 'task' ? 'pointer' : 'default',
                textDecoration: item.status === 'done' ? 'line-through' : 'none',
                color: item.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)'
              }}
              onClick={() => item.type === 'task' && toggleDone(item)}
            >
              {item.type === 'task' ? '✅ ' : '🗓️ '}
              {item.title}
              {item.date && <small> ({item.type === 'task' ? 'до ' + item.date : new Date(item.date).toLocaleString()})</small>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}