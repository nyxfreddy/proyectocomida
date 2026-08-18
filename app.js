const DEFAULT_PRICE = 11;
const PRICES_KEY = '_prices';
const FIRST_MONTH = '2026-08';
const FIRST_DATE = '2026-08-01';
const STORAGE_PREFIX = 'mis-comidas-';
const SEED = {
  '2026-08-03': { lunch: true, dinner: true },
  '2026-08-04': { lunch: true, dinner: false },
  '2026-08-05': { lunch: true, dinner: true },
  '2026-08-07': { lunch: true, dinner: false },
  '2026-08-10': { lunch: true, dinner: true },
  '2026-08-11': { lunch: true, dinner: true },
  '2026-08-12': { lunch: false, dinner: true },
};
const dateInput = document.querySelector('#date');
const monthInput = document.querySelector('#month');
const breakfastButton = document.querySelector('#breakfast');
const lunchButton = document.querySelector('#lunch');
const dinnerButton = document.querySelector('#dinner');
const message = document.querySelector('#save-message');
const app = document.querySelector('#app');
const aviso = document.querySelector('#aviso');
let recordsCache = {};
let avisoTimer = 0;

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  window.clearTimeout(avisoTimer);
  avisoTimer = window.setTimeout(() => {
    aviso.hidden = true;
    aviso.textContent = '';
  }, 2800);
}

function pedirConfirmacion(texto, aceptar = 'Continuar', cancelar = 'Cancelar') {
  const box = document.querySelector('#confirm-box');
  const messageNode = document.querySelector('#confirm-text');
  const ok = document.querySelector('#confirm-ok');
  const no = document.querySelector('#confirm-cancel');
  messageNode.textContent = texto;
  ok.textContent = aceptar;
  no.textContent = cancelar;
  return new Promise((resolve) => {
    const finish = (value) => {
      ok.removeEventListener('click', onOk);
      no.removeEventListener('click', onNo);
      box.removeEventListener('cancel', onCancel);
      if (box.open) box.close();
      resolve(value);
    };
    const onOk = () => finish(true);
    const onNo = () => finish(false);
    const onCancel = (event) => {
      event.preventDefault();
      finish(false);
    };
    ok.addEventListener('click', onOk);
    no.addEventListener('click', onNo);
    box.addEventListener('cancel', onCancel);
    if (!box.open) box.showModal();
  });
}

function authHeaders() {
  const sesion = sesionActual();
  return {
    'content-type': 'application/json',
    'x-user': sesion.user,
    'x-pass': sesion.pass,
  };
}

async function api(method, body) {
  if (esInvitado()) throw new Error('local-only');
  const response = await fetch('/api/registros', {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('api');
  return response.json();
}

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 10);
};
const formatDate = value => new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
const money = value => `S/ ${value.toFixed(2)}`;
const getRecords = () => recordsCache;

function usesLocalStore() {
  if (esInvitado()) return true;
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return true;
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

function recordsOwner() {
  const sesion = sesionActual();
  return sesion ? sesion.user : 'freddy';
}

function storageKey(user = recordsOwner()) {
  return `${STORAGE_PREFIX}${user}`;
}

function readLocal(user = recordsOwner()) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(user)) || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeLocal(records, user = recordsOwner()) {
  try {
    localStorage.setItem(storageKey(user), JSON.stringify(records));
  } catch {}
}

function seedIfEmpty(records) {
  const owner = recordsOwner();
  if ((owner !== 'freddy' && owner !== 'invitado') || Object.keys(records).length) return records;
  const seeded = { ...SEED };
  writeLocal(seeded);
  return seeded;
}

function savedText(updated) {
  if (usesLocalStore()) return updated ? 'Registro actualizado.' : 'Guardado en este dispositivo.';
  return updated ? 'Registro actualizado.' : 'Guardado en la nube.';
}

async function setRecords(records) {
  recordsCache = records;
  if (!sesionActual()) return;
  if (usesLocalStore() || esInvitado()) {
    writeLocal(records);
    return;
  }
  await api('PUT', records);
}

async function loadRecords() {
  if (usesLocalStore()) return seedIfEmpty(readLocal());
  return api('GET');
}

function easterSunday(year) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function getPeruHoliday(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  const year = date.getFullYear();
  const fixed = {
    [`${year}-01-01`]: 'Año Nuevo', [`${year}-05-01`]: 'Día del Trabajo',
    [`${year}-06-07`]: 'Batalla de Arica y Día de la Bandera', [`${year}-06-29`]: 'San Pedro y San Pablo',
    [`${year}-07-23`]: 'Día de la Fuerza Aérea del Perú', [`${year}-07-28`]: 'Fiestas Patrias',
    [`${year}-07-29`]: 'Fiestas Patrias', [`${year}-08-06`]: 'Batalla de Junín',
    [`${year}-08-30`]: 'Santa Rosa de Lima', [`${year}-10-08`]: 'Combate de Angamos',
    [`${year}-11-01`]: 'Todos los Santos', [`${year}-12-08`]: 'Inmaculada Concepción',
    [`${year}-12-09`]: 'Batalla de Ayacucho', [`${year}-12-25`]: 'Navidad'
  };
  const easter = easterSunday(year);
  const holyThursday = new Date(easter); holyThursday.setDate(easter.getDate() - 3);
  const holyFriday = new Date(easter); holyFriday.setDate(easter.getDate() - 2);
  if (dateValue === dateKey(holyThursday)) return 'Jueves Santo';
  if (dateValue === dateKey(holyFriday)) return 'Viernes Santo';
  return fixed[dateValue] || null;
}
function mealQty(value) {
  if (value === true) return 1;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function extraQty(record = {}, meal) {
  return mealQty(record.extras && record.extras[meal]);
}

function extrasTotal(record = {}) {
  return extraQty(record, 'breakfast') + extraQty(record, 'lunch') + extraQty(record, 'dinner');
}

function mealCount(record = {}) {
  if (record.visit) return mealQty(record.breakfast) + mealQty(record.lunch) + mealQty(record.dinner);
  return mealQty(record.lunch) + mealQty(record.dinner) + extrasTotal(record);
}

function defaultPriceRow(from = FIRST_DATE) {
  return { from, breakfast: DEFAULT_PRICE, lunch: DEFAULT_PRICE, dinner: DEFAULT_PRICE };
}

function priceTable() {
  const raw = getRecords()[PRICES_KEY];
  if (!Array.isArray(raw) || !raw.length) return [defaultPriceRow()];
  return raw
    .filter((row) => row && typeof row === 'object' && row.from)
    .map((row) => ({
      from: row.from,
      breakfast: Number.isFinite(Number(row.breakfast)) ? Number(row.breakfast) : DEFAULT_PRICE,
      lunch: Number.isFinite(Number(row.lunch)) ? Number(row.lunch) : DEFAULT_PRICE,
      dinner: Number.isFinite(Number(row.dinner)) ? Number(row.dinner) : DEFAULT_PRICE,
    }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

function priceOn(date, meal) {
  const table = priceTable();
  let found = table[0] || defaultPriceRow();
  table.forEach((row) => {
    if (row.from <= date) found = row;
  });
  const value = Number(found[meal]);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_PRICE;
}

function recordCost(date, record = {}) {
  const totals = mealTotals(record);
  return totals.breakfast * priceOn(date, 'breakfast') + totals.lunch * priceOn(date, 'lunch') + totals.dinner * priceOn(date, 'dinner');
}

function parsePrice(raw) {
  const value = Number(String(raw ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 99.99) return null;
  return Math.round(value * 100) / 100;
}

function sanitizePriceTyping(raw) {
  let text = String(raw ?? '').replace(',', '.');
  text = text.replace(/[^\d.]/g, '');
  const dot = text.indexOf('.');
  if (dot !== -1) {
    text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, '');
  }
  const parts = text.split('.');
  const ints = (parts[0] || '').replace(/^0+(?=\d)/, '').slice(0, 2);
  const decs = (parts[1] || '').slice(0, 2);
  if (dot !== -1) return `${ints}.${decs}`;
  return ints;
}

function formatPriceField(raw) {
  const value = parsePrice(raw);
  return value == null ? '0.00' : value.toFixed(2);
}

function mealTotals(record = {}) {
  if (record.visit) {
    return {
      breakfast: mealQty(record.breakfast),
      lunch: mealQty(record.lunch),
      dinner: mealQty(record.dinner),
    };
  }
  return {
    breakfast: extraQty(record, 'breakfast'),
    lunch: mealQty(record.lunch) + extraQty(record, 'lunch'),
    dinner: mealQty(record.dinner) + extraQty(record, 'dinner'),
  };
}

function mealLabel(count, one, many) {
  if (!count) return '';
  return `${count} ${count === 1 ? one : many}`;
}

function mealNames(record = {}) {
  const totals = mealTotals(record);
  return [
    mealLabel(totals.breakfast, 'desayuno', 'desayunos'),
    mealLabel(totals.lunch, 'almuerzo', 'almuerzos'),
    mealLabel(totals.dinner, 'cena', 'cenas'),
  ].filter(Boolean).join(', ');
}

function isEmptyRecord(record = {}) {
  if (record.visit) return mealQty(record.breakfast) + mealQty(record.lunch) + mealQty(record.dinner) === 0;
  return !mealQty(record.lunch) && !mealQty(record.dinner) && extrasTotal(record) === 0;
}

let visitPreference = false;
let guestsPreference = false;

function isVisitDay(dateValue = dateInput.value) {
  if (!esJorge()) return false;
  const saved = getRecords()[dateValue];
  if (saved) return Boolean(saved.visit);
  return visitPreference;
}

function isGuestsDay(dateValue = dateInput.value) {
  if (!sesionActual()) return false;
  const saved = getRecords()[dateValue];
  if (saved) return Boolean(saved.guests) || extrasTotal(saved) > 0;
  return guestsPreference;
}

function mealSchedule(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  const holiday = getPeruHoliday(dateValue);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const guests = isGuestsDay(dateValue);
  if (holiday) return { lunch: false, dinner: false, extras: false, note: `Feriado: ${holiday}` };
  if (weekend) {
    if (guests) return { lunch: false, dinner: false, extras: true, note: 'Fin de semana: puedes anotar desayunos y extras de invitados.' };
    return { lunch: false, dinner: false, extras: false, note: 'Fin de semana: no hay comidas programadas.' };
  }
  if (esJorge()) {
    if (guests) return { lunch: true, dinner: true, extras: true, note: 'Tu almuerzo. Invitados: desayunos, extras y cena.' };
    return { lunch: true, dinner: false, extras: false, note: 'Almuerzo programado.' };
  }
  if (date.getDay() === 5) {
    if (guests) return { lunch: true, dinner: false, extras: true, note: 'Viernes: tu almuerzo. Invitados: desayunos y extras.' };
    return { lunch: true, dinner: false, extras: false, note: 'Viernes: solo almuerzo programado.' };
  }
  if (guests) return { lunch: true, dinner: true, extras: true, note: 'Tu almuerzo y cena. Invitados: desayunos y extras.' };
  return { lunch: true, dinner: true, extras: false, note: 'Almuerzo y cena programados.' };
}

function currentRecord() { return getRecords()[dateInput.value] || { lunch: false, dinner: false }; }
function formatDateFull(value) {
  const label = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function updateSelectedDate() {
  const title = document.querySelector('[data-selected-date]');
  if (title) title.textContent = dateInput.value ? formatDateFull(dateInput.value) : '—';
  const todayButton = document.querySelector('#go-today');
  if (todayButton) todayButton.hidden = dateInput.value === localDate();
}

function applyUserMode() {
  const sesion = sesionActual();
  const user = sesion ? sesion.user : '';
  const nombre = nombreVisible(user);
  document.documentElement.dataset.user = user;
  visitPreference = false;
  guestsPreference = false;
  const chip = document.querySelector('#user-chip');
  const nameNode = document.querySelector('#user-name');
  if (chip) {
    chip.hidden = !nombre;
    chip.setAttribute('aria-expanded', 'false');
  }
  if (nameNode) nameNode.textContent = nombre;
  setUserMenuVisible(false, true);
  const guestsToggle = document.querySelector('#guests-toggle');
  if (guestsToggle) guestsToggle.hidden = !sesion;
}

function updateMealButtons() {
  const record = currentRecord();
  const schedule = mealSchedule(dateInput.value);
  const visit = isVisitDay();
  const guests = isGuestsDay();
  const holiday = Boolean(getPeruHoliday(dateInput.value));
  const showExtras = guests && schedule.extras;
  const meals = document.querySelector('#standard-meals');
  const breakfastRow = document.querySelector('#breakfast-row');
  const guestsButton = document.querySelector('#guests-toggle');
  if (meals) {
    meals.hidden = false;
    meals.classList.toggle('has-extras', showExtras);
  }
  if (breakfastRow) breakfastRow.hidden = !showExtras;
  if (guestsButton) {
    guestsButton.classList.toggle('selected', guests);
    guestsButton.setAttribute('aria-pressed', String(guests));
    guestsButton.setAttribute('aria-label', guests ? 'Invitados activado' : 'Invitados');
    guestsButton.title = 'Invitados';
    guestsButton.disabled = holiday;
  }
  const shown = {
    breakfast: extraQty(record, 'breakfast'),
    lunch: mealQty(record.lunch) + extraQty(record, 'lunch'),
    dinner: mealQty(record.dinner) + extraQty(record, 'dinner'),
  };
  [
    [breakfastButton, shown.breakfast > 0, showExtras],
    [lunchButton, showExtras ? shown.lunch > 0 : mealQty(record.lunch) > 0, showExtras || schedule.lunch],
    [dinnerButton, showExtras ? shown.dinner > 0 : mealQty(record.dinner) > 0, showExtras || schedule.dinner],
  ].forEach(([button, selected, enabled]) => {
    if (!button) return;
    button.classList.toggle('selected', selected);
    button.classList.toggle('is-disabled', !enabled);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-disabled', String(!enabled));
  });
  document.querySelectorAll('.extra-count').forEach((node) => {
    node.textContent = String(shown[node.dataset.meal] || 0);
  });
  document.querySelectorAll('.extra-minus').forEach((button) => {
    button.disabled = (shown[button.dataset.meal] || 0) <= 0;
  });
  document.querySelectorAll('.portion-input').forEach((input) => {
    if (document.activeElement === input) return;
    const qty = mealQty(record[input.dataset.meal]);
    input.value = qty ? String(qty) : '';
  });
  const day = dateInput.value || localDate();
  document.querySelectorAll('[data-price]').forEach((node) => {
    node.textContent = money(priceOn(day, node.dataset.price));
  });
  document.querySelector('#schedule-note').textContent = schedule.note;
}

function userDisplayName() {
  const sesion = sesionActual();
  return sesion ? nombreVisible(sesion.user) : '';
}

async function persistRecord(mutate, doneText) {
  if (!sesionActual()) return;
  if (dateInput.value < FIRST_DATE) {
    mostrarAviso('El registro empieza en agosto 2026.');
    return;
  }
  const records = { ...getRecords() };
  const record = { ...(records[dateInput.value] || { lunch: false, dinner: false }) };
  mutate(record);
  if (isEmptyRecord(record)) delete records[dateInput.value];
  else records[dateInput.value] = record;
  try {
    await setRecords(records);
    updateMealButtons();
    renderCalendar();
    renderSummary();
    message.textContent = doneText;
  } catch {
    message.textContent = 'No se pudo guardar.';
  }
  window.setTimeout(() => { message.textContent = ''; }, 2500);
}

async function saveMeal(meal) {
  const record = currentRecord();
  await persistRecord((next) => {
    next[meal] = !mealQty(next[meal]);
  }, savedText(Boolean(record[meal])));
}

async function saveVisit() {
  const turningOn = !isVisitDay();
  visitPreference = turningOn;
  await persistRecord((next) => {
    if (turningOn) {
      next.visit = true;
      next.breakfast = mealQty(next.breakfast);
      next.lunch = mealQty(next.lunch);
      next.dinner = mealQty(next.dinner);
    } else {
      next.visit = false;
      next.lunch = mealQty(next.lunch) > 0;
      delete next.breakfast;
      delete next.dinner;
    }
  }, turningOn ? 'Visita familiar activada. Ya puedes registrar feriados y fines de semana.' : 'Visita familiar desactivada.');
}

function parsePortions(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 2);
  const qty = Number(digits);
  return Number.isFinite(qty) ? Math.min(qty, 99) : 0;
}

async function savePortion(meal, raw) {
  const qty = parsePortions(raw);
  visitPreference = true;
  await persistRecord((next) => {
    next.visit = true;
    next[meal] = qty;
  }, 'Raciones actualizadas.');
}

async function saveGuests() {
  if (getPeruHoliday(dateInput.value)) {
    mostrarAviso('En feriado no te quedas. No hay comidas.');
    return;
  }
  const turningOn = !isGuestsDay();
  guestsPreference = turningOn;
  await persistRecord((next) => {
    if (turningOn) {
      next.guests = true;
      next.extras = {
        breakfast: extraQty(next, 'breakfast'),
        lunch: extraQty(next, 'lunch'),
        dinner: extraQty(next, 'dinner'),
      };
    } else {
      next.guests = false;
      delete next.extras;
    }
  }, turningOn ? 'Invitados activado. Puedes anotar desayunos y extras.' : 'Invitados desactivado.');
}

async function bumpMeal(meal, delta) {
  if (getPeruHoliday(dateInput.value)) {
    mostrarAviso('En feriado no te quedas. No hay comidas.');
    return;
  }
  guestsPreference = true;
  const record = currentRecord();
  const schedule = mealSchedule(dateInput.value);
  if (meal === 'breakfast') {
    const next = extraQty(record, 'breakfast') + delta;
    if (next < 0 || next > 99) return;
    await persistRecord((item) => {
      item.guests = true;
      item.extras = {
        breakfast: next,
        lunch: extraQty(item, 'lunch'),
        dinner: extraQty(item, 'dinner'),
      };
    }, 'Registro actualizado.');
    return;
  }
  let own = mealQty(record[meal]) > 0;
  let extra = extraQty(record, meal);
  if (delta > 0) {
    if (own + extra >= 99) return;
    if (schedule[meal] && !own) own = true;
    else extra += 1;
  } else if (extra > 0) extra -= 1;
  else if (own) own = false;
  else return;
  await persistRecord((item) => {
    item.guests = true;
    item[meal] = own;
    item.extras = {
      breakfast: extraQty(item, 'breakfast'),
      lunch: extraQty(item, 'lunch'),
      dinner: extraQty(item, 'dinner'),
      [meal]: extra,
    };
  }, 'Registro actualizado.');
}

function monthLabel(value) {
  const [year, month] = value.split('-');
  const label = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fillMonthOptions() {
  const today = localDate().slice(0, 7);
  const end = today < FIRST_MONTH ? FIRST_MONTH : today;
  const keys = new Set();
  let [year, month] = FIRST_MONTH.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.add(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  const months = [...keys].sort().reverse();
  const selected = months.includes(monthInput.value) ? monthInput.value : (months.includes(today) ? today : months[0]);
  monthInput.innerHTML = months.map((value) => `<option value="${value}">${monthLabel(value)}</option>`).join('');
  monthInput.value = selected;
  updateMonthTitle();
}

function updateMonthTitle() {
  if (!monthInput.value) return;
  monthInput.setAttribute('aria-label', `Mes: ${monthLabel(monthInput.value)}`);
}

function recordsForMonth() {
  const prefix = monthInput.value;
  return Object.entries(getRecords()).filter(([date]) => date.startsWith(prefix)).sort((a, b) => b[0].localeCompare(a[0]));
}
function daysForMonth() {
  const [year, month] = monthInput.value.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const records = getRecords();
  const today = localDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const date = `${monthInput.value}-${String(index + 1).padStart(2, '0')}`;
    return [date, records[date] || { lunch: false, dinner: false }];
  }).filter(([date, record]) => {
    if (date > today) return false;
    if (mealCount(record) || record.visit || record.guests) return true;
    if (getPeruHoliday(date)) return true;
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return weekday !== 0 && weekday !== 6;
  }).reverse();
}
function renderSummary() {
  const rows = recordsForMonth();
  const meals = rows.reduce((total, [, record]) => total + mealCount(record), 0);
  const amount = rows.reduce((total, [date, record]) => total + recordCost(date, record), 0);
  document.querySelector('#meal-count').textContent = meals;
  document.querySelector('#amount').textContent = money(amount);
  const list = document.querySelector('#history-list');
  list.innerHTML = '';
  daysForMonth().forEach(([date, record]) => {
    const count = mealCount(record);
    const holiday = getPeruHoliday(date);
    const names = count ? mealNames(record) : holiday ? `Feriado: ${holiday}` : '—';
    const cost = recordCost(date, record);
    list.insertAdjacentHTML('beforeend', `<li><div><div class="history-date">${formatDate(date)}</div><div class="history-meals${count ? '' : ' no-meal'}">${names}</div></div><span class="history-total">${count ? money(cost) : '—'}</span></li>`);
  });
}
function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawDetailImage() {
  const days = daysForMonth().slice().reverse();
  const meals = days.reduce((total, [, record]) => total + mealCount(record), 0);
  const totalAmount = days.reduce((total, [date, record]) => total + recordCost(date, record), 0);
  const name = userDisplayName();
  const label = monthLabel(monthInput.value);
  const width = 720;
  const pad = 44;
  const rowH = 58;
  const headerH = 168;
  const footerH = 118;
  const height = headerH + Math.max(days.length, 1) * rowH + footerH;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#efe7dc';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fffaf3';
  roundRectPath(ctx, 22, 22, width - 44, height - 44, 28);
  ctx.fill();
  ctx.fillStyle = '#ff5a1f';
  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('SALITRAL', pad + 8, 62);
  ctx.fillStyle = '#1d1d1f';
  ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Registro de comidas', pad + 8, 104);
  ctx.fillStyle = 'rgba(29, 29, 31, 0.56)';
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`${name} · ${label}`, pad + 8, 136);
  let y = headerH;
  if (!days.length) {
    ctx.fillStyle = 'rgba(29, 29, 31, 0.45)';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Sin comidas este mes', pad + 8, y + 28);
    y += rowH;
  }
  days.forEach(([date, record], index) => {
    const count = mealCount(record);
    const holiday = getPeruHoliday(date);
    const names = count ? mealNames(record) : holiday ? `Feriado: ${holiday}` : '—';
    const amount = count ? money(recordCost(date, record)) : '—';
    if (index) {
      ctx.strokeStyle = 'rgba(29, 29, 31, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 8, y);
      ctx.lineTo(width - pad - 8, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#1d1d1f';
    ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(formatDate(date), pad + 8, y + 24);
    ctx.fillStyle = 'rgba(29, 29, 31, 0.52)';
    ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(names, pad + 8, y + 44);
    ctx.fillStyle = '#1d1d1f';
    ctx.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(amount, width - pad - 8, y + 34);
    ctx.textAlign = 'left';
    y += rowH;
  });
  ctx.fillStyle = '#1d1d1f';
  ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`${meals} comida${meals === 1 ? '' : 's'}`, pad + 8, y + 46);
  ctx.textAlign = 'right';
  ctx.fillText(money(totalAmount), width - pad - 8, y + 46);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(29, 29, 31, 0.42)';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Por cancelar', pad + 8, y + 70);
  return canvas;
}

function showSharePreview(url) {
  const box = document.querySelector('#share-box');
  const image = document.querySelector('#share-image');
  if (!box || !image) return;
  image.src = url;
  if (!box.open) box.showModal();
}

async function shareSummary() {
  const canvas = drawDetailImage();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    mostrarAviso('No se pudo crear la imagen.');
    return false;
  }
  const file = new File([blob], `comidas-${userDisplayName().toLowerCase()}-${monthInput.value}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Registro de comidas' });
      return true;
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return false;
  }
  const url = URL.createObjectURL(blob);
  showSharePreview(url);
  return true;
}

const dateTrigger = document.querySelector('#date-trigger');
const calendar = document.querySelector('#calendar');
const calendarGrid = document.querySelector('#cal-grid');
const calendarTitle = document.querySelector('#cal-title');
let calendarCursor = localDate().slice(0, 7);

function updateDateLabel() {}

function shiftCalendarMonth(delta) {
  const [year, month] = calendarCursor.split('-').map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  if (key < FIRST_MONTH) return;
  calendarCursor = key;
  renderCalendar();
}

function renderCalendar() {
  if (!dateInput.value) return;
  const [year, month] = calendarCursor.split('-').map(Number);
  calendarTitle.textContent = monthLabel(calendarCursor);
  const first = new Date(year, month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - startOffset);
  const today = localDate();
  const selected = dateInput.value;
  const records = getRecords();
  calendarGrid.innerHTML = '';
  for (let index = 0; index < 42; index += 1) {
    const cell = new Date(start);
    cell.setDate(start.getDate() + index);
    const value = dateKey(cell);
    const inMonth = cell.getMonth() === month - 1;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cal-day';
    button.textContent = String(cell.getDate());
    button.dataset.date = value;
    button.setAttribute('aria-label', formatDate(value));
    if (!inMonth) button.classList.add('out');
    if (value < FIRST_DATE) {
      button.classList.add('muted', 'out');
      button.disabled = true;
    }
    const weekendOrHoliday = cell.getDay() === 0 || cell.getDay() === 6 || getPeruHoliday(value);
    const openForVisit = isVisitDay(value) || visitPreference;
    const openForGuests = !getPeruHoliday(value) && (isGuestsDay(value) || guestsPreference);
    if (weekendOrHoliday && !openForVisit && !openForGuests) button.classList.add('muted');
    if (value === today) button.classList.add('today');
    if (value === selected) button.classList.add('selected');
    if (records[value] && mealCount(records[value])) button.classList.add('marked');
    calendarGrid.appendChild(button);
  }
}

function setSelectedDate(value) {
  if (value < FIRST_DATE) value = FIRST_DATE;
  dateInput.value = value;
  calendarCursor = value.slice(0, 7);
  updateDateLabel();
  renderCalendar();
  updateSelectedDate();
  updateMealButtons();
}

function closeCalendar() {
  calendar.hidden = true;
  dateTrigger.setAttribute('aria-expanded', 'false');
}

function toggleCalendar() {
  const open = calendar.hidden;
  calendar.hidden = !open;
  dateTrigger.setAttribute('aria-expanded', String(open));
  if (open) {
    calendarCursor = dateInput.value.slice(0, 7);
    renderCalendar();
  }
}

dateTrigger.addEventListener('click', toggleCalendar);
document.querySelector('#cal-prev').addEventListener('click', () => shiftCalendarMonth(-1));
document.querySelector('#cal-next').addEventListener('click', () => shiftCalendarMonth(1));
calendarGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-date]');
  if (!button) return;
  setSelectedDate(button.dataset.date);
  closeCalendar();
});
document.addEventListener('click', (event) => {
  if (!calendar.hidden && !event.target.closest('#date-picker')) closeCalendar();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCalendar();
});

document.querySelector('#visit-toggle')?.addEventListener('click', () => { saveVisit().catch(() => {}); });
document.querySelector('#guests-toggle')?.addEventListener('click', () => { saveGuests().catch(() => {}); });
document.querySelector('#portion-list')?.addEventListener('change', (event) => {
  const input = event.target.closest('.portion-input');
  if (!input) return;
  savePortion(input.dataset.meal, input.value).catch(() => {});
});
document.querySelector('#portion-list')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const input = event.target.closest('.portion-input');
  if (!input) return;
  event.preventDefault();
  input.blur();
});
document.querySelector('#standard-meals')?.addEventListener('click', (event) => {
  const minus = event.target.closest('.extra-minus');
  if (minus) {
    bumpMeal(minus.dataset.meal, -1).catch(() => {});
    return;
  }
  const plus = event.target.closest('.extra-plus');
  if (plus) {
    bumpMeal(plus.dataset.meal, 1).catch(() => {});
    return;
  }
  if (document.querySelector('#standard-meals')?.classList.contains('has-extras')) return;
  const mealButton = event.target.closest('#lunch, #dinner');
  if (!mealButton || mealButton.classList.contains('is-disabled')) return;
  saveMeal(mealButton.id).catch(() => {});
});
document.querySelector('#standard-meals')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (document.querySelector('#standard-meals')?.classList.contains('has-extras')) return;
  const mealButton = event.target.closest('#lunch, #dinner');
  if (!mealButton || mealButton.classList.contains('is-disabled')) return;
  event.preventDefault();
  saveMeal(mealButton.id).catch(() => {});
});
monthInput.addEventListener('change', () => {
  updateMonthTitle();
  renderSummary();
  monthInput.blur();
});
document.querySelector('#go-today').addEventListener('click', () => { setSelectedDate(localDate()); });
document.querySelector('#share-summary').addEventListener('click', () => { shareSummary().catch(() => {}); });
document.querySelector('#share-close')?.addEventListener('click', () => {
  const box = document.querySelector('#share-box');
  if (box && box.open) box.close();
});
document.querySelector('#share-box')?.addEventListener('click', (event) => {
  if (event.target.id === 'share-box') event.currentTarget.close();
});
function setUserMenuVisible(open, instant) {
  const chip = document.querySelector('#user-chip');
  const menu = document.querySelector('#user-menu');
  if (!menu) return;
  const isOpen = menu.classList.contains('is-open');
  if (open === isOpen && !instant) return;
  menu.classList.toggle('is-instant', Boolean(instant));
  menu.classList.toggle('is-open', Boolean(open));
  menu.inert = !open;
  if (chip) chip.setAttribute('aria-expanded', String(Boolean(open)));
  if (instant) {
    requestAnimationFrame(() => menu.classList.remove('is-instant'));
  }
}

document.querySelector('#user-chip')?.addEventListener('click', (event) => {
  event.stopPropagation();
  const menu = document.querySelector('#user-menu');
  setUserMenuVisible(!menu?.classList.contains('is-open'));
});
document.querySelector('#user-chip')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  const menu = document.querySelector('#user-menu');
  setUserMenuVisible(!menu?.classList.contains('is-open'));
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('#user-chip') && !event.target.closest('#user-menu')) {
    setUserMenuVisible(false);
  }
});
document.querySelector('#salir')?.addEventListener('click', () => {
  cerrarSesion();
  window.location.reload();
});

function priceInputs() {
  return ['#precio-desayuno', '#precio-almuerzo', '#precio-cena']
    .map((sel) => document.querySelector(sel))
    .filter(Boolean);
}

function bindPriceInputs() {
  priceInputs().forEach((input) => {
    input.addEventListener('beforeinput', (event) => {
      if (event.inputType && event.inputType.startsWith('delete')) return;
      const typed = event.data ?? '';
      if (event.inputType === 'insertFromPaste' || event.inputType === 'insertReplacementText') return;
      if (typed && !/[\d.,]/.test(typed)) event.preventDefault();
    });
    input.addEventListener('input', () => {
      const start = input.selectionStart;
      const prev = input.value;
      const next = sanitizePriceTyping(prev);
      if (prev === next) return;
      input.value = next;
      const pos = Math.max(0, (start ?? next.length) - (prev.length - next.length));
      try { input.setSelectionRange(pos, pos); } catch {}
    });
    input.addEventListener('blur', () => {
      input.value = formatPriceField(input.value);
    });
  });
}

function fillPriceForm() {
  const today = localDate();
  const desayuno = document.querySelector('#precio-desayuno');
  const almuerzo = document.querySelector('#precio-almuerzo');
  const cena = document.querySelector('#precio-cena');
  if (desayuno) desayuno.value = formatPriceField(Math.min(99.99, priceOn(today, 'breakfast')));
  if (almuerzo) almuerzo.value = formatPriceField(Math.min(99.99, priceOn(today, 'lunch')));
  if (cena) cena.value = formatPriceField(Math.min(99.99, priceOn(today, 'dinner')));
  const error = document.querySelector('#config-error');
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  const forward = document.querySelector('input[name="precio-alcance"][value="forward"]');
  if (forward) forward.checked = true;
}

function pedirClave() {
  const box = document.querySelector('#clave-box');
  const input = document.querySelector('#clave-confirm');
  const error = document.querySelector('#clave-error');
  const ok = document.querySelector('#clave-ok');
  const no = document.querySelector('#clave-cancel');
  if (!box || !input || !ok || !no) return Promise.resolve(false);
  input.setAttribute('inputmode', esInvitado() ? 'text' : 'numeric');
  input.value = '';
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  return new Promise((resolve) => {
    const finish = (value) => {
      ok.removeEventListener('click', onOk);
      no.removeEventListener('click', onNo);
      box.removeEventListener('cancel', onCancel);
      if (box.open) box.close();
      resolve(value);
    };
    const onOk = () => {
      const sesion = sesionActual();
      if (!sesion || input.value !== sesion.pass) {
        if (error) {
          error.textContent = 'Clave incorrecta.';
          error.hidden = false;
        }
        input.value = '';
        input.focus();
        return;
      }
      finish(true);
    };
    const onNo = () => finish(false);
    const onCancel = (event) => {
      event.preventDefault();
      finish(false);
    };
    ok.addEventListener('click', onOk);
    no.addEventListener('click', onNo);
    box.addEventListener('cancel', onCancel);
    if (!box.open) box.showModal();
    input.focus();
  });
}

async function savePriceChanges() {
  const breakfast = parsePrice(document.querySelector('#precio-desayuno')?.value);
  const lunch = parsePrice(document.querySelector('#precio-almuerzo')?.value);
  const dinner = parsePrice(document.querySelector('#precio-cena')?.value);
  const error = document.querySelector('#config-error');
  if (breakfast == null || lunch == null || dinner == null) {
    if (error) {
      error.textContent = 'Usa montos de 0.00 a 99.99.';
      error.hidden = false;
    }
    return;
  }
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  const confirmed = await pedirClave();
  if (!confirmed) return;
  const scope = document.querySelector('input[name="precio-alcance"]:checked')?.value || 'forward';
  const today = localDate();
  let nextTable;
  if (scope === 'history') {
    nextTable = [{ from: FIRST_DATE, breakfast, lunch, dinner }];
  } else {
    nextTable = priceTable().filter((row) => row.from < today);
    if (!nextTable.length) nextTable.push(defaultPriceRow());
    nextTable.push({ from: today, breakfast, lunch, dinner });
  }
  const records = { ...getRecords(), [PRICES_KEY]: nextTable };
  try {
    await setRecords(records);
    updateMealButtons();
    renderSummary();
    const box = document.querySelector('#config-box');
    if (box && box.open) box.close();
    mostrarAviso(scope === 'history' ? 'Precios aplicados al histórico.' : 'Precios vigentes desde hoy.');
  } catch {
    if (error) {
      error.textContent = 'No se pudieron guardar los precios.';
      error.hidden = false;
    }
  }
}

document.querySelector('#config-open')?.addEventListener('click', (event) => {
  event.stopPropagation();
  setUserMenuVisible(false);
  fillPriceForm();
  const box = document.querySelector('#config-box');
  if (box && !box.open) box.showModal();
  document.querySelector('#config-cancel')?.focus();
});
document.querySelector('#config-cancel')?.addEventListener('click', () => {
  const box = document.querySelector('#config-box');
  if (box && box.open) box.close();
});
document.querySelector('#config-save')?.addEventListener('click', () => {
  savePriceChanges().catch(() => {});
});
bindPriceInputs();

function limaHour() {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date())
    .find((part) => part.type === 'hour');
  return Number(hour && hour.value);
}

const THEME_KEY = 'comida-tema';

function themePreference() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  } catch {}
  return 'auto';
}

function resolvedTheme() {
  const pref = themePreference();
  if (pref === 'light' || pref === 'dark') return pref;
  return limaHour() >= 7 && limaHour() < 19 ? 'light' : 'dark';
}

function syncThemeControls() {
  const pref = themePreference();
  document.querySelectorAll('input[name="tema"]').forEach((input) => {
    input.checked = input.value === pref;
  });
}

function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.content = dark ? '#000000' : '#f5f5f7';
  });
  syncThemeControls();
}

function setThemePreference(value) {
  try {
    if (value === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
  } catch {}
  applyTheme();
}

applyTheme();
setInterval(applyTheme, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) applyTheme();
});
document.querySelectorAll('input[name="tema"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (input.checked) setThemePreference(input.value);
  });
});

function lockApp() {
  app.classList.add('is-locked');
  app.inert = true;
  const header = document.querySelector('header');
  if (header) header.inert = true;
}

function unlockApp() {
  app.classList.remove('is-locked');
  app.inert = false;
  const header = document.querySelector('header');
  if (header) header.inert = false;
}

function paintShell() {
  setSelectedDate(localDate());
  fillMonthOptions();
  monthInput.value = dateInput.value.slice(0, 7);
  renderSummary();
}

async function startApp() {
  unlockApp();
  applyUserMode();
  try {
    recordsCache = await loadRecords();
  } catch {
    message.textContent = usesLocalStore() ? '' : 'No se pudieron cargar los registros.';
    recordsCache = usesLocalStore() ? seedIfEmpty({}) : {};
  }
  fillMonthOptions();
  setSelectedDate(dateInput.value || localDate());
  renderSummary();
}

try {
  paintShell();
} catch {}

try {
  if (sesionActual()) startApp();
  else {
    lockApp();
    abrirLogin();
  }
} catch {
  lockApp();
  abrirLogin();
}

window.addEventListener('comida-login', () => {
  startApp();
});

if ('serviceWorker' in navigator) {
  let refreshedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshedForUpdate) {
      refreshedForUpdate = true;
      window.location.reload();
    }
  });
  navigator.serviceWorker.register('./service-worker.js').then(registration => registration.update());
}
