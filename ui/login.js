import { login, register } from '../core/auth.js';
import { isValidEmail, isValidPassword } from '../utils/helpers.js';
import { log } from '../core/logger.js';
import { t } from '../core/i18n.js';

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
      showError(t('errors.auth.invalid_credentials'));
      return;
    }
    try {
      const res = await login(email, password);
      if (res.success) {
        window.location.href = 'dashboard.html';
      } else {
        showError(res.message || t('errors.auth.invalid_credentials'));
      }
    } catch (err) {
      log(err);
      showError(err.message || t('errors.auth.login_generic'));
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

    if (name.length < 2) return showError(t('errors.auth.name_short'));
    if (!isValidEmail(email)) return showError(t('errors.auth.email_invalid'));
    if (!isValidPassword(password)) {
      return showError(t('errors.auth.password_policy'));
    }
    if (password !== confirm) return showError(t('errors.auth.password_mismatch'));

    try {
      const res = await register(email, password, name, surname);
      if (res.success) {
        window.location.href = 'dashboard.html';
      } else {
        showError(res.message || t('errors.unexpected'));
      }
    } catch (err) {
      log(err);
      showError(err.message || t('errors.unexpected'));
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