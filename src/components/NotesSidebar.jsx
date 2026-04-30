import { useState, useEffect, useRef } from 'react';
import { getNotebook, addNote, deleteNote, updateNote } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

function AutosizeTextarea({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{
        width: '100%',
        marginBottom: '8px',
        overflow: 'hidden',
        resize: 'vertical',
        minHeight: '40px'
      }}
      onInput={adjustHeight}
    />
  );
}

export default function NotesSidebar({ userId }) {
  const [notebook, setNotebook] = useState({ notes: [] });
  const [loading, setLoading] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [viewingNote, setViewingNote] = useState(null);

  const loadNotebook = async () => {
    setLoading(true);
    try {
      const data = await getNotebook(userId);
      setNotebook(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotebook();
  }, [userId]);

  const handleAddNote = async () => {
    if (!newNoteTitle.trim()) return;
    const tempId = `temp_${Date.now()}`;
    const newNote = {
      id: tempId,
      title: newNoteTitle.trim(),
      body: newNoteBody.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Optimistic update
    setNotebook(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));
    
    setNewNoteTitle('');
    setNewNoteBody('');
    
    try {
      const created = await addNote(userId, { title: newNote.title, body: newNote.body });
      // Replace temp with real note
      setNotebook(prev => ({
        ...prev,
        notes: prev.notes.map(n => n.id === tempId ? { ...created, id: created.id } : n)
      }));
    } catch (err) {
      // Revert on error
      setNotebook(prev => ({
        ...prev,
        notes: prev.notes.filter(n => n.id !== tempId)
      }));
      console.error(err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Удалить заметку?')) return;
    
    // Optimistic update
    setNotebook(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== noteId)
    }));
    
    try {
      await deleteNote(userId, noteId);
    } catch (err) {
      // Reload to sync on error
      loadNotebook();
      console.error(err);
    }
  };

  const handleUpdateNote = async (noteId, newTitle, newBody) => {
    const prevNote = notebook.notes.find(n => n.id === noteId);
    
    // Optimistic update
    setNotebook(prev => ({
      ...prev,
      notes: prev.notes.map(n => 
        n.id === noteId ? { ...n, title: newTitle, body: newBody } : n
      )
    }));
    
    setViewingNote(null);
    
    try {
      await updateNote(userId, noteId, newTitle, newBody);
    } catch (err) {
      // Revert on error
      setNotebook(prev => ({
        ...prev,
        notes: prev.notes.map(n => 
          n.id === noteId ? prevNote : n
        )
      }));
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ width: '280px', flexShrink: 0 }}>
      <div className="card" style={{ padding: '16px' }}>
        <h3>📓 Заметки</h3>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Заголовок заметки"
            value={newNoteTitle}
            onChange={e => setNewNoteTitle(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          <AutosizeTextarea
            placeholder="Текст заметки"
            value={newNoteBody}
            onChange={e => setNewNoteBody(e.target.value)}
          />
          <button className="primary" onClick={handleAddNote}>➕ Добавить</button>
        </div>
        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          {notebook.notes.map(note => (
            <li
              key={note.id}
              style={{
                marginBottom: '8px',
                borderBottom: '1px solid var(--border-light)',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => setViewingNote(note)}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <strong>{note.title}</strong>
                <small style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(note.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </small>
              </div>
              <button
                className="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(note.id);
                }}
                style={{ flexShrink: 0, padding: '4px 8px', fontSize: '12px' }}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>

        {viewingNote && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '500px' }}>
              <h3>Редактирование заметки</h3>
              <input
                type="text"
                value={viewingNote.title}
                onChange={e => setViewingNote({ ...viewingNote, title: e.target.value })}
                style={{ width: '100%', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}
              />
              <AutosizeTextarea
                value={viewingNote.body}
                onChange={e => setViewingNote({ ...viewingNote, body: e.target.value })}
                placeholder="Текст заметки..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="primary" onClick={() => handleUpdateNote(viewingNote.id, viewingNote.title, viewingNote.body)}>Сохранить</button>
                <button className="secondary" onClick={() => setViewingNote(null)}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}