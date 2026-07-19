import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Для работы в CRM проверяем наличие BITRIX_USER
const initApp = () => {
  // Если BITRIX_USER не определен, ждем его появления
  if (typeof window !== 'undefined' && !window.BITRIX_USER) {
    console.warn('BITRIX_USER не определен - ожидаем авторизации CRM');
  }
  
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Инициализируем приложение
initApp();