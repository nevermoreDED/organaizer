import { useState, useEffect } from 'react';
import { getAllLogs } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import { formatDateTime } from '../utils/dateUtils';

export default function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAllLogs();
      setLogs(data);
    } catch (err) {
      console.error('Ошибка загрузки логов:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log =>
    log.userName?.toLowerCase().includes(filter.toLowerCase()) ||
    log.action?.toLowerCase().includes(filter.toLowerCase()) ||
    log.details?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="restricted-card">
      <h2>📋 Журнал действий</h2>
      <input
        type="text"
        placeholder="🔍 Поиск по пользователю, действию или деталям"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ width: '100%', marginBottom: '15px', padding: '8px' }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
              <th>Дата/время</th><th>Пользователь</th><th>Действие</th><th>Детали</th><th>IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(new Date(log.timestamp?.toDate()))}</td>
                <td>{log.userName}</td>
                <td>{log.action}</td>
                <td>{log.details}</td>
                <td>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}