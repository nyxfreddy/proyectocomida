const PRICE = 11;
const STORAGE_KEY = 'mis-comidas-v1';
const AUGUST_2026_SEED_KEY = 'mis-comidas-august-2026-seeded';
const dateInput = document.querySelector('#date');
const monthInput = document.querySelector('#month');
const lunchButton = document.querySelector('#lunch');
const dinnerButton = document.querySelector('#dinner');
const message = document.querySelector('#save-message');

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 10);
};
const formatDate = value => new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));
const money = value => `S/ ${value.toFixed(2)}`;
const getRecords = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const setRecords = records => localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

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
function mealSchedule(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  const holiday = getPeruHoliday(dateValue);
  if (holiday) return { lunch: false, dinner: false, note: `Feriado: ${holiday}.` };
  if (date.getDay() === 0 || date.getDay() === 6) return { lunch: false, dinner: false, note: 'Fin de semana: no hay comidas programadas.' };
  if (date.getDay() === 5) return { lunch: true, dinner: false, note: 'Viernes: solo almuerzo programado.' };
  return { lunch: true, dinner: true, note: 'Almuerzo y cena programados.' };
}

function addAugust2026Records() {
  if (localStorage.getItem(AUGUST_2026_SEED_KEY)) return;
  const augustRecords = {
    '2026-08-03': { lunch: true, dinner: true },
    '2026-08-04': { lunch: true, dinner: false },
    '2026-08-05': { lunch: true, dinner: true },
    '2026-08-07': { lunch: true, dinner: false },
    '2026-08-10': { lunch: true, dinner: true },
    '2026-08-11': { lunch: true, dinner: true },
    '2026-08-12': { lunch: false, dinner: true }
  };
  const records = getRecords();
  Object.entries(augustRecords).forEach(([date, record]) => {
    if (!records[date]) records[date] = record;
  });
  setRecords(records);
  localStorage.setItem(AUGUST_2026_SEED_KEY, 'true');
}

function currentRecord() { return getRecords()[dateInput.value] || { lunch: false, dinner: false }; }
function updateSelectedDate() {
  document.querySelector('[data-selected-date]').textContent = formatDate(dateInput.value);
  document.querySelector('#go-today').hidden = dateInput.value === localDate();
}
function updateMealButtons() {
  const record = currentRecord();
  const schedule = mealSchedule(dateInput.value);
  [[lunchButton, record.lunch, schedule.lunch], [dinnerButton, record.dinner, schedule.dinner]].forEach(([button, selected, scheduled]) => {
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = !scheduled;
  });
  document.querySelector('#schedule-note').textContent = schedule.note;
}
function saveMeal(meal) {
  const records = getRecords();
  const record = records[dateInput.value] || { lunch: false, dinner: false };
  record[meal] = !record[meal];
  if (!record.lunch && !record.dinner) delete records[dateInput.value];
  else records[dateInput.value] = record;
  setRecords(records);
  updateMealButtons();
  renderSummary();
  message.textContent = record[meal] ? 'Guardado en tu teléfono.' : 'Registro actualizado.';
  window.setTimeout(() => { message.textContent = ''; }, 2500);
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
  }).filter(([date]) => {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return date <= today && weekday !== 0 && weekday !== 6;
  });
}
function renderSummary() {
  const rows = recordsForMonth();
  const meals = rows.reduce((total, [, record]) => total + Number(record.lunch) + Number(record.dinner), 0);
  document.querySelector('#meal-count').textContent = meals;
  document.querySelector('#amount').textContent = money(meals * PRICE);
  document.querySelector('#monthly-detail').textContent = meals ? `${rows.length} día${rows.length === 1 ? '' : 's'} con registros · S/ ${PRICE.toFixed(2)} por comida` : 'Aún no hay comidas registradas.';
  const list = document.querySelector('#history-list');
  list.innerHTML = '';
  daysForMonth().forEach(([date, record]) => {
    const count = Number(record.lunch) + Number(record.dinner);
    const schedule = mealSchedule(date);
    const names = count ? [record.lunch && 'Almuerzo', record.dinner && 'Cena'].filter(Boolean).join(' · ') : schedule.note;
    list.insertAdjacentHTML('beforeend', `<li><div><div class="history-date">${formatDate(date)}</div><div class="history-meals${count ? '' : ' no-meal'}">${names}</div></div><span class="history-total">${money(count * PRICE)}</span></li>`);
  });
}
function summaryText() {
  const rows = recordsForMonth();
  const meals = rows.reduce((total, [, record]) => total + Number(record.lunch) + Number(record.dinner), 0);
  const label = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(`${monthInput.value}-01T12:00:00`));
  const detail = rows.slice().reverse().map(([date, record]) => {
    const names = [record.lunch && 'Almuerzo', record.dinner && 'Cena'].filter(Boolean).join(' + ');
    const count = Number(record.lunch) + Number(record.dinner);
    return `• ${formatDate(date)}: ${names} — ${money(count * PRICE)}`;
  });
  return [
    `Resumen de comidas — ${label}`,
    `Precio por comida: ${money(PRICE)}`,
    '',
    'Detalle por fecha:',
    ...(detail.length ? detail : ['• Sin comidas registradas.']),
    '',
    `Total: ${meals} comida${meals === 1 ? '' : 's'} · ${money(meals * PRICE)}`
  ].join('\n');
}
async function shareSummary() {
  const text = summaryText();
  if (navigator.share) {
    await navigator.share({ title: 'Resumen de comidas', text });
    return true;
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    alert('Detalle copiado. Pégalo en WhatsApp antes de continuar.');
    return true;
  }
  alert(text);
  return true;
}

addAugust2026Records();
dateInput.value = localDate();
monthInput.value = dateInput.value.slice(0, 7);
lunchButton.addEventListener('click', () => saveMeal('lunch'));
dinnerButton.addEventListener('click', () => saveMeal('dinner'));
dateInput.addEventListener('change', () => { updateSelectedDate(); updateMealButtons(); });
monthInput.addEventListener('change', renderSummary);
document.querySelector('#go-today').addEventListener('click', () => { dateInput.value = localDate(); updateSelectedDate(); updateMealButtons(); });
document.querySelector('#share-summary').addEventListener('click', () => { shareSummary().catch(() => {}); });
document.querySelector('#clear-month').addEventListener('click', async () => {
  const rows = recordsForMonth();
  if (!rows.length) { alert('No hay comidas registradas para borrar en este mes.'); return; }
  if (!confirm('Primero exportarás el detalle del mes. Podrás elegir WhatsApp en la hoja de compartir. ¿Continuar?')) return;
  try {
    await shareSummary();
  } catch {
    alert('No se borró nada porque cancelaste la exportación.');
    return;
  }
  if (confirm(`¿Ya guardaste o enviaste el detalle? Esta acción borrará los ${rows.length} registros de este mes.`)) {
    const all = getRecords();
    rows.forEach(([date]) => delete all[date]);
    setRecords(all);
    updateMealButtons();
    renderSummary();
  }
});
updateSelectedDate(); updateMealButtons(); renderSummary();
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
