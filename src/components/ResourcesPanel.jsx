import { useState, useEffect } from 'react';
import { getResourceSections, addResourceSection, getResourceLinks, addResourceLink } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

export default function ResourcesPanel() {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [links, setLinks] = useState([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await getResourceSections();
      setSections(data);
      if (data.length && !selectedSection) setSelectedSection(data[0]);
    } catch (err) {
      setError('Ошибка загрузки разделов');
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async (sectionId) => {
    try {
      const data = await getResourceLinks(sectionId);
      setLinks(data);
    } catch (err) {
      setError('Ошибка загрузки ссылок');
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedSection) loadLinks(selectedSection.id);
  }, [selectedSection]);

  const handleAddSection = async () => {
    if (!newSectionTitle) return;
    try {
      await addResourceSection(newSectionTitle);
      setNewSectionTitle('');
      loadSections();
    } catch (err) {
      setError('Ошибка создания раздела');
    }
  };

  const handleAddLink = async () => {
    if (!newLink.title || !newLink.url) return;
    try {
      await addResourceLink({ ...newLink, sectionId: selectedSection.id });
      setNewLink({ title: '', url: '' });
      loadLinks(selectedSection.id);
    } catch (err) {
      setError('Ошибка добавления ссылки');
    }
  };

  if (loading && sections.length === 0) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red', padding: 10 }}>{error}</div>;

  return (
    <div style={{ marginBottom: 30 }}>
      <h2>📚 Быстрый доступ к материалам</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSelectedSection(s)} style={{ fontWeight: selectedSection?.id === s.id ? 'bold' : 'normal' }}>
            📂 {s.title}
          </button>
        ))}
        <div>
          <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Новый раздел" />
          <button onClick={handleAddSection}>➕</button>
        </div>
      </div>
      {selectedSection && (
        <div>
          <h3>{selectedSection.title}</h3>
          <ul>
            {links.map(link => (
              <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></li>
            ))}
          </ul>
          <div style={{ marginTop: 10 }}>
            <input placeholder="Название ссылки" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} />
            <input placeholder="URL (ссылка внутри CRM)" value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} style={{ marginLeft: 8 }} />
            <button onClick={handleAddLink} style={{ marginLeft: 8 }}>➕ Добавить ссылку</button>
          </div>
        </div>
      )}
    </div>
  );
}