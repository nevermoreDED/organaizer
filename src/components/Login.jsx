import { useState } from 'react';
import { getUserByLogin } from '../services/dataService';

export default function Login({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await getUserByLogin(login, password);
      if (!user) {
        setError('Неверный логин или пароль');
        return;
      }
      onLogin(user);
    } catch (err) {
      setError('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: '100px auto' }}>
      <h2 style={{ textAlign: 'center' }}>Органайзер CRM</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Логин" value={login} onChange={e => setLogin(e.target.value)} required style={{ marginBottom: 16 }} />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginBottom: 24 }} />
        <button type="submit" className="primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        {error && <p style={{ color: '#ff9999', marginTop: 16 }}>{error}</p>}
      </form>
    </div>
  );
}