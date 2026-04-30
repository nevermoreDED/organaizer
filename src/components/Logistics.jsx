import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  getPaymentsToDrivers, addPaymentToDriver, updatePaymentToDriver, deletePaymentToDriver,
  getPaymentPlan, addPaymentPlanItem, updatePaymentPlanItem, deletePaymentPlanItem,
  setPrepayment, getPhotosByDriver, addPhoto, deletePhoto,
  getDrivers, addDriver, deleteDriver, updateDriver,
  getCustomers, addCustomer, deleteCustomer,
  addLog
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';
import FinanceStats from './FinanceStats';
import PrepaymentsList from './PrepaymentsList';
import ImportModal from './ImportModal';
import { formatDate } from '../utils/dateUtils';

export default function Logistics({ userId, currentUser }) {
  const [activeTab, setActiveTab] = useState('finance');
  const [payments, setPayments] = useState([]);
  const [plan, setPlan] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [photos, setPhotos] = useState([]);
  const [newPhoto, setNewPhoto] = useState(null);
  const [newDriverName, setNewDriverName] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPrepaymentModal, setShowPrepaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ driverId: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [newPlanItem, setNewPlanItem] = useState({ description: '', amount: '', dueDate: '' });
  const [newPrepayment, setNewPrepayment] = useState({ orderId: '', amount: '', status: 'no' });
  const [showImportDrivers, setShowImportDrivers] = useState(false);
  const [showImportCustomers, setShowImportCustomers] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [searchName, setSearchName] = useState('');
  const [uniqueCities, setUniqueCities] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueActive, setUniqueActive] = useState([]);
  const [editingDriver, setEditingDriver] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', contact: '', email: '', city: '', category: '', active: true });

  const weekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    return monday.toISOString().split('T')[0];
  };

  const loadDrivers = async () => {
    const data = await getDrivers(userId);
    const sanitized = data.map(d => ({ ...d, name: d.name || '' }));
    setDrivers(sanitized);
    const cities = [...new Set(sanitized.map(d => d.city).filter(Boolean))];
    const categories = [...new Set(sanitized.map(d => d.category).filter(Boolean))];
    const actives = [...new Set(sanitized.map(d => (d.active ? 'Активен' : 'Не активен')).filter(Boolean))];
    setUniqueCities(cities);
    setUniqueCategories(categories);
    setUniqueActive(actives);
  };

  const loadCustomers = async () => {
    const data = await getCustomers(userId);
    setCustomers(data);
  };

  const loadFinance = async () => {
    setLoading(true);
    try {
      const [pays, planData] = await Promise.all([
        getPaymentsToDrivers(userId),
        getPaymentPlan(userId, weekStart())
      ]);
      setPayments(pays);
      setPlan(planData);
    } catch (err) {
      setError('Ошибка загрузки финансов: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!selectedDriver) return;
    setLoading(true);
    try {
      const data = await getPhotosByDriver(userId, selectedDriver);
      setPhotos(data);
    } catch (err) {
      setError('Ошибка загрузки фото: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    loadCustomers();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'finance') loadFinance();
    if (activeTab === 'photo') loadPhotos();
  }, [activeTab, selectedDriver]);

  const handleAddPayment = async () => {
    if (!newPayment.driverId || !newPayment.amount) return;
    const driver = drivers.find(d => d.id === newPayment.driverId);
    await addPaymentToDriver({
      userId,
      driverId: driver.id,
      driverName: driver.name,
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      status: 'waiting'
    });
    await addLog(currentUser.id, currentUser.fullName, 'Добавление оплаты', `Исполнитель ${driver.name}, сумма ${newPayment.amount}`);
    setShowPaymentModal(false);
    setNewPayment({ driverId: '', amount: '', date: new Date().toISOString().split('T')[0] });
    loadFinance();
  };

  const updatePaymentStatus = async (id, status) => {
    await updatePaymentToDriver(id, { status });
    loadFinance();
  };

  const deletePayment = async (id) => {
    if (window.confirm('Удалить платёж?')) {
      await deletePaymentToDriver(id);
      loadFinance();
    }
  };

  const handleAddPlanItem = async () => {
    if (!newPlanItem.description || !newPlanItem.amount) return;
    await addPaymentPlanItem({
      userId,
      weekStart: weekStart(),
      description: newPlanItem.description,
      amount: parseFloat(newPlanItem.amount),
      dueDate: newPlanItem.dueDate,
      status: 'planned'
    });
    await addLog(currentUser.id, currentUser.fullName, 'Добавление планового платежа', `${newPlanItem.description}, ${newPlanItem.amount} руб.`);
    setShowPlanModal(false);
    setNewPlanItem({ description: '', amount: '', dueDate: '' });
    loadFinance();
  };

  const updatePlanStatus = async (id, status) => {
    await updatePaymentPlanItem(id, { status });
    loadFinance();
  };

  const deletePlanItem = async (id) => {
    if (window.confirm('Удалить плановый платёж?')) {
      await deletePaymentPlanItem(id);
      loadFinance();
    }
  };

  const handleAddPrepayment = async () => {
    if (!newPrepayment.orderId || !newPrepayment.amount) return;
    await setPrepayment(userId, newPrepayment.orderId, newPrepayment.status, parseFloat(newPrepayment.amount));
    await addLog(currentUser.id, currentUser.fullName, 'Добавление предоплаты', `Заказ ${newPrepayment.orderId}, ${newPrepayment.amount} руб.`);
    setShowPrepaymentModal(false);
    setNewPrepayment({ orderId: '', amount: '', status: 'no' });
    loadFinance();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedDriver || !newPhoto) return;
    await addPhoto({
      userId,
      driverId: selectedDriver,
      driverName: drivers.find(d => d.id === selectedDriver)?.name,
      imageData: newPhoto,
      comment: prompt('Комментарий к фото (состояние, чистота)') || ''
    });
    setNewPhoto(null);
    loadPhotos();
  };

  const handleDeletePhoto = async (id) => {
    if (window.confirm('Удалить фото?')) {
      await deletePhoto(id);
      loadPhotos();
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverName.trim()) return;
    await addDriver(userId, {
      name: newDriverName.trim(),
      contact: '',
      email: '',
      city: '',
      category: '',
      active: true
    });
    await addLog(currentUser.id, currentUser.fullName, 'Добавление исполнителя', newDriverName.trim());
    setNewDriverName('');
    await loadDrivers();
  };

  const handleDeleteDriver = async (driver) => {
    if (window.confirm('Удалить исполнителя?')) {
      await deleteDriver(driver.id);
      await addLog(currentUser.id, currentUser.fullName, 'Удаление исполнителя', driver.name);
      await loadDrivers();
    }
  };

  const openEditDriver = (driver) => {
    setEditingDriver(driver);
    setEditForm({
      name: driver.name,
      contact: driver.contact || '',
      email: driver.email || '',
      city: driver.city || '',
      category: driver.category || '',
      active: driver.active
    });
    setShowEditModal(true);
  };

  const saveEditDriver = async () => {
    if (!editForm.name.trim()) return;
    await updateDriver(editingDriver.id, {
      name: editForm.name.trim(),
      contact: editForm.contact,
      email: editForm.email,
      city: editForm.city,
      category: editForm.category,
      active: editForm.active
    });
    await addLog(currentUser.id, currentUser.fullName, 'Редактирование исполнителя', editForm.name);
    setShowEditModal(false);
    setEditingDriver(null);
    await loadDrivers();
    alert('Данные исполнителя обновлены');
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    await addCustomer(userId, {
      name: newCustomerName.trim(),
      contact: ''
    });
    await addLog(currentUser.id, currentUser.fullName, 'Добавление заказчика', newCustomerName.trim());
    setNewCustomerName('');
    await loadCustomers();
  };

  const handleDeleteCustomer = async (customer) => {
    if (window.confirm('Удалить заказчика?')) {
      await deleteCustomer(customer.id);
      await addLog(currentUser.id, currentUser.fullName, 'Удаление заказчика', customer.name);
      await loadCustomers();
    }
  };

  const exportDrivers = async () => {
    const data = drivers.map(d => ({
      'Имя': d.name,
      'Контакты': d.contact || '',
      'E-mail': d.email || '',
      'Город': d.city || '',
      'Категория': d.category || '',
      'Активность': d.active ? 'Активен' : 'Не активен'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Исполнители');
    XLSX.writeFile(wb, 'drivers.xlsx');
    await addLog(currentUser.id, currentUser.fullName, 'Экспорт исполнителей', `Экспортировано ${drivers.length} записей`);
  };

  const handleImportDrivers = async (rows) => {
    for (const row of rows) {
      if (row['Имя']) {
        let activeStatus = true;
        if (row['Активность'] === 'Не активен' || row['Активность'] === 'Нет' || row['Активность'] === false) {
          activeStatus = false;
        }
        await addDriver(userId, {
          name: row['Имя'],
          contact: row['Контакты'] || '',
          email: row['E-mail'] || '',
          city: row['Город'] || '',
          category: row['Категория'] || '',
          active: activeStatus
        });
      }
    }
    await loadDrivers();
    await addLog(currentUser.id, currentUser.fullName, 'Импорт исполнителей', `Импортировано ${rows.length} записей`);
    alert('Импорт исполнителей завершён');
  };

  const exportCustomers = async () => {
    const data = customers.map(c => ({ 'Имя': c.name, 'Контакты': c.contact || '' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Заказчики');
    XLSX.writeFile(wb, 'customers.xlsx');
    await addLog(currentUser.id, currentUser.fullName, 'Экспорт заказчиков', `Экспортировано ${customers.length} записей`);
  };

  const handleImportCustomers = async (rows) => {
    for (const row of rows) {
      if (row['Имя']) {
        await addCustomer(userId, {
          name: row['Имя'],
          contact: row['Контакты'] || ''
        });
      }
    }
    await loadCustomers();
    await addLog(currentUser.id, currentUser.fullName, 'Импорт заказчиков', `Импортировано ${rows.length} записей`);
    alert('Импорт заказчиков завершён');
  };

  const filteredDrivers = drivers.filter(d => {
    if (filterCity && d.city !== filterCity) return false;
    if (filterCategory && d.category !== filterCategory) return false;
    if (filterActive && ((filterActive === 'Активен' && !d.active) || (filterActive === 'Не активен' && d.active))) return false;
    if (searchName && (!d.name || typeof d.name !== 'string' || !d.name.toLowerCase().includes(searchName.toLowerCase()))) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="restricted-card" style={{ color: '#ff9999' }}>{error}</div>;

  return (
    <div className="restricted-card">
      <h2>🚛 Логистика</h2>
      <FinanceStats userId={userId} />

      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-light)', marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={activeTab === 'finance' ? 'primary' : 'secondary'} onClick={() => setActiveTab('finance')}>Финансы</button>
        <button className={activeTab === 'photo' ? 'primary' : 'secondary'} onClick={() => setActiveTab('photo')}>Фотоконтроль</button>
        <button className={activeTab === 'drivers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('drivers')}>Исполнители</button>
        <button className={activeTab === 'customers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('customers')}>Заказчики</button>
      </div>

      {activeTab === 'finance' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button className="primary" onClick={() => setShowPaymentModal(true)}>➕ Добавить оплату исполнителю</button>
            <button className="primary" onClick={() => setShowPlanModal(true)}>➕ Добавить плановый платёж</button>
            <button className="primary" onClick={() => setShowPrepaymentModal(true)}>💰 Добавить предоплату от заказчика</button>
          </div>
          <h3>Оплата исполнителям</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-light)' }}>
            <thead>
              <tr><th>Исполнитель</th><th>Сумма (руб.)</th><th>Дата</th><th>Статус</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                 <tr key={p.id}>
                   <td>{p.driverName}</td>
                   <td>{p.amount}</td>
                   <td>{formatDate(p.date)}</td>
                  <td><select value={p.status} onChange={e => updatePaymentStatus(p.id, e.target.value)}>
                    <option value="waiting">Ждём предоплату</option>
                    <option value="partial">Частично оплачено</option>
                    <option value="paid">Оплачено</option>
                  </select></td>
                  <td><button className="danger" onClick={() => deletePayment(p.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>План оплат от финансового отдела (на неделю)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-light)' }}>
            <thead><tr><th>Описание</th><th>Сумма</th><th>Дата</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {plan.map(p => (
                 <tr key={p.id}>
                   <td>{p.description}</td>
                   <td>{p.amount}</td>
                   <td>{formatDate(p.dueDate)}</td>
                  <td><select value={p.status} onChange={e => updatePlanStatus(p.id, e.target.value)}>
                    <option value="planned">Запланировано</option>
                    <option value="paid">Оплачено</option>
                  </select></td>
                  <td><button className="danger" onClick={() => deletePlanItem(p.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PrepaymentsList userId={userId} />
        </div>
      )}

      {activeTab === 'photo' && (
        <div>
          <h3>Фотоконтроль транспорта</h3>
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
            <option value="">-- Выберите исполнителя --</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {selectedDriver && (
            <div>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              {newPhoto && <img src={newPhoto} alt="preview" style={{ width: 100, marginLeft: 10 }} />}
              <button className="primary" onClick={handleUploadPhoto} disabled={!newPhoto}>📸 Загрузить фото</button>
              <h4>История фото</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ border: '1px solid var(--border-light)', padding: 5, borderRadius: 8, width: 160 }}>
                    <img src={photo.imageData} alt="фото" style={{ width: '100%' }} />
                    <p><small>{photo.comment}</small></p>
                    <button className="danger" onClick={() => handleDeletePhoto(photo.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div>
          <h3>Справочник исполнителей</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="secondary" onClick={exportDrivers}>📎 Экспорт</button>
            <button className="secondary" onClick={() => setShowImportDrivers(true)}>📂 Импорт</button>
            <button className="danger" onClick={() => handleDeleteDriver(selectedDriverObj)}>🗑️ Удалить всех</button>
            <input placeholder="Имя исполнителя" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} />
            <button className="primary" onClick={handleAddDriver}>➕ Добавить</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
            <input type="text" placeholder="🔍 Поиск по имени" value={searchName} onChange={e => setSearchName(e.target.value)} style={{ width: '200px' }} />
            <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
              <option value="">Все города</option>
              {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Все категории</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={filterActive} onChange={e => setFilterActive(e.target.value)}>
              <option value="">Все статусы</option>
              <option value="Активен">Активен</option>
              <option value="Не активен">Не активен</option>
            </select>
            <button className="secondary" onClick={() => { setFilterCity(''); setFilterCategory(''); setFilterActive(''); setSearchName(''); }}>Сбросить</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-light)' }}>
            <thead>
              <tr><th>Имя</th><th>Контакты</th><th>E-mail</th><th>Активность</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {filteredDrivers.map(d => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.contact || ''}</td>
                  <td>{d.email || ''}</td>
                  <td>{d.active ? 'Активен' : 'Не активен'}</td>
                  <td>
                    <button className="secondary" onClick={() => openEditDriver(d)}>✏️</button>
                    <button className="danger" onClick={() => handleDeleteDriver(d)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'customers' && (
        <div>
          <h3>Справочник заказчиков</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
            <button className="secondary" onClick={exportCustomers}>📎 Экспорт</button>
            <button className="secondary" onClick={() => setShowImportCustomers(true)}>📂 Импорт</button>
            <input placeholder="Имя заказчика" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
            <button className="primary" onClick={handleAddCustomer}>➕ Добавить</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-light)' }}>
            <thead><tr><th>Имя</th><th>Контакты</th><th>Действия</th></tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.contact || ''}</td>
                  <td>
                    <button className="secondary" onClick={() => openEditCustomer(c)}>✏️</button>
                    <button className="danger" onClick={() => handleDeleteCustomer(c)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Редактирование исполнителя</h3>
            <input type="text" placeholder="Имя" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            <input type="text" placeholder="Контакты" value={editForm.contact} onChange={e => setEditForm({...editForm, contact: e.target.value})} />
            <input type="email" placeholder="E-mail" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
            <input type="text" placeholder="Город" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
            <input type="text" placeholder="Категория" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} />
            <div style={{ margin: '10px 0' }}>
              <label style={{ marginRight: '10px' }}>Активность:</label>
              <select value={editForm.active ? 'Активен' : 'Не активен'} onChange={e => setEditForm({...editForm, active: e.target.value === 'Активен'})}>
                <option value="Активен">Активен</option>
                <option value="Не активен">Не активен</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="primary" onClick={saveEditDriver}>Сохранить</button>
              <button className="secondary" onClick={() => setShowEditModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Новая оплата исполнителю</h3>
            <select value={newPayment.driverId} onChange={e => setNewPayment({...newPayment, driverId: e.target.value})}>
              <option value="">Выберите исполнителя</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="number" placeholder="Сумма" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} />
            <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={handleAddPayment}>Сохранить</button>
              <button className="secondary" onClick={() => setShowPaymentModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Новый плановый платёж</h3>
            <input placeholder="Описание" value={newPlanItem.description} onChange={e => setNewPlanItem({...newPlanItem, description: e.target.value})} />
            <input type="number" placeholder="Сумма" value={newPlanItem.amount} onChange={e => setNewPlanItem({...newPlanItem, amount: e.target.value})} />
            <input type="date" value={newPlanItem.dueDate} onChange={e => setNewPlanItem({...newPlanItem, dueDate: e.target.value})} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={handleAddPlanItem}>Сохранить</button>
              <button className="secondary" onClick={() => setShowPlanModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {showPrepaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Новая предоплата</h3>
            <input placeholder="Номер заказа" value={newPrepayment.orderId} onChange={e => setNewPrepayment({...newPrepayment, orderId: e.target.value})} />
            <input type="number" placeholder="Сумма" value={newPrepayment.amount} onChange={e => setNewPrepayment({...newPrepayment, amount: e.target.value})} />
            <select value={newPrepayment.status} onChange={e => setNewPrepayment({...newPrepayment, status: e.target.value})}>
              <option value="no">Нет</option>
              <option value="partial">Частично</option>
              <option value="yes">Получена</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={handleAddPrepayment}>Сохранить</button>
              <button className="secondary" onClick={() => setShowPrepaymentModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <ImportModal
        isOpen={showImportDrivers}
        onClose={() => setShowImportDrivers(false)}
        onImport={handleImportDrivers}
        title="Исполнителей"
        expectedColumns={['Имя', 'Контакты', 'E-mail', 'Город', 'Категория', 'Активность']}
        requiredColumns={['Имя']}
        sampleTemplate={`Имя,Контакты,E-mail,Город,Категория,Активность\nИванов Иван,+7-123-456-78-90,ivan@mail.ru,Москва,Водитель,Активен\nПетров Пётр,+7-987-654-32-10,petr@mail.ru,СПб,Механик,Не активен`}
      />
      <ImportModal
        isOpen={showImportCustomers}
        onClose={() => setShowImportCustomers(false)}
        onImport={handleImportCustomers}
        title="Заказчиков"
        expectedColumns={['Имя', 'Контакты']}
        requiredColumns={['Имя']}
        sampleTemplate={`Имя,Контакты\nООО "Ромашка",info@romashka.ru\nЗАО "Лютик",+7-111-222-33-44`}
      />
    </div>
  );
}