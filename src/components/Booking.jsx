import { useState, useEffect } from 'react';
import {
  getChecklists, addChecklist, updateChecklist, deleteChecklist, addLog
} from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function Booking({ userId, currentUser }) {
  const [activeTab, setActiveTab] = useState('checklists');
  const [loading, setLoading] = useState(false);
  const [checklists, setChecklists] = useState([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const lists = await getChecklists(userId);
      setChecklists(lists);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, [userId]);

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const newList = await addChecklist(userId, newChecklistTitle);
      setChecklists(prev => [...prev, newList]);
      setNewChecklistTitle('');
      await addLog(currentUser.id, currentUser.fullName, 'Создание чек-листа', newChecklistTitle);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleChecklistItem = async (checklistId, itemIndex) => {
    const checklist = checklists.find(c => c.id === checklistId);
    const updatedItems = [...checklist.items];
    updatedItems[itemIndex].done = !updatedItems[itemIndex].done;
    await updateChecklist(checklistId, updatedItems);
    setChecklists(prev => prev.map(c => 
      c.id === checklistId ? { ...c, items: updatedItems } : c
    ));
    const action = updatedItems[itemIndex].done ? 'Выполнение пункта чек-листа' : 'Отмена выполнения пункта чек-листа';
    await addLog(currentUser.id, currentUser.fullName, action, `${checklist.title}: ${updatedItems[itemIndex].text}`);
  };

  const addChecklistItem = async (checklistId) => {
    const text = prompt('Введите пункт чек-листа:');
    if (!text) return;
    const checklist = checklists.find(c => c.id === checklistId);
    const updatedItems = [...(checklist.items || []), { text, done: false }];
    await updateChecklist(checklistId, updatedItems);
    setChecklists(prev => prev.map(c => 
      c.id === checklistId ? { ...c, items: updatedItems } : c
    ));
    await addLog(currentUser.id, currentUser.fullName, 'Добавление пункта чек-листа', `${checklist.title}: ${text}`);
  };

  const deleteChecklist = async (id) => {
    if (window.confirm('Удалить чек-лист?')) {
      const checklist = checklists.find(c => c.id === id);
      await deleteChecklist(id);
      setChecklists(prev => prev.filter(c => c.id !== id));
      await addLog(currentUser.id, currentUser.fullName, 'Удаление чек-листа', checklist.title);
    }
  };

  if (loading && checklists.length === 0) return <LoadingSpinner />;

  return (
    <div className="restricted-card">
      <h2>🏨 Бронирование</h2>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-light)', marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={activeTab === 'checklists' ? 'primary' : 'secondary'} onClick={() => setActiveTab('checklists')}>Чек-листы</button>
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
          <p style={{ fontSize: 12, marginTop: 10 }}>Примечание: звуковые файлы (meow.mp3, beep.mp3) нужно положить в папку public/ вашего проекта.</p>
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

  const handleBackspace = () => {
    if (waitingForOperand) {
      return;
    }
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default for keys that might cause scrolling or form submission
      if (
        ['Enter', '=', 'Escape', 'Backspace', '.', '+', '-', '*', '/', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'c', 'C']
        .includes(e.key)
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          inputDigit(Number(e.key));
          break;
        case '.':
          inputDecimal();
          break;
        case '+':
          performOperation('+');
          break;
        case '-':
          performOperation('-');
          break;
        case '*':
          performOperation('*');
          break;
        case '/':
          performOperation('/');
          break;
        case 'Enter':
        case '=':
          equals();
          break;
        case 'Escape':
        case 'c':
        case 'C':
          clear();
          break;
        case 'Backspace':
          handleBackspace();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty deps because we only want to add once when the component mounts

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