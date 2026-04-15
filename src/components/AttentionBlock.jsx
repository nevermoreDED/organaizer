import { useState, useEffect } from 'react';
import { getAttentionBlock } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function AttentionBlock({ userId, departmentId }) {
  const [attention, setAttention] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAttention = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getAttentionBlock(userId, departmentId);
      setAttention(data);
    } catch (err) {
      setError('Не удалось загрузить блок внимания');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttention();
    const interval = setInterval(loadAttention, 30000);
    return () => clearInterval(interval);
  }, [userId, departmentId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="card" style={{ background: 'rgba(172,52,27,0.2)', color: 'var(--text-primary)' }}>{error}</div>;
  if (!attention) return null;

  const allItems = [
    ...attention.overdueTasks.map(t => ({ ...t, typeText: 'Просроченная задача' })),
    ...attention.todayTasks.map(t => ({ ...t, typeText: 'Задача на сегодня' })),
    ...attention.overdueAssignments.map(a => ({ ...a, typeText: 'Просроченное поручение' })),
    ...attention.todayAssignments.map(a => ({ ...a, typeText: 'Поручение на сегодня' })),
  ];

  if (allItems.length === 0) {
    return (
      <div className="success-message" style={{ background: 'rgba(40,167,69,0.2)', borderLeft: '4px solid #28a745', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
        ✅ Всё в порядке! Нет срочных задач или поручений.
      </div>
    );
  }

  return (
    <div className="card" style={{ background: 'rgba(255,193,7,0.15)', borderLeft: '4px solid #ffc107' }}>
      <h3>🔔 Требует внимания</h3>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {allItems.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 4, animation: 'flicker 1.5s infinite' }}>
            <strong>{item.typeText}:</strong> {item.title || item.text}
          </li>
        ))}
      </ul>
      <style>
        {`
          @keyframes flicker {
            0% { text-shadow: 0 0 0 rgba(255, 152, 0, 0); }
            50% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.8); }
            100% { text-shadow: 0 0 0 rgba(255, 152, 0, 0); }
          }
        `}
      </style>
    </div>
  );
}