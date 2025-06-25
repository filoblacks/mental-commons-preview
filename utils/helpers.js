// utils/helpers.js - Utility functions centralizzate

// Costanti globali (verranno importate dagli altri moduli)
export const MAX_TEXT_LENGTH = 600;
export const MIN_TEXT_LENGTH = 20;

// Email semplice regex – sufficiente per validazione lato client
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export function generateUniqueId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  );
}

export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Delay helper (await sleep(ms))
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
} 