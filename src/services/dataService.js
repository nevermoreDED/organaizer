// CRM API сервис - все функции работают через API /api/v1/organizer/
const API_BASE = '/api/v1/organizer';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  const data = await response.json();
  return data.result || data;
};

// ========== АВТОРИЗАЦИЯ ==========
export const getUserByLogin = async (login, password) => {
  if (login && password) {
    // Для CRM используем Bitrix авторизацию, эта функция не используется
    // но оставлена для совместимости
    return null;
  }
  
  // Получаем данные из window.BITRIX_USER
  if (typeof window !== 'undefined' && window.BITRIX_USER) {
    return {
      id: window.BITRIX_USER.ID,
      fullName: window.BITRIX_USER.NAME,
      email: window.BITRIX_USER.EMAIL,
      login: window.BITRIX_USER.LOGIN,
      isAdmin: window.BITRIX_USER.IS_ADMIN,
      departmentId: window.BITRIX_USER.DEPARTMENT_ID,
      role: window.BITRIX_USER.role
    };
  }
  return null;
};

// ========== ЛОГИ ==========
export const getAllLogs = async () => {
  const response = await fetch(`${API_BASE}/logs`);
  return handleResponse(response);
};

export const addLog = async (userId, userName, action, details = '') => {
  let ip = 'Unknown';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    ip = data.ip;
  } catch (e) {
    console.error('Failed to get IP', e);
  }
  
  const response = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName, action, details, ip })
  });
  return handleResponse(response);
};

// ========== ЗАДАЧИ ==========
export const getTasks = async (userId, filter = 'all') => {
  const params = new URLSearchParams({ userId, filter });
  const response = await fetch(`${API_BASE}/tasks?${params}`);
  return handleResponse(response);
};

export const addTask = async (task) => {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return handleResponse(response);
};

export const updateTask = async (id, changes) => {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  });
  return handleResponse(response);
};

export const deleteTask = async (id) => {
  const response = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

export const getTasksAsEvents = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/tasks/events?${params}`);
  const tasks = await handleResponse(response);
  return (tasks || []).filter(t => t.dueDate).map(t => ({
    id: `task_${t.id}`,
    title: t.title,
    start: t.dueDate,
    allDay: true,
    className: t.status === 'done' ? 'task-done' : '',
    extendedProps: { type: 'task', originalId: t.id, status: t.status, comment: t.comment || '' }
  }));
};

export const getTasksByDateRange = async (userId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, startDate, endDate });
  const response = await fetch(`${API_BASE}/tasks/range?${params}`);
  return handleResponse(response);
};

// ========== СОБЫТИЯ ==========
export const getEvents = async (userId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, startDate, endDate });
  const response = await fetch(`${API_BASE}/events?${params}`);
  return handleResponse(response);
};

export const addEvent = async (event) => {
  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  return handleResponse(response);
};

export const updateEvent = async (id, changes) => {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  });
  return handleResponse(response);
};

export const deleteEvent = async (id) => {
  const response = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

export const getEventsByDate = async (userId, date) => {
  const params = new URLSearchParams({ userId, date });
  const response = await fetch(`${API_BASE}/events/date?${params}`);
  return handleResponse(response);
};

// ========== ПОРУЧЕНИЯ ==========
export const getAssignmentsReceived = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/assignments/received?${params}`);
  return handleResponse(response);
};

export const getAssignmentsGiven = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/assignments/given?${params}`);
  return handleResponse(response);
};

export const createAssignment = async (assignment) => {
  const response = await fetch(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment)
  });
  return handleResponse(response);
};

export const updateAssignment = async (id, changes) => {
  const response = await fetch(`${API_BASE}/assignments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  });
  return handleResponse(response);
};

// ========== ПОЛЬЗОВАТЕЛИ ==========
export const getAllUsers = async () => {
  const response = await fetch(`${API_BASE}/users/all`);
  return handleResponse(response);
};

export const getUserById = async (userId) => {
  const response = await fetch(`${API_BASE}/users/${userId}`);
  return handleResponse(response);
};

export const getUsersByDepartment = async (departmentId) => {
  const params = new URLSearchParams({ departmentId });
  const response = await fetch(`${API_BASE}/users/department?${params}`);
  return handleResponse(response);
};

// ========== ОТЧЁТЫ ==========
export const getAllReports = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await fetch(`${API_BASE}/reports/all?${params}`);
  return handleResponse(response);
};

// ========== БРОНИРОВАНИЕ: KPI ==========
export const getKPI = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/booking/kpi?${params}`);
  const result = await handleResponse(response);
  return result || {
    day: { calls: 12, sales: 3, rating: 4.5 },
    week: { calls: 87, sales: 21, rating: 4.7 },
    month: { calls: 340, sales: 89, rating: 4.6 }
  };
};

// ========== УВЕДОМЛЕНИЯ (localStorage) ==========
export const addNotification = (title, message, type = 'info') => {
  const notifications = JSON.parse(localStorage.getItem('app_notifications') || '[]');
  notifications.unshift({
    id: Date.now(),
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  });
  if (notifications.length > 50) notifications.pop();
  localStorage.setItem('app_notifications', JSON.stringify(notifications));
  window.dispatchEvent(new Event('notifications-updated'));
};

export const getNotifications = () => {
  return JSON.parse(localStorage.getItem('app_notifications') || '[]');
};

export const markNotificationRead = (id) => {
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem('app_notifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-updated'));
};

export const markAllNotificationsRead = () => {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem('app_notifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-updated'));
};

// ========== ДЕПАРТАМЕНТЫ ==========
export const getUniqueDepartments = async () => {
  const users = await getAllUsers();
  const deptMap = new Map();
  (users || []).forEach(user => {
    if (user.departmentId && !deptMap.has(user.departmentId)) {
      let name = user.departmentId;
      if (user.departmentId === 'dept1') name = 'Логистика';
      else if (user.departmentId === 'dept3') name = 'Бухгалтерия';
      else if (user.departmentId === 'dept4') name = 'Бронирование';
      else if (user.departmentId === 'dept5') name = 'Качество';
      deptMap.set(user.departmentId, { id: user.departmentId, name });
    }
  });
  return Array.from(deptMap.values());
};

// ========== РЕСУРСЫ ==========
export const getResourceSections = async () => {
  const response = await fetch(`${API_BASE}/resources/sections`);
  return handleResponse(response);
};

export const addResourceSection = async (section) => {
  const response = await fetch(`${API_BASE}/resources/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(section)
  });
  return handleResponse(response);
};

export const getResourceLinks = async (sectionId) => {
  const params = new URLSearchParams({ sectionId });
  const response = await fetch(`${API_BASE}/resources/links?${params}`);
  return handleResponse(response);
};

export const addResourceLink = async (link) => {
  const response = await fetch(`${API_BASE}/resources/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(link)
  });
  return handleResponse(response);
};

// ========== BLOCK ВНИМАНИЯ ==========
export const getAttentionBlock = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/attention?${params}`);
  const data = await handleResponse(response);
  return data || { overdueTasks: [], todayTasks: [], overdueAssignments: [], todayAssignments: [] };
};

// ========== ЗАМЕТКИ (notebook) ==========
export const getNotebook = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/notebook?${params}`);
  const data = await handleResponse(response);
  return data || { notes: [] };
};

export const addNote = async (userId, note) => {
  const response = await fetch(`${API_BASE}/notebook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...note })
  });
  return handleResponse(response);
};

export const deleteNote = async (userId, noteId) => {
  const response = await fetch(`${API_BASE}/notebook/${noteId}`, { method: 'DELETE' });
  return handleResponse(response);
};

export const updateNote = async (userId, noteId, title, body) => {
  const response = await fetch(`${API_BASE}/notebook/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body })
  });
  return handleResponse(response);
};

// ========== ЛОГИСТИКА: водители ==========
export const getDrivers = async (userId, filters = {}) => {
  const params = new URLSearchParams({ userId });
  if (filters.city) params.append('city', filters.city);
  if (filters.category) params.append('category', filters.category);
  if (filters.active !== undefined) params.append('active', filters.active ? '1' : '0');
  if (filters.search) params.append('search', filters.search);
  const response = await fetch(`${API_BASE}/drivers?${params}`);
  return handleResponse(response);
};

export const getAllDrivers = async () => getDrivers('');

export const addDriver = async (driver) => {
  const response = await fetch(`${API_BASE}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(driver)
  });
  return handleResponse(response);
};

export const updateDriver = async (id, driver) => {
  const response = await fetch(`${API_BASE}/drivers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(driver)
  });
  return handleResponse(response);
};

export const deleteDriver = async (id) => {
  const response = await fetch(`${API_BASE}/drivers/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== ЛОГИСТИКА: заказчики ==========
export const getCustomers = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/customers?${params}`);
  return handleResponse(response);
};

export const addCustomer = async (customer) => {
  const response = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  return handleResponse(response);
};

export const deleteCustomer = async (id) => {
  const response = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== ЛОГИСТИКА: выплаты ==========
export const getPaymentsToDrivers = async (userId, filters = {}) => {
  const params = new URLSearchParams({ userId });
  if (filters.driverId) params.append('driverId', filters.driverId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  const response = await fetch(`${API_BASE}/payments?${params}`);
  return handleResponse(response);
};

export const addPaymentToDriver = async (payment) => {
  const response = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment)
  });
  return handleResponse(response);
};

export const updatePaymentToDriver = async (id, payment) => {
  const response = await fetch(`${API_BASE}/payments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment)
  });
  return handleResponse(response);
};

export const deletePaymentToDriver = async (id) => {
  const response = await fetch(`${API_BASE}/payments/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== ЛОГИСТИКА: план выплат ==========
export const getPaymentPlan = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/payment-plan?${params}`);
  return handleResponse(response);
};

export const addPaymentPlanItem = async (item) => {
  const response = await fetch(`${API_BASE}/payment-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return handleResponse(response);
};

export const updatePaymentPlanItem = async (id, item) => {
  const response = await fetch(`${API_BASE}/payment-plan/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return handleResponse(response);
};

export const deletePaymentPlanItem = async (id) => {
  const response = await fetch(`${API_BASE}/payment-plan/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== ЛОГИСТИКА: предоплаты ==========
export const setPrepayment = async (prepayment) => {
  const response = await fetch(`${API_BASE}/prepayments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prepayment)
  });
  return handleResponse(response);
};

// ========== ЛОГИСТИКА: фото ==========
export const getPhotosByDriver = async (driverId) => {
  const params = new URLSearchParams({ driverId });
  const response = await fetch(`${API_BASE}/photos?${params}`);
  return handleResponse(response);
};

export const addPhoto = async (photo) => {
  const response = await fetch(`${API_BASE}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(photo)
  });
  return handleResponse(response);
};

export const deletePhoto = async (id) => {
  const response = await fetch(`${API_BASE}/photos/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== БРОНИРОВАНИЕ: чек-листы ==========
export const getChecklists = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/checklists?${params}`);
  return handleResponse(response);
};

export const addChecklist = async (checklist) => {
  const response = await fetch(`${API_BASE}/checklists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checklist)
  });
  return handleResponse(response);
};

export const updateChecklist = async (id, checklist) => {
  const response = await fetch(`${API_BASE}/checklists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checklist)
  });
  return handleResponse(response);
};

export const deleteChecklist = async (id) => {
  const response = await fetch(`${API_BASE}/checklists/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== СТАЖ ==========
export const getSeniority = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/seniority?${params}`);
  return handleResponse(response);
};

// ========== РАЗВИТИЕ ==========
export const getDevelopmentData = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/development?${params}`);
  return handleResponse(response);
};

// ========== ГРАФИК ==========
export const getShifts = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/shifts?${params}`);
  return handleResponse(response);
};

// ========== СМЕНЫ ==========
export const getShiftRequests = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/shift-requests?${params}`);
  return handleResponse(response);
};

export const createShiftRequest = async (request) => {
  const response = await fetch(`${API_BASE}/shift-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return handleResponse(response);
};

export const updateShiftRequest = async (id, request) => {
  const response = await fetch(`${API_BASE}/shift-requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return handleResponse(response);
};

// ========== ПЕРЕРАБОТКИ ==========
export const getOvertimeRequests = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/overtime-requests?${params}`);
  return handleResponse(response);
};

export const createOvertimeRequest = async (request) => {
  const response = await fetch(`${API_BASE}/overtime-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return handleResponse(response);
};

export const updateOvertimeRequest = async (id, request) => {
  const response = await fetch(`${API_BASE}/overtime-requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return handleResponse(response);
};

// ========== ДОГОВОРЫ ==========
export const getContracts = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/contracts?${params}`);
  return handleResponse(response);
};

export const addContract = async (contract) => {
  const response = await fetch(`${API_BASE}/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contract)
  });
  return handleResponse(response);
};

export const updateContract = async (id, contract) => {
  const response = await fetch(`${API_BASE}/contracts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contract)
  });
  return handleResponse(response);
};

export const deleteContract = async (id) => {
  const response = await fetch(`${API_BASE}/contracts/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

export const getExpiringContracts = async () => {
  const response = await fetch(`${API_BASE}/contracts/expiring`);
  return handleResponse(response);
};

// ========== ОТЧЁТЫ ==========
export const getReports = async (userId, date) => {
  const params = new URLSearchParams({ userId, date });
  const response = await fetch(`${API_BASE}/reports?${params}`);
  return handleResponse(response);
};

export const getWeeklyReports = async (userId, startDate) => {
  const params = new URLSearchParams({ userId, startDate });
  const response = await fetch(`${API_BASE}/reports/weekly?${params}`);
  return handleResponse(response);
};

export const getMonthlyReports = async (userId, month) => {
  const params = new URLSearchParams({ userId, month });
  const response = await fetch(`${API_BASE}/reports/monthly?${params}`);
  return handleResponse(response);
};

// ========== СЕГОДНЯШНИЕ ЭЛЕМЕНТЫ ==========
export const getTodayItems = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/today-items?${params}`);
  return handleResponse(response);
};

export const addTodayItem = async (item) => {
  const response = await fetch(`${API_BASE}/today-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return handleResponse(response);
};

export const updateTodayItem = async (id, item) => {
  const response = await fetch(`${API_BASE}/today-items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return handleResponse(response);
};

export const deleteTodayItem = async (id) => {
  const response = await fetch(`${API_BASE}/today-items/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

// ========== БАЛЛЫ ПОЛЬЗОВАТЕЛЮ ==========
export const addPointsToUser = async (targetUserId, points, reason) => {
  const response = await fetch(`${API_BASE}/users/${targetUserId}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points, reason })
  });
  return handleResponse(response);
};

// ========== ОТЧЁТЫ: сохранение ==========
export const saveReport = async (report) => {
  const response = await fetch(`${API_BASE}/reports/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
  return handleResponse(response);
};

// ========== ГРАФИК: месяц, смены ==========
export const getShiftsByMonth = async (month) => {
  const params = new URLSearchParams({ month });
  const response = await fetch(`${API_BASE}/shifts/month?${params}`);
  return handleResponse(response);
};

export const setShiftForDate = async (date, shiftData) => {
  const response = await fetch(`${API_BASE}/shifts/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shiftData)
  });
  return handleResponse(response);
};

export const getShiftRequestsForManager = async (departmentId) => {
  const params = new URLSearchParams({ departmentId });
  const response = await fetch(`${API_BASE}/shift-requests/manager?${params}`);
  return handleResponse(response);
};

export const saveShiftsBatch = async (shifts) => {
  const response = await fetch(`${API_BASE}/shifts/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shifts })
  });
  return handleResponse(response);
};

export const getOvertimeRequestsForManager = async (departmentId) => {
  const params = new URLSearchParams({ departmentId });
  const response = await fetch(`${API_BASE}/overtime-requests/manager?${params}`);
  return handleResponse(response);
};

export const updateUsersOrder = async (order) => {
  const response = await fetch(`${API_BASE}/users/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  });
  return handleResponse(response);
};

// Пользователи: админ
export const createUser = async (user) => {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return handleResponse(response);
};

export const deleteUser = async (id) => {
  const response = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  return handleResponse(response);
};

export const updateUser = async (id, user) => {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return handleResponse(response);
};

// Финансы: итоги
export const getTotalPayments = async (month) => {
  const params = new URLSearchParams({ month });
  const response = await fetch(`${API_BASE}/payments/total?${params}`);
  return handleResponse(response);
};

export const getTotalPlan = async (month) => {
  const params = new URLSearchParams({ month });
  const response = await fetch(`${API_BASE}/payment-plan/total?${params}`);
  return handleResponse(response);
};

export const getTotalPrepaymentsAmount = async (month) => {
  const params = new URLSearchParams({ month });
  const response = await fetch(`${API_BASE}/prepayments/total?${params}`);
  return handleResponse(response);
};

// Предоплаты
export const getAllPrepayments = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/prepayments?${params}`);
  return handleResponse(response);
};

export const updatePrepayment = async (id, prepayment) => {
  const response = await fetch(`${API_BASE}/prepayments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prepayment)
  });
  return handleResponse(response);
};

export const db = null;