import { useState, useEffect } from 'react';
import { getTasks, addTask, updateTask, deleteTask } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import { formatDate } from '../utils/dateUtils';

export default function TaskList({ userId, filter }) {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const loadTasks = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getTasks(userId, filter);
      const today = todayStr();
      const enriched = data.map(task => ({
        ...task,
        isHot: task.status !== 'done' && task.dueDate && (task.dueDate < today || task.dueDate === today)
      }));
      const sorted = enriched.sort((a, b) => {
        if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
      setTasks(sorted);
    } catch (err) {
      setError('Ошибка загрузки задач: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [userId, filter]);

  useEffect(() => {
    const handleUpdate = () => loadTasks();
    window.addEventListener('tasks-updated', handleUpdate);
    return () => window.removeEventListener('tasks-updated', handleUpdate);
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    let dueDate = null;
    if (filter === 'today') {
      dueDate = todayStr();
    } else {
      dueDate = newDue || null;
    }
    try {
      await addTask({
        userId,
        title: newTitle.trim(),
        dueDate,
        status: 'active'
      });
      setNewTitle('');
      setNewDue('');
      await loadTasks();
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (err) {
      setError('Ошибка добавления: ' + err.message);
    }
  };

  const toggleDone = async (task) => {
    try {
      const newStatus = task.status === 'done' ? 'active' : 'done';
      await updateTask(task.id, { status: newStatus });
      await loadTasks();
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (err) {
      setError('Ошибка изменения статуса');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить задачу?')) {
      try {
        await deleteTask(id);
        await loadTasks();
        window.dispatchEvent(new Event('tasks-updated'));
      } catch (err) {
        setError('Ошибка удаления');
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="card" style={{ color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <div className="card">
      <h2>{filter === 'today' ? '📌 Сегодня' : '📅 Предстоящие / долгосрочные'}</h2>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Новая задача"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          style={{ flex: 2 }}
        />
        {filter !== 'today' && (
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            style={{ flex: 1 }}
          />
        )}
        <button className="primary" onClick={handleAdd}>➕ Добавить</button>
      </div>
      {tasks.length === 0 && <p>Нет задач</p>}
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {tasks.map(task => (
          <li
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: task.isHot ? 'rgba(255, 152, 0, 0.2)' : 'transparent',
              borderLeft: task.isHot ? '4px solid #ff9800' : 'none'
            }}
          >
            <span
              style={{
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                flex: 1,
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
              onClick={() => toggleDone(task)}
            >
               {task.title} {task.dueDate && <small>(до {formatDate(task.dueDate)})</small>}
            </span>
            <button className="secondary" onClick={() => toggleDone(task)}>✅</button>
            <button className="secondary" onClick={() => handleDelete(task.id)}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}