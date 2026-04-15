import { useState, useEffect } from 'react';
import { getAllPrepayments, updatePrepayment, getCustomers } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function PrepaymentsList({ userId }) {
  const [prepayments, setPrepayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPrepayments, allCustomers] = await Promise.all([
        getAllPrepayments(userId),
        getCustomers(userId)
      ]);
      setPrepayments(allPrepayments);
      setCustomers(allCustomers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleStatusChange = async (id, newStatus) => {
    await updatePrepayment(id, { status: newStatus });
    loadData();
  };

  const handleAmountChange = async (id, newAmount) => {
    await updatePrepayment(id, { amount: parseFloat(newAmount) || 0 });
    loadData();
  };

  const filtered = prepayments.filter(p => {
    if (filterCustomer && !p.orderId?.toLowerCase().includes(filterCustomer.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>📋 Список предоплат от заказчиков</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Фильтр по заказчику (ID или имя)"
          value={filterCustomer}
          onChange={e => setFilterCustomer(e.target.value)}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="no">Нет</option>
          <option value="partial">Частично</option>
          <option value="yes">Получена</option>
        </select>
        <button onClick={() => { setFilterCustomer(''); setFilterStatus(''); }}>Сбросить</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
        <thead>
          <tr style={{ background: '#f2f2f2' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Заказ (ID)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Сумма (руб.)</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Статус</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Дата создания</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{p.orderId}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                <input
                  type="number"
                  value={p.amount || 0}
                  onChange={e => handleAmountChange(p.id, e.target.value)}
                  style={{ width: '100px', textAlign: 'right' }}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)}>
                  <option value="no">Нет</option>
                  <option value="partial">Частично</option>
                  <option value="yes">Получена</option>
                </select>
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(p.createdAt?.toDate()).toLocaleDateString()}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                <button onClick={() => handleStatusChange(p.id, p.status === 'yes' ? 'no' : 'yes')}>🔄</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}