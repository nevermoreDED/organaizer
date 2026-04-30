import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function ImportModal({ isOpen, onClose, onImport, title, expectedColumns, requiredColumns, sampleTemplate }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) {
        setError('Файл пуст или не содержит данных');
        setPreviewData([]);
        return;
      }
      const firstRow = rows[0];
      const missingColumns = expectedColumns.filter(col => !firstRow.hasOwnProperty(col));
      if (missingColumns.length > 0) {
        setError(`Отсутствуют обязательные колонки: ${missingColumns.join(', ')}. Ожидаются: ${expectedColumns.join(', ')}`);
        setPreviewData([]);
        return;
      }
      setPreviewData(rows.slice(0, 5));
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Выберите файл');
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        await onImport(rows);
        setFile(null);
        setPreviewData([]);
        onClose();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Ошибка при импорте: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', width: '90%' }}>
        <h3>Импорт: {title}</h3>
        <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <strong>📌 Требования к файлу:</strong>
          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
            <li>Формат: <strong>.xlsx или .xls</strong></li>
            <li>Первая строка – заголовки колонок</li>
            <li>Обязательные колонки: <strong>{expectedColumns.join(', ')}</strong></li>
            {requiredColumns && <li>Обязательные для заполнения: <strong>{requiredColumns.join(', ')}</strong></li>}
            <li>Пример структуры: <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '4px', marginTop: '5px' }}>{sampleTemplate}</pre></li>
          </ul>
        </div>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        {error && <p style={{ color: '#ff9999', marginTop: '10px' }}>{error}</p>}
        {previewData.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <strong>Предпросмотр (первые 5 строк):</strong>
            <div style={{ overflowX: 'auto', marginTop: '5px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {expectedColumns.map(col => (
                      <th key={col} style={{ border: '1px solid var(--border-light)', padding: '4px', background: 'rgba(255,255,255,0.1)' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {expectedColumns.map(col => (
                        <td key={col} style={{ border: '1px solid var(--border-light)', padding: '4px' }}>{row[col] !== undefined ? String(row[col]) : ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button className="primary" onClick={handleImport} disabled={loading || !file || error}>
            {loading ? 'Импорт...' : 'Импортировать'}
          </button>
          <button className="secondary" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}