import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  getEvents, addEvent, updateEvent, deleteEvent, 
  getTasksAsEvents, addTask, updateTask, deleteTask 
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function Calendar({ userId, timezone }) {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState('event');
  const [hasEndDate, setHasEndDate] = useState(false);
  const calendarRef = useRef(null);

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
        end: ev.endDatetime || undefined,
        extendedProps: { type: 'event', originalId: ev.id, comment: ev.comment || '' }
      }));
      const allEvents = [...formattedEvents, ...taskEvents];
      setEvents(allEvents);
      if (calendarRef.current) {
        calendarRef.current.getApi().refetchEvents();
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
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
    setCurrentItem({
      title: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      comment: '',
      allDay: selectInfo.allDay
    });
    setItemType('event');
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
        status: ext.status
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
        const dueDate = currentItem.start.split('T')[0];
        if (currentItem.id) {
          await updateTask(currentItem.id, { title: currentItem.title, dueDate, comment: currentItem.comment });
        } else {
          await addTask({
            userId,
            title: currentItem.title,
            dueDate,
            comment: currentItem.comment,
            status: 'active'
          });
        }
        window.dispatchEvent(new Event('tasks-updated'));
      } else {
        const eventData = {
          title: currentItem.title,
          datetime: currentItem.start,
          comment: currentItem.comment
        };
        if (hasEndDate && currentItem.end) {
          eventData.endDatetime = currentItem.end;
        }
        if (currentItem.id) {
          await updateEvent(currentItem.id, eventData);
        } else {
          await addEvent({ userId, ...eventData });
        }
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
      if (itemType === 'task') {
        await deleteTask(currentItem.id);
        window.dispatchEvent(new Event('tasks-updated'));
      } else {
        await deleteEvent(currentItem.id);
      }
      setShowModal(false);
      await loadAllEvents();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card">
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
        height="auto"
        locale="ru"
        firstDay={1}
        timeZone={timezone}
        buttonText={{
          today: 'Сегодня',
          month: 'Месяц',
          week: 'Неделя',
          day: 'День'
        }}
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{currentItem?.id ? 'Редактировать' : 'Создать'}</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ marginRight: 15 }}>
                <input
                  type="radio"
                  value="task"
                  checked={itemType === 'task'}
                  onChange={() => setItemType('task')}
                /> Задача (только дата)
              </label>
              <label>
                <input
                  type="radio"
                  value="event"
                  checked={itemType === 'event'}
                  onChange={() => setItemType('event')}
                /> Событие (с временем)
              </label>
            </div>
            <input
              type="text"
              placeholder="Название"
              value={currentItem.title}
              onChange={e => setCurrentItem({...currentItem, title: e.target.value})}
            />
            <label>Дата / время начала:</label>
            <input
              type={itemType === 'task' ? 'date' : 'datetime-local'}
              value={itemType === 'task' ? currentItem.start?.split('T')[0] : currentItem.start?.slice(0, 16)}
              onChange={e => {
                const newStart = itemType === 'task' ? e.target.value : e.target.value;
                setCurrentItem({...currentItem, start: newStart});
              }}
            />
            {itemType === 'event' && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={e => setHasEndDate(e.target.checked)}
                  />
                  Указать дату окончания
                </label>
                {hasEndDate && (
                  <input
                    type="datetime-local"
                    placeholder="Окончание"
                    value={currentItem.end?.slice(0, 16) || ''}
                    onChange={e => setCurrentItem({...currentItem, end: e.target.value})}
                  />
                )}
              </div>
            )}
            <textarea
              placeholder="Комментарий"
              value={currentItem.comment || ''}
              onChange={e => setCurrentItem({...currentItem, comment: e.target.value})}
              rows={3}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button className="primary" onClick={saveItem}>Сохранить</button>
              {currentItem.id && <button className="danger" onClick={deleteItem}>Удалить</button>}
              <button className="secondary" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
            {itemType === 'task' && (
              <p style={{ fontSize: 12, marginTop: 10, color: 'var(--text-muted)' }}>Задача будет отображаться как целодневное событие.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}