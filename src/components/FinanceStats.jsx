import { useState, useEffect } from 'react';
import { getTotalPayments, getTotalPlan, getTotalPrepaymentsAmount, getDrivers, getCustomers } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function FinanceStats({ userId }) {
  const [stats, setStats] = useState({ paymentsTotal: 0, planTotal: 0, prepaymentsTotal: 0 });
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [paymentsTotal, planTotal, prepaymentsTotal] = await Promise.all([
        getTotalPayments(userId, selectedDriver || null, dateFrom || null, dateTo || null),
        getTotalPlan(userId, null, null),
        getTotalPrepaymentsAmount(userId, selectedCustomer || null)
      ]);
      setStats({
        paymentsTotal: paymentsTotal.total,
        planTotal: planTotal.total,
        prepaymentsTotal: prepaymentsTotal.total
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    loadCustomers();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedDriver, selectedCustomer, dateFrom, dateTo]);

  const loadDrivers = async () => {
    const data = await getDrivers(userId);
    setDrivers(data);
  };

  const loadCustomers = async () => {
    const data = await getCustomers(userId);
    setCustomers(data);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3>📊 Сводная статистика</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginBottom: 15 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong>💰 Оплаты исполнителям:</strong> {stats.paymentsTotal.toLocaleString()} руб.
          <div style={{ fontSize: 12, marginTop: 5 }}>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} style={{ width: '100%' }}>
              <option value="">Все исполнители</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="с" style={{ width: '50%' }} />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="по" style={{ width: '50%' }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <strong>📅 План оплат (всего):</strong> {stats.planTotal.toLocaleString()} руб.
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong>💸 Предоплаты от заказчиков:</strong> {stats.prepaymentsTotal.toLocaleString()} руб.
          <div style={{ fontSize: 12, marginTop: 5 }}>
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ width: '100%' }}>
              <option value="">Все заказчики</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}