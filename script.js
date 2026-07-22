const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const opened = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(opened));
  });

  document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// После публикации Worker вставьте сюда его адрес.
const FORM_ENDPOINT = 'https://mute-flower-9244.valentin20053001.workers.dev';

const modal = document.getElementById('consultationModal');
const form = document.getElementById('consultationForm');
const statusBox = document.getElementById('formStatus');
const openButtons = document.querySelectorAll('.js-open-consultation');
const closeButtons = document.querySelectorAll('[data-close-modal]');
let lastFocusedElement = null;

function openModal() {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  window.setTimeout(() => form?.elements.firstName?.focus(), 100);
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lastFocusedElement?.focus?.();
}

openButtons.forEach(button => button.addEventListener('click', openModal));
closeButtons.forEach(button => button.addEventListener('click', closeModal));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal?.classList.contains('open')) closeModal();
});

function formatRussianPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const parts = ['+7'];
  if (digits.length > 1) parts.push(` (${digits.slice(1, 4)}`);
  if (digits.length >= 4) parts.push(')');
  if (digits.length > 4) parts.push(` ${digits.slice(4, 7)}`);
  if (digits.length > 7) parts.push(`-${digits.slice(7, 9)}`);
  if (digits.length > 9) parts.push(`-${digits.slice(9, 11)}`);
  return parts.join('');
}

const phoneInput = form?.elements.phone;
phoneInput?.addEventListener('input', () => {
  phoneInput.value = formatRussianPhone(phoneInput.value);
});
phoneInput?.addEventListener('focus', () => {
  if (!phoneInput.value) phoneInput.value = '+7';
});

function showFieldError(input, message = '') {
  const field = input.closest('.form-field');
  if (!field) return;
  field.classList.toggle('invalid', Boolean(message));
  const error = field.querySelector('.field-error');
  if (error) error.textContent = message;
}

function validateForm() {
  let valid = true;
  const firstName = form.elements.firstName;
  const phone = form.elements.phone;
  const email = form.elements.email;
  const consent = form.elements.consent;

  [firstName, phone, email].forEach(input => showFieldError(input));
  document.querySelector('.consent-error').textContent = '';

  if (firstName.value.trim().length < 2) {
    showFieldError(firstName, 'Введите имя (не менее 2 символов).');
    valid = false;
  }

  const phoneDigits = phone.value.replace(/\D/g, '');
  if (phoneDigits.length !== 11) {
    showFieldError(phone, 'Введите полный номер телефона.');
    valid = false;
  }

  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    showFieldError(email, 'Проверьте адрес электронной почты.');
    valid = false;
  }

  if (!consent.checked) {
    document.querySelector('.consent-error').textContent = 'Необходимо согласие на обработку данных.';
    valid = false;
  }

  return valid;
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  statusBox.textContent = '';
  statusBox.className = 'form-status';

  if (!validateForm()) return;

  if (!FORM_ENDPOINT || FORM_ENDPOINT === 'YOUR_WORKER_URL') {
    statusBox.textContent = 'Форма ещё не подключена к обработчику. Укажите адрес Cloudflare Worker в script.js.';
    statusBox.classList.add('error');
    return;
  }

  const submitButton = form.querySelector('.submit-button');
  submitButton.disabled = true;
  submitButton.classList.add('loading');

  const data = Object.fromEntries(new FormData(form).entries());
  data.page = window.location.href;

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Ошибка отправки');

    form.reset();
    statusBox.textContent = 'Спасибо! Заявка отправлена. Мы свяжемся с вами в ближайшее время.';
    statusBox.classList.add('success');
    window.setTimeout(closeModal, 3500);
  } catch (error) {
    console.error(error);
    statusBox.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в Telegram.';
    statusBox.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
  }
});
