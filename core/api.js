// core/api.js - Wrapper centralizzato per chiamate HTTP verso backend
import { log, warn, error } from './logger.js';
import { sleep } from '../utils/helpers.js';

const BASE_URL = window?.location?.origin ?? '';
const DEFAULT_TIMEOUT = 8000; // ms

function withTimeout(promise, ms = DEFAULT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout richiesta')), ms)
    ),
  ]);
}

async function request(endpoint, { method = 'GET', token, body, retries = 1 } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const cfg = {
    method,
    headers,
    mode: 'cors',
    cache: 'no-cache',
  };
  if (body) cfg.body = JSON.stringify(body);

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      const res = await withTimeout(fetch(`${BASE_URL}${endpoint}`, cfg));
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      if (attempt > retries) {
        error('API error:', err);
        throw err;
      }
      warn(`Retry ${attempt}/${retries} per ${endpoint}`);
      await sleep(1000 * attempt);
    }
  }
}

// Endpoints specifici --------------------------------------------------
export function login(email, password) {
  return request('/api/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function register(email, password, name, surname) {
  return request('/api/register', {
    method: 'POST',
    body: { email, password, name, surname },
  });
}

export function getUCMEs(token) {
  return request('/api/ucme', { token });
}

export function getUsers(token) {
  return request('/api/users', { token });
}

export function postUCME(payload, token) {
  return request('/api/ucme', {
    method: 'POST',
    body: payload,
    token,
  });
}

// --------------------------------------------------------------
// PORTATORE (SPRINT-4)
// --------------------------------------------------------------
export function getPortatoreStatus(token) {
  return request('/api/portatore/status', { token });
}

export function registerPortatore(bio, token) {
  return request('/api/portatore/register', {
    method: 'POST',
    body: { bio },
    token,
  });
}

export function revokePortatore(token) {
  return request('/api/portatore/revoke', {
    method: 'DELETE',
    token,
  });
}

export function getPendingUCMEs(token) {
  return request('/api/admin/ucme/pending', { token });
}

export function assignUCMe(ucmeId, portatoreId, token) {
  return request('/api/admin/ucme/assign', {
    method: 'POST',
    body: { ucme_id: ucmeId, portatore_id: portatoreId },
    token,
  });
}

export function getActivePortatori(token) {
  return request('/api/admin/portatori/active', { token });
}

export function getPortatoreAssignedUCMEs(token) {
  return request('/api/portatore/ucme', { token });
}

export function updatePortatoreUcmeStatus(ucmeId, newStatus, token) {
  return request('/api/portatore/ucme', {
    method: 'PATCH',
    body: { ucme_id: ucmeId, new_status: newStatus },
    token,
  });
}

// FASE 4 – Risposta UCMe
export function submitUcmeResponse(ucmeId, contenuto, token) {
  return request('/api/portatore/rispondi', {
    method: 'POST',
    body: { ucme_id: ucmeId, contenuto },
    token,
  });
} 