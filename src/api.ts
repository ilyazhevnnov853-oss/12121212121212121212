import axios from 'axios';

// Базовый URL для API (в dev-режиме можно использовать localhost:3000)
export const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('te_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Глобальная обработка ошибок (например, 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Если токен протух или невалиден — очищаем данные авторизации
      localStorage.removeItem('te_jwt_token');
      localStorage.removeItem('te_auth_user');
      sessionStorage.removeItem('te_jwt_token');
      sessionStorage.removeItem('te_auth_user');
      
      // Перенаправляем на страницу логина
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
