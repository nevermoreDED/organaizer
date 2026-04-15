import { useState, useEffect } from 'react';
import { getContracts, addContract, updateContract, deleteContract, getExpiringContracts } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const statuses = [
  { value: 'draft', label: 'Черновик', color: '#6c757d' },
  { value: 'negotiation', label: 'На согласовании', color: '#ffc107' },
  { value: 'sent_edo', label: 'Отправлен по ЭДО', color: '#0d6efd' },
  { value: 'waiting_sign', label: 'Ожидает подписания', color: '#17a2b8' },
  { value: 'signed', label: 'Подписан', color: '#28a745' },
  { value: 'expired', label: 'Просрочен', color: '#dc3545' }
];

const getAutoStatus = (contract) => {
  if (!contract.endDate) return contract.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(contract.endDate);
  endDate.setHours(0, 0, 0, 0);
  if (endDate < today && contract.status !== 'expired') {
    return 'expired';
  }
  return contract.status;
};

export default function Development({ userId, departmentId }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentContract, setCurrentContract] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCounterparty, setFilterCounterparty] = useState('');
  const [expiring, setExpiring] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allContracts = await getContracts(userId, departmentId);
      let updated = false;
      const updatedContracts = await Promise.all(allContracts.map(async (c) => {
        const newStatus = getAutoStatus(c);
        if (newStatus !== c.status) {
          updated = true;
          await updateContract(c.id, { status: newStatus });
          return { ...c, status: newStatus };
        }
        return c;
      }));
      const finalContracts = updated ? await getContracts(userId, departmentId) : updatedContracts;
      setContracts(finalContracts);
      const expiringContracts = await getExpiringContracts(userId, 30);
      setExpiring(expiringContracts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 21600000);
    return () => clearInterval(interval);
  }, [userId, departmentId]);

  const handleSave = async () => {
    if (!currentContract.title || !currentContract.counterparty) return;
    try {
      const dataToSave = { ...currentContract };
      if (dataToSave.endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(dataToSave.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < today) {
          dataToSave.status = 'expired';
        }
      }
      if (currentContract.id) {
        await updateContract(currentContract.id, dataToSave);
      } else {
        await addContract({ ...dataToSave, userId });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Ошибка сохранения договора');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить договор?')) {
      await deleteContract(id);
      loadData();
    }
  };

  const openEdit = (contract = null) => {
    setCurrentContract(contract || {
      title: '',
      counterparty: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      notes: ''
    });
    setShowModal(true);
  };

  const filteredContracts = contracts.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterCounterparty && !c.counterparty.toLowerCase().includes(filterCounterparty.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card">
      <h2>📄 Развитие – Договорная работа</h2>

      {expiring.length > 0 && (
        <div style={{ background: 'rgba(255,193,7,0.2)', borderLeft: '4px solid #ffc107', padding: 12, marginBottom: 20, borderRadius: 8 }}>
          <strong>⚠️ Внимание!</strong> У следующих договоров истекает срок в ближайшие 30 дней:
          <ul>
            {expiring.map(c => (
              <li key={c.id}>{c.title} – {c.counterparty} (до {c.endDate})</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: 15, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Поиск по контрагенту"
          value={filterCounterparty}
          onChange={e => setFilterCounterparty(e.target.value)}
        />
        <button className="primary" onClick={() => openEdit()}>➕ Добавить договор</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Название</th><th>Контрагент</th><th>Дата начала</th><th>Дата окончания</th><th>Статус</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(c => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{c.counterparty}</td>
                <td>{c.startDate || ''}</td>
                <td>{c.endDate || ''}</td>
                <td style={{ color: statuses.find(s => s.value === c.status)?.color }}>
                  {statuses.find(s => s.value === c.status)?.label}
                </td>
                <td>
                  <button className="secondary" onClick={() => openEdit(c)}>✏️</button>
                  <button className="danger" onClick={() => handleDelete(c.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{currentContract?.id ? 'Редактировать договор' : 'Новый договор'}</h3>
            <input type="text" placeholder="Название договора" value={currentContract.title} onChange={e => setCurrentContract({...currentContract, title: e.target.value})} />
            <input type="text" placeholder="Контрагент" value={currentContract.counterparty} onChange={e => setCurrentContract({...currentContract, counterparty: e.target.value})} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="date" placeholder="Дата начала" value={currentContract.startDate || ''} onChange={e => setCurrentContract({...currentContract, startDate: e.target.value})} />
              <input type="date" placeholder="Дата окончания" value={currentContract.endDate || ''} onChange={e => setCurrentContract({...currentContract, endDate: e.target.value})} />
            </div>
            <select value={currentContract.status} onChange={e => setCurrentContract({...currentContract, status: e.target.value})}>
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <textarea placeholder="Примечания" rows="3" value={currentContract.notes || ''} onChange={e => setCurrentContract({...currentContract, notes: e.target.value})} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={handleSave}>Сохранить</button>
              <button className="secondary" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}