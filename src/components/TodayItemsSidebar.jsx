import { useState, useEffect } from 'react';
import { getTasks, updateTask, deleteTask, getEventsByDate, deleteEvent } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function TodayItemsSidebar({ userId, onAddClick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [tasks, events] = await Promise.all([
        getTasks(userId, 'today'),
        getEventsByDate(userId, today)
      ]);
      const taskItems = tasks.map(t => ({
        id: t.id,
        title: t.title,
        type: 'task',
        status: t.status,
        date: t.dueDate
      }));
      const eventItems = events.map(e => ({
        id: e.id,
        title: e.title,
        type: 'event',
        date: e.datetime,
        status: 'event'
      }));
      const combined = [...taskItems, ...eventItems];
      combined.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setItems(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('tasks-updated', handleUpdate);
    const interval = setInterval(loadItems, 60000);
    return () => {
      window.removeEventListener('tasks-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [userId]);

  const toggleDone = async (item) => {
    if (item.type !== 'task') return;
    const newStatus = item.status === 'done' ? 'active' : 'done';
    await updateTask(item.id, { status: newStatus });
    loadItems();
    window.dispatchEvent(new Event('tasks-updated'));
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Удалить ${item.type === 'task' ? 'задачу' : 'событие'}?`)) {
      if (item.type === 'task') {
        await deleteTask(item.id);
      } else {
        await deleteEvent(item.id);
      }
      loadItems();
      window.dispatchEvent(new Event('tasks-updated'));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ width: '280px', flexShrink: 0 }}>
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>📅 Сегодня</h3>
          <button className="primary" onClick={onAddClick} style={{ padding: '4px 8px', fontSize: '12px' }}>+</button>
        </div>
        {items.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Нет событий и задач</p>}
        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          {items.map(item => (
            <li key={`${item.type}_${item.id}`} style={{ 
              marginBottom: '8px', 
              borderBottom: '1px solid var(--border-light)', 
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem'
            }}>
              <span style={{ 
                textDecoration: item.type === 'task' && item.status === 'done' ? 'line-through' : 'none',
                flex: 1,
                cursor: item.type === 'task' ? 'pointer' : 'default'
              }} onClick={() => item.type === 'task' && toggleDone(item)}>
                {item.type === 'task' ? '✅ ' : '🗓️ '}{item.title}
              </span>
              {item.type === 'task' && (
                <button className="secondary" onClick={() => toggleDone(item)} style={{ padding: '2px 6px', fontSize: '12px' }}>✅</button>
              )}
              <button className="danger" onClick={() => handleDelete(item)} style={{ padding: '2px 6px', fontSize: '12px' }}>🗑️</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}