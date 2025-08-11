// core/auth.js - Gestione autenticazione (login, logout, token persistente)
import { login as apiLogin, register as apiRegister, getUsers as apiGetUsers } from './api.js';
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
  const token = res.token || res.data?.token;
  const user = res.user || res.data?.user;
  if (res.success && user && token) {
    saveAuthData(user, token);
  }
  return res;
}

export async function register(email, password, name, surname) {
  const res = await apiRegister(email, password, name, surname);
  const token = res.token || res.data?.token;
  const user = res.user || res.data?.user;
  if (res.success && user && token) {
    saveAuthData(user, token);
  }
  return res;
}

export function logout() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  log('Logout completato');
}

// ---------------------------------------------------------------------------
// 🔄 Aggiorna le informazioni dell'utente corrente recuperandole dal backend
//    – utile ad esempio dopo l'acquisto di MC Premium o altre modifiche lato server.
// ---------------------------------------------------------------------------
export async function refreshUserInfo() {
  const token = getToken();
  if (!token) return null;

  try {
    // Recupera elenco utenti accessibili; per gli utenti non admin
    // il backend dovrebbe restituire solo il profilo corrente.
    const res = await apiGetUsers(token);

    const usersRaw = res?.data;
    const users = Array.isArray(usersRaw?.users)
      ? usersRaw.users
      : Array.isArray(usersRaw)
        ? usersRaw
        : [];

    if (!users.length) return null;

    const current = getCurrentUser();
    if (!current) return null;

    const updated = users.find((u) => u.id === current.id);
    if (updated) {
      // Salva la versione aggiornata su localStorage
      localStorage.setItem(STORAGE_USER, JSON.stringify(updated));
      return updated;
    }

    return null;
  } catch (err) {
    log('Errore aggiornamento dati utente:', err.message);
    return null;
  }
}


