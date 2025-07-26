import { login, register } from '../core/auth.js';
import { isValidEmail, isValidPassword } from '../utils/helpers.js';
import { log } from '../core/logger.js';

export function initLogin() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorBox = document.getElementById('auth-error');

  if (!(tabLogin && tabRegister && loginForm && registerForm)) {
    return;
  }

  // Tab switchers ---------------------------------------------------
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    hideError();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    hideError();
  });

  // Login submit ----------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const email = loginForm.querySelector('#login-email').value.trim().toLowerCase();
    const password = loginForm.querySelector('#login-password').value.trim();
    if (!isValidEmail(email) || password.length === 0) {
      showError('Email o password non validi');
      return;
    }
    try {
      const res = await login(email, password);
      if (res.success) {
        window.location.href = 'dashboard.html';
      } else {
        showError(res.message || 'Credenziali non valide');
      }
    } catch (err) {
      log(err);
      showError(err.message || 'Errore durante il login');
    }
  });

  // Register submit -------------------------------------------------
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const name = registerForm.querySelector('#register-name').value.trim();
    const surname = registerForm.querySelector('#register-surname').value.trim();
    const email = registerForm.querySelector('#register-email').value.trim().toLowerCase();
    const password = registerForm.querySelector('#register-password').value.trim();
    const confirm = registerForm.querySelector('#register-confirm').value.trim();

    if (name.length < 2) return showError('Il nome deve essere di almeno 2 caratteri');
    if (!isValidEmail(email)) return showError('Email non valida');
    if (!isValidPassword(password)) {
      return showError('La password deve essere di almeno 12 caratteri e contenere maiuscola, minuscola, numero e simbolo');
    }
    if (password !== confirm) return showError('Le password non coincidono');

    try {
      const res = await register(email, password, name, surname);
      if (res.success) {
        window.location.href = 'dashboard.html';
      } else {
        showError(res.message || 'Errore in registrazione');
      }
    } catch (err) {
      log(err);
      showError(err.message || 'Errore durante la registrazione');
    }
  });

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  function hideError() {
    if (errorBox) errorBox.style.display = 'none';
  }
} 