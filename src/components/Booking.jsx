import { useState, useEffect } from 'react';
import {
  getChecklists, addChecklist, updateChecklist, deleteChecklist,
  getNotebook, addNote, deleteNote, updateNote
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function Booking({ userId }) {
  const [activeTab, setActiveTab] = useState('checklists');
  const [loading, setLoading] = useState(false);
  const [checklists, setChecklists] = useState([]);
  const [notebook, setNotebook] = useState({ notes: [] });
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [viewingNote, setViewingNote] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lists, noteBook] = await Promise.all([
        getChecklists(userId),
        getNotebook(userId)
      ]);
      setChecklists(lists);
      setNotebook(noteBook);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleAddChecklist = async () => {
    if (!newChecklistTitle) return;
    await addChecklist(userId, newChecklistTitle);
    setNewChecklistTitle('');
    loadData();
  };

  const toggleChecklistItem = async (checklistId, itemIndex) => {
    const checklist = checklists.find(c => c.id === checklistId);
    const updatedItems = [...checklist.items];
    updatedItems[itemIndex].done = !updatedItems[itemIndex].done;
    await updateChecklist(checklistId, updatedItems);
    loadData();
  };

  const addChecklistItem = async (checklistId) => {
    const text = prompt('Введите пункт чек-листа:');
    if (!text) return;
    const checklist = checklists.find(c => c.id === checklistId);
    const updatedItems = [...(checklist.items || []), { text, done: false }];
    await updateChecklist(checklistId, updatedItems);
    loadData();
  };

  const deleteChecklist = async (id) => {
    if (window.confirm('Удалить чек-лист?')) {
      await deleteChecklist(id);
      loadData();
    }
  };

  const handleAddNote = async () => {
    if (!newNoteTitle.trim()) return;
    await addNote(userId, { title: newNoteTitle.trim(), body: newNoteBody.trim() });
    setNewNoteTitle('');
    setNewNoteBody('');
    loadData();
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Удалить заметку?')) {
      await deleteNote(userId, noteId);
      loadData();
    }
  };

  const handleUpdateNote = async (noteId, newTitle, newBody) => {
    await updateNote(userId, noteId, newTitle, newBody);
    setViewingNote(null);
    loadData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="card">
      <h2>🏨 Бронирование</h2>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-light)', marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={activeTab === 'checklists' ? 'primary' : 'secondary'} onClick={() => setActiveTab('checklists')}>Чек-листы</button>
        <button className={activeTab === 'notebook' ? 'primary' : 'secondary'} onClick={() => setActiveTab('notebook')}>Записная книжка</button>
        <button className={activeTab === 'calculator' ? 'primary' : 'secondary'} onClick={() => setActiveTab('calculator')}>Калькулятор</button>
        <button className={activeTab === 'sounds' ? 'primary' : 'secondary'} onClick={() => setActiveTab('sounds')}>Звуковые кнопки</button>
      </div>

      {activeTab === 'checklists' && (
        <div>
          <h3>📋 Чек-листы</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <input type="text" placeholder="Название чек-листа" value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} />
            <button className="primary" onClick={handleAddChecklist}>➕ Создать</button>
          </div>
          {checklists.map(cl => (
            <div key={cl.id} style={{ border: '1px solid var(--border-light)', padding: 10, marginBottom: 10, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{cl.title}</strong>
                <button className="danger" onClick={() => deleteChecklist(cl.id)}>🗑️</button>
              </div>
              <ul>
                {(cl.items || []).map((item, idx) => (
                  <li key={idx} style={{ textDecoration: item.done ? 'line-through' : 'none', cursor: 'pointer' }} onClick={() => toggleChecklistItem(cl.id, idx)}>
                    {item.text}
                  </li>
                ))}
              </ul>
              <button className="secondary" onClick={() => addChecklistItem(cl.id)}>➕ Добавить пункт</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'notebook' && (
        <div>
          <h3>📓 Записная книжка</h3>
          <div style={{ marginBottom: 15 }}>
            <input type="text" placeholder="Заголовок заметки" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} style={{ width: '70%', marginRight: 10 }} />
            <button className="primary" onClick={handleAddNote}>➕ Добавить</button>
          </div>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {notebook.notes.map(note => (
              <li key={note.id} style={{ marginBottom: 8, borderBottom: '1px solid var(--border-light)', padding: 8, cursor: 'pointer' }} onClick={() => setViewingNote(note)}>
                <strong>{note.title}</strong> <small>({new Date(note.createdAt).toLocaleDateString()})</small>
                <button className="danger" onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} style={{ float: 'right' }}>🗑️</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'calculator' && (
        <div>
          <h3>🧮 Калькулятор</h3>
          <Calculator />
        </div>
      )}

      {activeTab === 'sounds' && (
        <div>
          <h3>🔊 Звуковые кнопки</h3>
          <div style={{ display: 'flex', gap: 15 }}>
            <button className="primary" onClick={() => { const audio = new Audio('/meow.mp3'); audio.play(); }}>🐱 Котик мяукает</button>
            <button className="primary" onClick={() => { const audio = new Audio('/beep.mp3'); audio.play(); }}>🚗 Машина бибикает</button>
          </div>
        </div>
      )}

      {viewingNote && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: 500 }}>
            <h3>Редактирование заметки</h3>
            <input type="text" value={viewingNote.title} onChange={e => setViewingNote({ ...viewingNote, title: e.target.value })} style={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
            <textarea value={viewingNote.body} onChange={e => setViewingNote({ ...viewingNote, body: e.target.value })} rows={10} placeholder="Текст заметки..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="primary" onClick={() => handleUpdateNote(viewingNote.id, viewingNote.title, viewingNote.body)}>Сохранить</button>
              <button className="secondary" onClick={() => setViewingNote(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);
    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const result = calculate(prevValue, inputValue, operator);
      setDisplay(String(result));
      setPrevValue(result);
    }
    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (a, b, op) => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return a / b;
    return b;
  };

  const equals = () => {
    if (!operator) return;
    const inputValue = parseFloat(display);
    const result = calculate(prevValue, inputValue, operator);
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  return (
    <div style={{ maxWidth: 300, margin: '0 auto' }}>
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: 15, fontSize: 24, textAlign: 'right', marginBottom: 10, borderRadius: 8 }}>{display}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        <button className="secondary" onClick={clear}>C</button>
        <button className="secondary" onClick={() => performOperation('/')}>/</button>
        <button className="secondary" onClick={() => performOperation('*')}>*</button>
        <button className="secondary" onClick={() => performOperation('-')}>-</button>
        {[7,8,9].map(n => <button key={n} className="secondary" onClick={() => inputDigit(n)}>{n}</button>)}
        <button className="secondary" onClick={() => performOperation('+')}>+</button>
        {[4,5,6].map(n => <button key={n} className="secondary" onClick={() => inputDigit(n)}>{n}</button>)}
        <button className="primary" onClick={equals} style={{ gridRow: 'span 2' }}>=</button>
        {[1,2,3].map(n => <button key={n} className="secondary" onClick={() => inputDigit(n)}>{n}</button>)}
        <button className="secondary" onClick={() => inputDigit(0)}>0</button>
        <button className="secondary" onClick={inputDecimal}>.</button>
      </div>
    </div>
  );
}