import { useState } from 'react';
import { getUserByLogin, addLog } from '../services/dataService';

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
      // Логируем вход
      await addLog(user.id, user.fullName, 'Вход в систему', `Логин: ${user.login}`);
      onLogin(user);
    } catch (err) {
      setError('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restricted-card" style={{ maxWidth: 400, margin: '100px auto' }}>
      <h2>Органайзер CRM</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Логин" value={login} onChange={e => setLogin(e.target.value)} required />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginTop: 12 }} />
        <button className="primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 16 }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        {error && <p style={{ color: 'var(--color-danger)', marginTop: 12 }}>{error}</p>}
      </form>
    </div>
  );
}