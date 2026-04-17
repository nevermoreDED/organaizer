import { db } from '../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc,
  getDocs, query, where, orderBy, Timestamp, writeBatch 
} from 'firebase/firestore';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
const todayStr = () => new Date().toISOString().split('T')[0];

// ===================== ЛОГИ =====================
// Получить все логи (только для админов)
export const getAllLogs = async () => {
  const q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Добавить запись в лог
export const addLog = async (userId, userName, action, details = '') => {
  let ip = 'неизвестно';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    ip = data.ip;
  } catch (e) {
    console.error('Не удалось определить IP', e);
  }
  await addDoc(collection(db, 'admin_logs'), {
    userId,
    userName,
    action,
    details,
    ip,
    timestamp: Timestamp.now()
  });
};

// ===================== ЗАДАЧИ =====================
export const getTasks = async (userId, filter = 'all') => {
  let q = query(collection(db, 'tasks'), where('userId', '==', userId));
  const today = todayStr();
  if (filter === 'today') {
    q = query(q, where('dueDate', '==', today));
  } else if (filter === 'upcoming') {
    q = query(q, where('dueDate', '>', today));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTask = async (task) => {
  const docRef = await addDoc(collection(db, 'tasks'), {
    ...task,
    dueDate: task.dueDate || null,
    status: task.status || 'active',
    comment: task.comment || '',
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...task };
};

export const updateTask = async (id, changes) => {
  const taskRef = doc(db, 'tasks', id);
  await updateDoc(taskRef, changes);
};

export const deleteTask = async (id) => {
  await deleteDoc(doc(db, 'tasks', id));
};

export const getTasksAsEvents = async (userId) => {
  const tasks = await getTasks(userId, 'all');
  return tasks.filter(t => t.dueDate).map(t => ({
    id: `task_${t.id}`,
    title: t.title,
    start: t.dueDate,
    allDay: true,
    className: t.status === 'done' ? 'task-done' : '',
    extendedProps: { type: 'task', originalId: t.id, status: t.status, comment: t.comment || '' }
  }));
};

export const getTasksByDateRange = async (userId, startDate, endDate) => {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    where('dueDate', '>=', startDate),
    where('dueDate', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===================== СОБЫТИЯ =====================
export const getEvents = async (userId, startDate, endDate) => {
  let q = query(collection(db, 'events'), where('userId', '==', userId));
  if (startDate) q = query(q, where('datetime', '>=', startDate));
  if (endDate) q = query(q, where('datetime', '<=', endDate));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addEvent = async (event) => {
  const docRef = await addDoc(collection(db, 'events'), {
    ...event,
    datetime: event.datetime,
    endDatetime: event.endDatetime || null,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...event };
};

export const updateEvent = async (id, changes) => {
  await updateDoc(doc(db, 'events', id), changes);
};

export const deleteEvent = async (id) => {
  await deleteDoc(doc(db, 'events', id));
};

export const getEventsByDate = async (userId, date) => {
  const start = date;
  const end = date + 'T23:59:59';
  const q = query(
    collection(db, 'events'),
    where('userId', '==', userId),
    where('datetime', '>=', start),
    where('datetime', '<=', end)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===================== ПОРУЧЕНИЯ =====================
export const getAssignmentsReceived = async (userId, departmentId) => {
  const q1 = query(collection(db, 'assignments'), where('toUserId', '==', userId));
  const q2 = query(collection(db, 'assignments'), where('toDepartmentId', '==', departmentId), where('toUserId', '==', null));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  let assignments = [...snap1.docs, ...snap2.docs].map(doc => ({ id: doc.id, ...doc.data() }));
  const today = todayStr();
  assignments = assignments.map(a => {
    if (a.deadline && a.deadline < today && a.status !== 'done') {
      return { ...a, status: 'no_response' };
    }
    return a;
  });
  return assignments;
};

export const getAssignmentsGiven = async (userId) => {
  const q = query(collection(db, 'assignments'), where('fromUserId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createAssignment = async (assignment) => {
  const docRef = await addDoc(collection(db, 'assignments'), {
    ...assignment,
    status: assignment.status || 'new',
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...assignment };
};

export const updateAssignment = async (id, changes) => {
  await updateDoc(doc(db, 'assignments', id), changes);
};

// ===================== МАТЕРИАЛЫ =====================
export const getResourceSections = async () => {
  const snapshot = await getDocs(collection(db, 'resourceSections'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addResourceSection = async (title) => {
  const docRef = await addDoc(collection(db, 'resourceSections'), { title, sortOrder: Date.now() });
  return { id: docRef.id, title };
};

export const getResourceLinks = async (sectionId) => {
  const q = query(collection(db, 'resourceLinks'), where('sectionId', '==', sectionId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addResourceLink = async (link) => {
  const docRef = await addDoc(collection(db, 'resourceLinks'), link);
  return { id: docRef.id, ...link };
};

// ===================== БЛОК ВНИМАНИЯ =====================
export const getAttentionBlock = async (userId, departmentId) => {
  const today = todayStr();
  const allTasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  const allTasksSnap = await getDocs(allTasksQuery);
  const allTasks = allTasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const overdueTasks = allTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
  const todayTasks = allTasks.filter(t => t.dueDate === today && t.status !== 'done');
  const received = await getAssignmentsReceived(userId, departmentId);
  const overdueAssignments = received.filter(a => a.deadline && a.deadline < today && a.status !== 'done');
  const todayAssignments = received.filter(a => a.deadline === today && a.status !== 'done');
  return { overdueTasks, todayTasks, overdueAssignments, todayAssignments };
};

// ===================== ЛОГИСТИКА: ИСПОЛНИТЕЛИ =====================
export const getDrivers = async (userId) => {
  const q = query(collection(db, 'logistics_drivers'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addDriver = async (userId, driverData) => {
  const docRef = await addDoc(collection(db, 'logistics_drivers'), {
    userId,
    name: driverData.name,
    contact: driverData.contact || '',
    email: driverData.email || '',
    city: driverData.city || '',
    category: driverData.category || '',
    active: driverData.active !== undefined ? driverData.active : true,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...driverData };
};

export const updateDriver = async (id, changes) => {
  await updateDoc(doc(db, 'logistics_drivers', id), changes);
};

export const deleteDriver = async (id) => {
  await deleteDoc(doc(db, 'logistics_drivers', id));
};

export const getCustomers = async (userId) => {
  const q = query(collection(db, 'logistics_customers'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCustomer = async (userId, customerData) => {
  const docRef = await addDoc(collection(db, 'logistics_customers'), {
    userId,
    name: customerData.name,
    contact: customerData.contact || '',
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...customerData };
};

export const deleteCustomer = async (id) => {
  await deleteDoc(doc(db, 'logistics_customers', id));
};

// ===================== ЛОГИСТИКА: ФИНАНСЫ =====================
export const getPaymentsToDrivers = async (userId) => {
  const q = query(collection(db, 'finance_payments'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addPaymentToDriver = async (payment) => {
  const docRef = await addDoc(collection(db, 'finance_payments'), {
    ...payment,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...payment };
};

export const updatePaymentToDriver = async (id, changes) => {
  await updateDoc(doc(db, 'finance_payments', id), changes);
};

export const deletePaymentToDriver = async (id) => {
  await deleteDoc(doc(db, 'finance_payments', id));
};

export const getPaymentPlan = async (userId, weekStart) => {
  const q = query(
    collection(db, 'finance_plan'),
    where('userId', '==', userId),
    where('weekStart', '==', weekStart)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addPaymentPlanItem = async (item) => {
  const docRef = await addDoc(collection(db, 'finance_plan'), {
    ...item,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...item };
};

export const updatePaymentPlanItem = async (id, changes) => {
  await updateDoc(doc(db, 'finance_plan', id), changes);
};

export const deletePaymentPlanItem = async (id) => {
  await deleteDoc(doc(db, 'finance_plan', id));
};

export const getAllPrepayments = async (userId) => {
  const q = query(collection(db, 'finance_prepayments'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const setPrepayment = async (userId, orderId, status, amount) => {
  const existing = await (async () => {
    const q = query(collection(db, 'finance_prepayments'), where('userId', '==', userId), where('orderId', '==', orderId));
    const snap = await getDocs(q);
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  })();
  if (existing) {
    await updateDoc(doc(db, 'finance_prepayments', existing.id), { status, amount });
  } else {
    await addDoc(collection(db, 'finance_prepayments'), {
      userId,
      orderId,
      status,
      amount,
      createdAt: Timestamp.now()
    });
  }
};

export const updatePrepayment = async (id, changes) => {
  await updateDoc(doc(db, 'finance_prepayments', id), changes);
};

export const getPhotosByDriver = async (userId, driverId) => {
  const q = query(
    collection(db, 'photo_control'),
    where('userId', '==', userId),
    where('driverId', '==', driverId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addPhoto = async (photo) => {
  const docRef = await addDoc(collection(db, 'photo_control'), {
    ...photo,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...photo };
};

export const deletePhoto = async (id) => {
  await deleteDoc(doc(db, 'photo_control', id));
};

// ===================== ЛОГИСТИКА: СТАТИСТИКА =====================
export const getTotalPayments = async (userId, driverId = null, dateFrom = null, dateTo = null) => {
  let q = query(collection(db, 'finance_payments'), where('userId', '==', userId));
  if (driverId) q = query(q, where('driverId', '==', driverId));
  const snapshot = await getDocs(q);
  let payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (dateFrom) payments = payments.filter(p => p.date >= dateFrom);
  if (dateTo) payments = payments.filter(p => p.date <= dateTo);
  const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  return { total, count: payments.length };
};

export const getTotalPlan = async (userId, weekStart = null, status = null) => {
  let q = query(collection(db, 'finance_plan'), where('userId', '==', userId));
  if (weekStart) q = query(q, where('weekStart', '==', weekStart));
  const snapshot = await getDocs(q);
  let plan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (status) plan = plan.filter(p => p.status === status);
  const total = plan.reduce((sum, p) => sum + (p.amount || 0), 0);
  return { total, count: plan.length };
};

export const getTotalPrepaymentsAmount = async (userId, customerId = null, status = null) => {
  let q = query(collection(db, 'finance_prepayments'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  let prepayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (customerId) prepayments = prepayments.filter(p => p.orderId?.includes(customerId));
  if (status) prepayments = prepayments.filter(p => p.status === status);
  const total = prepayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  return { total, count: prepayments.length };
};

// ===================== ГРАФИК СМЕН =====================
export const getShiftsByMonth = async (yearMonth) => {
  const q = query(collection(db, 'shifts'), where('yearMonth', '==', yearMonth));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const setShiftForDate = async (userId, date, value) => {
  const yearMonth = date.slice(0, 7);
  const q = query(collection(db, 'shifts'), where('userId', '==', userId), where('date', '==', date));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    await addDoc(collection(db, 'shifts'), { userId, date, yearMonth, value });
  } else {
    await updateDoc(doc(db, 'shifts', snapshot.docs[0].id), { value });
  }
};

export const deleteShiftByDate = async (userId, date) => {
  const q = query(collection(db, 'shifts'), where('userId', '==', userId), where('date', '==', date));
  const snapshot = await getDocs(q);
  snapshot.forEach(async (docSnap) => {
    await deleteDoc(doc(db, 'shifts', docSnap.id));
  });
};

export const saveShiftsBatch = async (userId, updates) => {
  const batch = writeBatch(db);
  for (const { userId: uId, date, value } of updates) {
    const q = query(collection(db, 'shifts'), where('userId', '==', uId), where('date', '==', date));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const docRef = doc(collection(db, 'shifts'));
      batch.set(docRef, { userId: uId, date, yearMonth: date.slice(0, 7), value });
    } else {
      const docRef = doc(db, 'shifts', snapshot.docs[0].id);
      batch.update(docRef, { value });
    }
  }
  await batch.commit();
};

export const getTodayShifts = async () => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'shifts'), where('date', '==', today));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===================== ЗАПРОСЫ НА ИЗМЕНЕНИЕ ГРАФИКА =====================
export const createShiftRequest = async (fromUserId, proposedShifts, targetMonth) => {
  const docRef = await addDoc(collection(db, 'shift_requests'), {
    fromUserId,
    proposedShifts,
    targetMonth,
    status: 'pending',
    createdAt: Timestamp.now()
  });
  return { id: docRef.id };
};

export const getShiftRequestsForManager = async (departmentId) => {
  const usersSnap = await getDocs(query(collection(db, 'users'), where('departmentId', '==', departmentId)));
  const userIds = usersSnap.docs.map(doc => doc.id);
  if (userIds.length === 0) return [];
  const q = query(collection(db, 'shift_requests'), where('fromUserId', 'in', userIds), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateShiftRequest = async (requestId, status, appliedShifts = null) => {
  if (status === 'approved' && appliedShifts) {
    for (const shift of appliedShifts) {
      await setShiftForDate(shift.userId, shift.date, shift.newValue);
    }
  }
  await updateDoc(doc(db, 'shift_requests', requestId), { status, processedAt: Timestamp.now() });
};

// ===================== ПЕРЕРАБОТКИ =====================
export const createOvertimeRequest = async (fromUserId, shiftDate, originalValue, overtimeHours, targetMonth) => {
  const docRef = await addDoc(collection(db, 'overtime_requests'), {
    fromUserId,
    shiftDate,
    originalValue,
    overtimeHours,
    targetMonth,
    status: 'pending',
    createdAt: Timestamp.now()
  });
  return { id: docRef.id };
};

export const getOvertimeRequestsForManager = async (departmentId) => {
  const usersSnap = await getDocs(query(collection(db, 'users'), where('departmentId', '==', departmentId)));
  const userIds = usersSnap.docs.map(doc => doc.id);
  if (userIds.length === 0) return [];
  const q = query(collection(db, 'overtime_requests'), where('fromUserId', 'in', userIds), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateOvertimeRequest = async (requestId, status) => {
  await updateDoc(doc(db, 'overtime_requests', requestId), { status, processedAt: Timestamp.now() });
};

// ===================== ПОЛЬЗОВАТЕЛИ =====================
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserByLogin = async (login, password) => {
  const q = query(collection(db, 'users'), where('login', '==', login), where('password', '==', password));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const getUserById = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const getUsersByDepartment = async (departmentId) => {
  const q = query(collection(db, 'users'), where('departmentId', '==', departmentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createUser = async (userData) => {
  const docRef = await addDoc(collection(db, 'users'), {
    ...userData,
    isIT: userData.isIT || false,
    points: userData.points || 0,
    pointsHistory: userData.pointsHistory || [],
    kpi: userData.kpi || { day: { calls: 0, sales: 0, rating: 0 }, week: { calls: 0, sales: 0, rating: 0 }, month: { calls: 0, sales: 0, rating: 0 } },
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...userData };
};

export const updateUser = async (userId, changes) => {
  await updateDoc(doc(db, 'users', userId), changes);
};

export const deleteUser = async (userId) => {
  await deleteDoc(doc(db, 'users', userId));
};

export const changePassword = async (userId, oldPassword, newPassword, isAdmin = false) => {
  const user = await getUserById(userId);
  if (!user) throw new Error('Пользователь не найден');
  if (!isAdmin && user.password !== oldPassword) throw new Error('Неверный старый пароль');
  await updateUser(userId, { password: newPassword });
};

// ===================== ПРОГРЕССИКИ (НАЧИСЛЕНИЕ БАЛЛОВ) =====================
export const addPointsToUser = async (fromUserId, toUserId, amount, reason) => {
  const user = await getUserById(toUserId);
  const newPoints = (user.points || 0) + amount;
  const historyItem = { amount, reason, date: new Date().toISOString(), fromUserId };
  const newHistory = [...(user.pointsHistory || []), historyItem];
  await updateUser(toUserId, { points: newPoints, pointsHistory: newHistory });
};

// ===================== ОТЧЁТЫ (KPI) =====================
export const getReports = async (userId, startDate, endDate) => {
  let q = query(collection(db, 'reports'), where('userId', '==', userId));
  if (startDate) q = query(q, where('date', '>=', startDate));
  if (endDate) q = query(q, where('date', '<=', endDate));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllReports = async (startDate, endDate) => {
  let q = collection(db, 'reports');
  if (startDate) q = query(q, where('date', '>=', startDate));
  if (endDate) q = query(q, where('date', '<=', endDate));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveReport = async (userId, report) => {
  const docRef = await addDoc(collection(db, 'reports'), {
    userId,
    date: report.date,
    orders: report.orders || 0,
    requests: report.requests || 0,
    transferred: report.transferred || 0,
    calls: report.calls || 0,
    incoming: report.incoming || 0,
    closed: report.closed || 0,
    foundDriver: report.foundDriver || 0,
    notFoundDriver: report.notFoundDriver || 0,
    comment: report.comment || '',
    departmentName: report.departmentName || '',
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, ...report };
};

// ===================== БРОНИРОВАНИЕ: ЧЕК-ЛИСТЫ =====================
export const getChecklists = async (userId) => {
  const q = query(collection(db, 'booking_checklists'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addChecklist = async (userId, title) => {
  const docRef = await addDoc(collection(db, 'booking_checklists'), {
    userId,
    title,
    items: [],
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, title, items: [] };
};

export const updateChecklist = async (id, items) => {
  await updateDoc(doc(db, 'booking_checklists', id), { items });
};

export const deleteChecklist = async (id) => {
  await deleteDoc(doc(db, 'booking_checklists', id));
};

// ===================== БРОНИРОВАНИЕ: ЗАПИСНАЯ КНИЖКА =====================
export const getNotebook = async (userId) => {
  const q = query(collection(db, 'booking_notebook'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return { notes: [] };
  return { id: snapshot.docs[0].id, notes: snapshot.docs[0].data().notes || [] };
};

export const addNote = async (userId, note) => {
  const notebook = await getNotebook(userId);
  const newNotes = [...(notebook.notes || []), { 
    id: Date.now().toString(), 
    title: note.title, 
    body: note.body || '',
    createdAt: new Date().toISOString() 
  }];
  if (notebook.id) {
    await updateDoc(doc(db, 'booking_notebook', notebook.id), { notes: newNotes });
  } else {
    await addDoc(collection(db, 'booking_notebook'), { userId, notes: newNotes });
  }
};

export const deleteNote = async (userId, noteId) => {
  const notebook = await getNotebook(userId);
  const newNotes = (notebook.notes || []).filter(n => n.id !== noteId);
  await updateDoc(doc(db, 'booking_notebook', notebook.id), { notes: newNotes });
};

export const updateNote = async (userId, noteId, newTitle, newBody) => {
  const notebook = await getNotebook(userId);
  const updatedNotes = (notebook.notes || []).map(note =>
    note.id === noteId ? { ...note, title: newTitle, body: newBody } : note
  );
  await updateDoc(doc(db, 'booking_notebook', notebook.id), { notes: updatedNotes });
};

// ===================== БРОНИРОВАНИЕ: ВЫСЛУГА ЛЕТ =====================
export const getSeniority = async (userId) => {
  const q = query(collection(db, 'booking_seniority'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return { startDate: null, bonus: 0 };
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const setStartDate = async (userId, startDate) => {
  const existing = await getSeniority(userId);
  const start = startDate || new Date().toISOString().split('T')[0];
  if (existing.id) {
    await updateDoc(doc(db, 'booking_seniority', existing.id), { startDate: start });
  } else {
    await addDoc(collection(db, 'booking_seniority'), { userId, startDate: start });
  }
};

export const calculateBonus = (years) => {
  if (years < 1) return 0;
  if (years < 2) return 3000;
  if (years < 3) return 5000;
  return 8000;
};

// ===================== БРОНИРОВАНИЕ: KPI (ЗАГЛУШКА) =====================
export const getKPI = async (userId) => {
  return {
    day: { calls: 12, sales: 3, rating: 4.5 },
    week: { calls: 87, sales: 21, rating: 4.7 },
    month: { calls: 340, sales: 89, rating: 4.6 }
  };
};

// ===================== РАЗВИТИЕ: ДОГОВОРЫ =====================
export const getContracts = async (userId, departmentId) => {
  const q = query(collection(db, 'contracts'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addContract = async (contract) => {
  const docRef = await addDoc(collection(db, 'contracts'), {
    ...contract,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { id: docRef.id, ...contract };
};

export const updateContract = async (id, changes) => {
  await updateDoc(doc(db, 'contracts', id), { ...changes, updatedAt: Timestamp.now() });
};

export const deleteContract = async (id) => {
  await deleteDoc(doc(db, 'contracts', id));
};

export const getExpiringContracts = async (userId, daysThreshold = 30) => {
  const contracts = await getContracts(userId, null);
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysThreshold);
  return contracts.filter(c => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    return end >= today && end <= future;
  });
};
// ===================== ОБНОВЛЕНИЕ ПОРЯДКА СОТРУДНИКОВ =====================
export const updateUsersOrder = async (orderedUsers) => {
  const batch = writeBatch(db);
  orderedUsers.forEach((user, index) => {
    const userRef = doc(db, 'users', user.id);
    batch.update(userRef, { order: index });
  });
  await batch.commit();
};
// ===================== УВЕДОМЛЕНИЯ =====================
// Запросить разрешение на уведомления
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Браузер не поддерживает уведомления');
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

// Отправить браузерное уведомление
export const sendBrowserNotification = (title, body, icon = '/logo.png') => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
};

// Сохранить уведомление в localStorage для внутреннего интерфейса
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
  // Оставляем только последние 50 уведомлений
  if (notifications.length > 50) notifications.pop();
  localStorage.setItem('app_notifications', JSON.stringify(notifications));
  // Диспатчим событие для обновления счётчика
  window.dispatchEvent(new Event('notifications-updated'));
};

// Получить все уведомления
export const getNotifications = () => {
  return JSON.parse(localStorage.getItem('app_notifications') || '[]');
};

// Отметить уведомление как прочитанное
export const markNotificationRead = (id) => {
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem('app_notifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-updated'));
};

// Отметить все как прочитанные
export const markAllNotificationsRead = () => {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem('app_notifications', JSON.stringify(updated));
  window.dispatchEvent(new Event('notifications-updated'));
};

// ===================== ПОЛУЧЕНИЕ УНИКАЛЬНЫХ ОТДЕЛОВ ИЗ ПОЛЬЗОВАТЕЛЕЙ =====================
export const getUniqueDepartments = async () => {
  const users = await getAllUsers();
  const deptMap = new Map();
  users.forEach(user => {
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