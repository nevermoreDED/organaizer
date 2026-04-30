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
          <button className="primary" onClick={handleAddNote} style={{ width: '100%' }}>
            Добавить заметку
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {notebook.notes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Нет заметок</p>
          ) : (
            notebook.notes.map(note => (
              <div
                key={note.id}
                onClick={() => setViewingNote(note)}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  borderLeft: viewingNote?.id === note.id ? '3px solid var(--color-primary)' : '3px solid transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>{note.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {new Date(note.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {note.body}
                </div>
              </div>
            ))
          )}
        </div>

        {viewingNote && (
          <div
            className="modal-overlay"
            onClick={() => setViewingNote(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                width: '500px',
                maxWidth: '90vw',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={viewingNote.title}
                  onChange={(e) => setViewingNote({ ...viewingNote, title: e.target.value })}
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    flex: 1,
                    borderBottom: '2px solid var(--border-light)',
                    padding: '4px 0'
                  }}
                />
                <button
                  onClick={() => setViewingNote(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              <AutosizeTextarea
                value={viewingNote.body}
                onChange={(e) => setViewingNote({ ...viewingNote, body: e.target.value })}
                placeholder="Текст заметки..."
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  className="danger"
                  onClick={() => {
                    if (window.confirm('Удалить заметку?')) {
                      handleDeleteNote(viewingNote.id);
                      setViewingNote(null);
                    }
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  Удалить
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    handleUpdateNote(viewingNote.id, viewingNote.title, viewingNote.body);
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
