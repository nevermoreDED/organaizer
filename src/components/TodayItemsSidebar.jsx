import { useState, useEffect } from 'react';
import { getTasks, updateTask, deleteTask, getEventsByDate, deleteEvent, getAssignmentsReceived, updateAssignment } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function TodayItemsSidebar({ userId, departmentId, onAddClick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const loadItems = async () => {
    if (!userId) {
      console.log('[TodaySidebar] No userId, skipping load');
      return;
    }
    setLoading(true);
    try {
      const today = getLocalDate();
      console.log('[TodaySidebar] Loading for date:', today);
      const [tasks, events, assignments] = await Promise.all([
        getTasks(userId, 'today'),
        getEventsByDate(userId, today),
        departmentId ? getAssignmentsReceived(userId, departmentId) : Promise.resolve([])
      ]);
      console.log('[TodaySidebar] Tasks found:', tasks.length, 'Events:', events.length, 'Assignments:', assignments.length);
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
      const assignmentItems = assignments
        .filter(a => a.deadline === today)
        .map(a => ({
          id: a.id,
          title: a.title,
          type: 'assignment',
          status: a.status,
          date: a.deadline
        }));
      const combined = [...taskItems, ...eventItems, ...assignmentItems];
      combined.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      console.log('[TodaySidebar] Combined items:', combined.length);
      setItems(combined);
    } catch (err) {
      console.error('[TodaySidebar] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('tasks-updated', handleUpdate);
    window.addEventListener('assignments-updated', handleUpdate);

    return () => {
      window.removeEventListener('tasks-updated', handleUpdate);
      window.removeEventListener('assignments-updated', handleUpdate);
    };
  }, [userId, departmentId]);

  const toggleDone = async (item) => {
    if (item.type === 'task') {
      const newStatus = item.status === 'done' ? 'active' : 'done';
      await updateTask(item.id, { status: newStatus });
      window.dispatchEvent(new Event('tasks-updated'));
    } else if (item.type === 'assignment') {
      const newStatus = item.status === 'done' ? 'new' : 'done';
      await updateAssignment(item.id, { status: newStatus });
      window.dispatchEvent(new Event('assignments-updated'));
    }
    loadItems();
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
                textDecoration: (item.type === 'task' || item.type === 'assignment') && item.status === 'done' ? 'line-through' : 'none',
                flex: 1,
                cursor: (item.type === 'task' || item.type === 'assignment') ? 'pointer' : 'default'
              }} onClick={() => (item.type === 'task' || item.type === 'assignment') && toggleDone(item)}>
                {item.type === 'task' ? '✅ ' : item.type === 'assignment' ? '📋 ' : '🗓️ '}{item.title}
              </span>
              {(item.type === 'task' || item.type === 'assignment') && (
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