/*
 * API Service for direct CRM integration
 * Replaces Firebase/Firestore calls with direct API calls to CRM backend
 */

const API_BASE = '/api/v1/organizer';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  return response.json();
};

// ===================== TASKS =====================
export const getTasks = async (userId, filter = 'all') => {
  const params = new URLSearchParams({ userId, filter });
  const response = await fetch(`${API_BASE}/tasks?${params}`);
  return handleResponse(response);
};

export const addTask = async (task) => {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
  return handleResponse(response);
};

export const updateTask = async (id, changes) => {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deleteTask = async (id) => {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getTasksAsEvents = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/tasks/events?${params}`);
  return handleResponse(response);
};

export const getTasksByDateRange = async (userId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, startDate, endDate });
  const response = await fetch(`${API_BASE}/tasks/range?${params}`);
  return handleResponse(response);
};

// ===================== EVENTS =====================
export const getEvents = async (userId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, startDate, endDate });
  const response = await fetch(`${API_BASE}/events?${params}`);
  return handleResponse(response);
};

export const addEvent = async (event) => {
  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  return handleResponse(response);
};

export const updateEvent = async (id, changes) => {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deleteEvent = async (id) => {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getEventsByDate = async (userId, date) => {
  const params = new URLSearchParams({ userId, date });
  const response = await fetch(`${API_BASE}/events/date?${params}`);
  return handleResponse(response);
};

// ===================== ASSIGNMENTS =====================
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });
  return handleResponse(response);
};

export const updateAssignment = async (id, changes) => {
  const response = await fetch(`${API_BASE}/assignments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

// ===================== RESOURCES =====================
export const getResourceSections = async () => {
  const response = await fetch(`${API_BASE}/resources/sections`);
  return handleResponse(response);
};

export const addResourceSection = async (title) => {
  const response = await fetch(`${API_BASE}/resources/sections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(link),
  });
  return handleResponse(response);
};

// ===================== ATTENTION BLOCK =====================
export const getAttentionBlock = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/attention?${params}`);
  return handleResponse(response);
};

// ===================== LOGISTICS =====================
export const getAllDrivers = async () => {
  const response = await fetch(`${API_BASE}/logistics/drivers/all`);
  return handleResponse(response);
};

export const getDrivers = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/logistics/drivers?${params}`);
  return handleResponse(response);
};

export const addDriver = async (userId, driverData) => {
  const response = await fetch(`${API_BASE}/logistics/drivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...driverData }),
  });
  return handleResponse(response);
};

export const updateDriver = async (id, changes) => {
  const response = await fetch(`${API_BASE}/logistics/drivers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deleteDriver = async (id) => {
  const response = await fetch(`${API_BASE}/logistics/drivers/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getCustomers = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/logistics/customers?${params}`);
  return handleResponse(response);
};

export const addCustomer = async (userId, customerData) => {
  const response = await fetch(`${API_BASE}/logistics/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...customerData }),
  });
  return handleResponse(response);
};

export const deleteCustomer = async (id) => {
  const response = await fetch(`${API_BASE}/logistics/customers/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ===================== PAYMENTS =====================
export const getPaymentsToDrivers = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/payments?${params}`);
  return handleResponse(response);
};

export const addPaymentToDriver = async (payment) => {
  const response = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  });
  return handleResponse(response);
};

export const updatePaymentToDriver = async (id, changes) => {
  const response = await fetch(`${API_BASE}/payments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deletePaymentToDriver = async (id) => {
  const response = await fetch(`${API_BASE}/payments/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getPaymentPlan = async (userId, weekStart) => {
  const params = new URLSearchParams({ userId, weekStart });
  const response = await fetch(`${API_BASE}/payments/plan?${params}`);
  return handleResponse(response);
};

export const addPaymentPlanItem = async (item) => {
  const response = await fetch(`${API_BASE}/payments/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  return handleResponse(response);
};

export const updatePaymentPlanItem = async (id, changes) => {
  const response = await fetch(`${API_BASE}/payments/plan/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deletePaymentPlanItem = async (id) => {
  const response = await fetch(`${API_BASE}/payments/plan/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getAllPrepayments = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/prepayments?${params}`);
  return handleResponse(response);
};

export const setPrepayment = async (userId, orderId, status, amount) => {
  const response = await fetch(`${API_BASE}/prepayments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, orderId, status, amount }),
  });
  return handleResponse(response);
};

export const updatePrepayment = async (id, changes) => {
  const response = await fetch(`${API_BASE}/prepayments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const getPhotosByDriver = async (userId, driverId) => {
  const params = new URLSearchParams({ userId, driverId });
  const response = await fetch(`${API_BASE}/photos?${params}`);
  return handleResponse(response);
};

export const addPhoto = async (photo) => {
  const response = await fetch(`${API_BASE}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(photo),
  });
  return handleResponse(response);
};

export const deletePhoto = async (id) => {
  const response = await fetch(`${API_BASE}/photos/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ===================== FINANCE TOTALS =====================
export const getTotalPayments = async (userId, driverId = null, dateFrom = null, dateTo = null) => {
  const params = new URLSearchParams({ userId });
  if (driverId) params.append('driverId', driverId);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  const response = await fetch(`${API_BASE}/totals/payments?${params}`);
  return handleResponse(response);
};

export const getTotalPlan = async (userId, weekStart = null, status = null) => {
  const params = new URLSearchParams({ userId });
  if (weekStart) params.append('weekStart', weekStart);
  if (status) params.append('status', status);
  const response = await fetch(`${API_BASE}/totals/plan?${params}`);
  return handleResponse(response);
};

export const getTotalPrepaymentsAmount = async (userId, customerId = null, status = null) => {
  const params = new URLSearchParams({ userId });
  if (customerId) params.append('customerId', customerId);
  if (status) params.append('status', status);
  const response = await fetch(`${API_BASE}/totals/prepayments?${params}`);
  return handleResponse(response);
};

// ===================== SHIFTS =====================
export const getShiftsByMonth = async (yearMonth) => {
  const params = new URLSearchParams({ yearMonth });
  const response = await fetch(`${API_BASE}/shifts/month?${params}`);
  return handleResponse(response);
};

export const setShiftForDate = async (userId, date, value) => {
  const response = await fetch(`${API_BASE}/shifts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, date, value }),
  });
  return handleResponse(response);
};

export const deleteShiftByDate = async (userId, date) => {
  const params = new URLSearchParams({ userId, date });
  const response = await fetch(`${API_BASE}/shifts?${params}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const saveShiftsBatch = async (userId, updates) => {
  const response = await fetch(`${API_BASE}/shifts/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, updates }),
  });
  return handleResponse(response);
};

export const getTodayShifts = async () => {
  const response = await fetch(`${API_BASE}/shifts/today`);
  return handleResponse(response);
};

export const createShiftRequest = async (fromUserId, proposedShifts, targetMonth) => {
  const response = await fetch(`${API_BASE}/shift-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fromUserId, proposedShifts, targetMonth }),
  });
  return handleResponse(response);
};

export const getShiftRequestsForManager = async (departmentId) => {
  const params = new URLSearchParams({ departmentId });
  const response = await fetch(`${API_BASE}/shift-requests/manager?${params}`);
  return handleResponse(response);
};

export const updateShiftRequest = async (requestId, status, appliedShifts = null) => {
  const response = await fetch(`${API_BASE}/shift-requests/${requestId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, appliedShifts }),
  });
  return handleResponse(response);
};

export const createOvertimeRequest = async (fromUserId, shiftDate, originalValue, overtimeHours, targetMonth) => {
  const response = await fetch(`${API_BASE}/overtime-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fromUserId, shiftDate, originalValue, overtimeHours, targetMonth }),
  });
  return handleResponse(response);
};

export const getOvertimeRequestsForManager = async (departmentId) => {
  const params = new URLSearchParams({ departmentId });
  const response = await fetch(`${API_BASE}/overtime-requests/manager?${params}`);
  return handleResponse(response);
};

export const updateOvertimeRequest = async (requestId, status) => {
  const response = await fetch(`${API_BASE}/overtime-requests/${requestId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
};

// ===================== USERS =====================
export const getAllUsers = async () => {
  const response = await fetch(`${API_BASE}/users/all`);
  return handleResponse(response);
};

export const getUserByLogin = async (login, password) => {
  const params = new URLSearchParams({ login, password });
  const response = await fetch(`${API_BASE}/users/login?${params}`);
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

export const createUser = async (userData) => {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};

export const updateUser = async (userId, changes) => {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deleteUser = async (userId) => {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const changePassword = async (userId, oldPassword, newPassword, isAdmin = false) => {
  const response = await fetch(`${API_BASE}/users/${userId}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword, newPassword, isAdmin }),
  });
  return handleResponse(response);
};

export const addPointsToUser = async (fromUserId, toUserId, amount, reason) => {
  const response = await fetch(`${API_BASE}/users/${toUserId}/points`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fromUserId, amount, reason }),
  });
  return handleResponse(response);
};

// ===================== REPORTS =====================
export const getReports = async (userId, startDate, endDate) => {
  const params = new URLSearchParams({ userId });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await fetch(`${API_BASE}/reports?${params}`);
  return handleResponse(response);
};

export const getAllReports = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await fetch(`${API_BASE}/reports/all?${params}`);
  return handleResponse(response);
};

export const saveReport = async (userId, report) => {
  const response = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...report }),
  });
  return handleResponse(response);
};

// ===================== BOOKING CHECKLISTS =====================
export const getChecklists = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/booking/checklists?${params}`);
  return handleResponse(response);
};

export const addChecklist = async (userId, title) => {
  const response = await fetch(`${API_BASE}/booking/checklists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, title }),
  });
  return handleResponse(response);
};

export const updateChecklist = async (id, items) => {
  const response = await fetch(`${API_BASE}/booking/checklists/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });
  return handleResponse(response);
};

export const deleteChecklist = async (id) => {
  const response = await fetch(`${API_BASE}/booking/checklists/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

// ===================== BOOKING NOTEBOOK =====================
export const getNotebook = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/booking/notebook?${params}`);
  return handleResponse(response);
};

export const addNote = async (userId, note) => {
  const response = await fetch(`${API_BASE}/booking/notebook/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...note }),
  });
  return handleResponse(response);
};

export const deleteNote = async (userId, noteId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/booking/notebook/notes/${noteId}?${params}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const updateNote = async (userId, noteId, newTitle, newBody) => {
  const response = await fetch(`${API_BASE}/booking/notebook/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, title: newTitle, body: newBody }),
  });
  return handleResponse(response);
};

// ===================== BOOKING SENIORITY =====================
export const getSeniority = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/booking/seniority?${params}`);
  return handleResponse(response);
};

export const setStartDate = async (userId, startDate) => {
  const response = await fetch(`${API_BASE}/booking/seniority`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, startDate }),
  });
  return handleResponse(response);
};

export const calculateBonus = (years) => {
  if (years < 1) return 0;
  if (years < 2) return 3000;
  if (years < 3) return 5000;
  return 8000;
};

// ===================== BOOKING KPI =====================
export const getKPI = async (userId) => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE}/booking/kpi?${params}`);
  return handleResponse(response);
};

// ===================== CONTRACTS =====================
export const getContracts = async (userId, departmentId) => {
  const params = new URLSearchParams({ userId, departmentId });
  const response = await fetch(`${API_BASE}/contracts?${params}`);
  return handleResponse(response);
};

export const addContract = async (contract) => {
  const response = await fetch(`${API_BASE}/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contract),
  });
  return handleResponse(response);
};

export const updateContract = async (id, changes) => {
  const response = await fetch(`${API_BASE}/contracts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(changes),
  });
  return handleResponse(response);
};

export const deleteContract = async (id) => {
  const response = await fetch(`${API_BASE}/contracts/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getExpiringContracts = async (userId, daysThreshold = 30) => {
  const params = new URLSearchParams({ userId, daysThreshold });
  const response = await fetch(`${API_BASE}/contracts/expiring?${params}`);
  return handleResponse(response);
};

// ===================== USER ORDERS =====================
export const updateUsersOrder = async (orderedUsers) => {
  const response = await fetch(`${API_BASE}/users/order`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderedUsers }),
  });
  return handleResponse(response);
};

// ===================== LOGS =====================
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, userName, action, details, ip }),
  });
  return handleResponse(response);
};

// ===================== DEPARTMENTS =====================
export const getUniqueDepartments = async () => {
  const response = await fetch(`${API_BASE}/departments`);
  return handleResponse(response);
};

// ===================== NOTIFICATIONS =====================
// These remain localStorage based
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const sendBrowserNotification = (title, body, icon = '/logo.png') => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
};

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