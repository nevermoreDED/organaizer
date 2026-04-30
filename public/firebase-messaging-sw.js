// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

// Конфигурация Firebase из вашего .env
const firebaseConfig = {
  apiKey: "AIzaSyB2rgrsxutbaE56DZatFTwagq9GKLd9uJI",
  authDomain: "organizer-crm.firebaseapp.com",
  projectId: "organizer-crm",
  storageBucket: "organizer-crm.firebasestorage.app",
  messagingSenderId: "580302146345",
  appId: "1:580302146345:web:782cb99289b4b982244538"
};

// Инициализация Firebase в Service Worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Обработка фоновых сообщений
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Получено фоновое сообщение: ', payload);

  const notificationTitle = payload.notification?.title || 'Новое уведомление';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo192.png', // Убедитесь, что иконка существует в public
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});