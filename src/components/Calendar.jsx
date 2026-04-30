import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getEvents, addEvent, updateEvent, deleteEvent, getTasksAsEvents, addTask, updateTask, deleteTask } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

const Calendar = forwardRef(({ userId, timezone }, ref) => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState('task');
  const [hasEndDate, setHasEndDate] = useState(false);
  const calendarRef = useRef(null);

  const formatDateTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr.slice(0, 16);
    return `${dateStr}T12:00`;
  };

  useImperativeHandle(ref, () => ({
    openCreateModal: () => {
      setCurrentItem({
        title: '',
        start: '',
        end: '',
        comment: '',
        allDay: true,
        status: 'active'
      });
      setItemType('task');
      setHasEndDate(false);
      setShowModal(true);
    }
  }));

   const loadAllEvents = async () => {
     setLoading(true);
     try {
       const [calendarEvents, taskEvents] = await Promise.all([
         getEvents(userId),
         getTasksAsEvents(userId)
       ]);
       const formattedEvents = calendarEvents.map(ev => ({
         id: ev.id,
         title: ev.title,
         start: ev.datetime,
         end: ev.endDatetime,
         comment: ev.comment,
         type: 'event'
       }));
       const formattedTasks = taskEvents.map(ev => ({
         id: ev.id,
         title: ev.title,
         start: ev.dueDate,
         comment: ev.comment,
         status: ev.status,
         type: 'task'
       }));
       setEvents([...formattedEvents, ...formattedTasks]);
     } catch (err) {
       console.error('Ошибка загрузки событий:', err);
     }
     setLoading(false);
   };

  useEffect(() => {
    if (userId) {
      loadAllEvents();
      const handleTaskUpdate = () => loadAllEvents();
      window.addEventListener('tasks-updated', handleTaskUpdate);
      return () => window.removeEventListener('tasks-updated', handleTaskUpdate);
    }
  }, [userId]);

  const handleDateSelect = (selectInfo) => {
    let start = selectInfo.startStr;
    if (selectInfo.allDay) {
      setItemType('task');
      start = start.split('T')[0];
    } else {
      setItemType('event');
    }
    setCurrentItem({
      title: '',
      start: start,
      end: selectInfo.endStr,
      comment: '',
      allDay: selectInfo.allDay,
      status: 'active'
    });
    setHasEndDate(false);
    setShowModal(true);
  };

  const handleEventClick = (clickInfo) => {
    const ext = clickInfo.event.extendedProps;
    if (ext.type === 'task') {
      setCurrentItem({
        id: ext.originalId,
        title: clickInfo.event.title,
        start: clickInfo.event.startStr,
        comment: ext.comment,
        status: ext.status || 'active'
      });
      setItemType('task');
      setHasEndDate(false);
    } else {
      setCurrentItem({
        id: ext.originalId,
        title: clickInfo.event.title,
        start: clickInfo.event.startStr,
        end: clickInfo.event.endStr || '',
        comment: ext.comment
      });
      setItemType('event');
      setHasEndDate(!!clickInfo.event.endStr);
    }
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!currentItem.title) return;
    try {
      if (itemType === 'task') {
        const dueDate = currentItem.start ? currentItem.start.split('T')[0] : null;
        if (!dueDate) {
          alert('Выберите дату задачи');
          return;
        }
        const taskStatus = currentItem.status || 'active';
        if (currentItem.id) {
          await updateTask(currentItem.id, { 
            title: currentItem.title, 
            dueDate, 
            comment: currentItem.comment,
            status: taskStatus
          });
        } else {
          await addTask({
            userId,
            title: currentItem.title,
            dueDate,
            comment: currentItem.comment,
            status: taskStatus
          });
        }
        window.dispatchEvent(new Event('tasks-updated'));
      } else {
        if (!currentItem.start) {
          alert('Выберите дату и время начала события');
          return;
        }
        const eventData = {
          title: currentItem.title,
          datetime: currentItem.start,
          comment: currentItem.comment
        };
        if (hasEndDate && currentItem.end) eventData.endDatetime = currentItem.end;
        if (currentItem.id) {
          await updateEvent(currentItem.id, eventData);
        } else {
          await addEvent({ userId, ...eventData });
        }
        window.dispatchEvent(new Event('tasks-updated'));
      }
      setShowModal(false);
      await loadAllEvents();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  };

  const deleteItem = async () => {
    if (!window.confirm('Удалить?')) return;
    try {
      if (itemType === 'task') await deleteTask(currentItem.id);
      else await deleteEvent(currentItem.id);
      window.dispatchEvent(new Event('tasks-updated'));
      setShowModal(false);
      await loadAllEvents();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

   const toggleTaskStatus = async () => {
     if (itemType !== 'task' || !currentItem.id) return;
     const newStatus = currentItem.status === 'done' ? 'active' : 'done';
     try {
       await updateTask(currentItem.id, { status: newStatus });
       setCurrentItem({ ...currentItem, status: newStatus });
       window.dispatchEvent(new Event('tasks-updated'));
       await loadAllEvents();
     } catch (err) {
       console.error('Ошибка изменения статуса:', err);
     }
   };

   const eventContent = (arg) => {
     const { event } = arg;
     const timeStr = event.start.getHours().toString().padStart(2, '0') + ':' + 
                     event.start.getMinutes().toString().padStart(2, '0');
     const title = event.title;
     return (
       <div className="fc-content" style={{ display: 'flex', alignItems: 'center' }}>
         <span style={{ fontWeight: 'bold', marginRight: 8 }}>{timeStr}</span>
         <span>{title}</span>
       </div>
     );
   };

   if (loading) return <LoadingSpinner />;

  return (
    <div className="card" style={{ marginBottom: 30 }}>
      <h2>📅 Календарь</h2>
       <FullCalendar
         ref={calendarRef}
         plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
         headerToolbar={{
           left: 'prev,next today',
           center: 'title',
           right: 'dayGridMonth,timeGridWeek,timeGridDay'
         }}
         initialView="dayGridMonth"
         selectable={true}
         select={handleDateSelect}
         eventClick={handleEventClick}
         events={events}
         eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
         height="auto"
         locale="ru"
         firstDay={1}
         timeZone={timezone}
         buttonText={{ today: 'Сегодня', month: 'Месяц', week: 'Неделя', day: 'День' }}
       />

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>{currentItem?.id ? 'Редактировать' : 'Создать'}</h3>
            <div style={{ marginBottom: 15, display: 'flex', gap: 15 }}>
              <label><input type="radio" value="task" checked={itemType === 'task'} onChange={() => setItemType('task')} /> Задача</label>
              <label><input type="radio" value="event" checked={itemType === 'event'} onChange={() => setItemType('event')} /> Событие</label>
            </div>
            <input type="text" placeholder="Название" value={currentItem.title} onChange={e => setCurrentItem({...currentItem, title: e.target.value})} style={{ width: '100%', marginBottom: 12 }} />
            
            {itemType === 'task' ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label>Дата:</label>
                  <input type="date" value={currentItem.start?.split('T')[0] || ''} onChange={e => setCurrentItem({...currentItem, start: e.target.value})} style={{ width: '100%' }} />
                </div>
                {currentItem.id && (
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label>Статус:</label>
                    <button type="button" onClick={toggleTaskStatus} style={{ background: currentItem.status === 'done' ? '#28a745' : '#ffc107', color: 'white', padding: '4px 12px' }}>
                      {currentItem.status === 'done' ? '✅ Выполнена' : '🟡 Не выполнена'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label>Дата и время начала:</label>
                  <input type="datetime-local" value={formatDateTimeLocal(currentItem.start)} onChange={e => setCurrentItem({...currentItem, start: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label><input type="checkbox" checked={hasEndDate} onChange={e => setHasEndDate(e.target.checked)} /> Указать дату окончания</label>
                  {hasEndDate && <input type="datetime-local" value={formatDateTimeLocal(currentItem.end)} onChange={e => setCurrentItem({...currentItem, end: e.target.value})} style={{ width: '100%', marginTop: 8 }} />}
                </div>
              </>
            )}
            
            <textarea placeholder="Комментарий" value={currentItem.comment || ''} onChange={e => setCurrentItem({...currentItem, comment: e.target.value})} rows={3} style={{ width: '100%', marginBottom: 12 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={saveItem}>Сохранить</button>
              {currentItem.id && <button onClick={deleteItem} style={{ background: '#dc3545', color: 'white' }}>Удалить</button>}
              <button onClick={() => setShowModal(false)}>Отмена</button>
            </div>
            {itemType === 'task' && <p style={{ fontSize: 12, marginTop: 10 }}>Если дата не указана, задача не будет отображаться в календаре.</p>}
          </div>
        </div>
      )}
    </div>
  );
});

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(8px)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-md)',
  padding: '20px',
  width: '400px',
  color: 'var(--text-primary)'
};

export default Calendar;