// core/auth.js - Gestione autenticazione (login, logout, token persistente)
import { login as apiLogin, register as apiRegister } from './api.js';
import { log } from './logger.js';

const STORAGE_TOKEN = 'mental_commons_token';
const STORAGE_USER = 'mental_commons_user';

function saveAuthData(user, token) {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(STORAGE_TOKEN);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_USER);
  return raw ? JSON.parse(raw) : null;
}

export async function login(email, password) {
  const res = await apiLogin(email, password);
  if (res.success && res.user && res.token) {
    saveAuthData(res.user, res.token);
  }
  return res;
}

export async function register(email, password, name, surname) {
  const res = await apiRegister(email, password, name, surname);
  if (res.success && res.user && res.token) {
    saveAuthData(res.user, res.token);
  }
  return res;
}

export function logout() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  log('Logout completato');
} 