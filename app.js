const PRICE = 11;
const STORAGE_KEY = 'mis-comidas-v1';
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

function currentRecord() { return getRecords()[dateInput.value] || { lunch: false, dinner: false }; }
function updateMealButtons() {
  const record = currentRecord();
  [[lunchButton, record.lunch], [dinnerButton, record.dinner]].forEach(([button, selected]) => {
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
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
function renderSummary() {
  const rows = recordsForMonth();
  const meals = rows.reduce((total, [, record]) => total + Number(record.lunch) + Number(record.dinner), 0);
  document.querySelector('#meal-count').textContent = meals;
  document.querySelector('#amount').textContent = money(meals * PRICE);
  document.querySelector('#monthly-detail').textContent = meals ? `${rows.length} día${rows.length === 1 ? '' : 's'} con registros · S/ ${PRICE.toFixed(2)} por comida` : 'Aún no hay comidas registradas.';
  const list = document.querySelector('#history-list');
  list.innerHTML = '';
  if (!rows.length) { list.innerHTML = '<li class="empty">No has registrado comidas en este mes.</li>'; return; }
  rows.forEach(([date, record]) => {
    const names = [record.lunch && 'Almuerzo', record.dinner && 'Cena'].filter(Boolean).join(' · ');
    const count = Number(record.lunch) + Number(record.dinner);
    list.insertAdjacentHTML('beforeend', `<li><div><div class="history-date">${formatDate(date)}</div><div class="history-meals">${names}</div></div><span class="history-total">${money(count * PRICE)}</span></li>`);
  });
}
function shareSummary() {
  const rows = recordsForMonth();
  const meals = rows.reduce((total, [, record]) => total + Number(record.lunch) + Number(record.dinner), 0);
  const label = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(`${monthInput.value}-01T12:00:00`));
  const text = `Resumen de comidas — ${label}\nComidas: ${meals}\nMonto por cancelar: ${money(meals * PRICE)}\n(S/ ${PRICE.toFixed(2)} por comida)`;
  if (navigator.share) navigator.share({ title: 'Resumen de comidas', text });
  else navigator.clipboard.writeText(text).then(() => alert('Resumen copiado.')); 
}

dateInput.value = localDate();
monthInput.value = dateInput.value.slice(0, 7);
document.querySelector('[data-today]').textContent = formatDate(dateInput.value);
lunchButton.addEventListener('click', () => saveMeal('lunch'));
dinnerButton.addEventListener('click', () => saveMeal('dinner'));
dateInput.addEventListener('change', () => { updateMealButtons(); });
monthInput.addEventListener('change', renderSummary);
document.querySelector('#go-today').addEventListener('click', () => { dateInput.value = localDate(); updateMealButtons(); });
document.querySelector('#share-summary').addEventListener('click', shareSummary);
document.querySelector('#clear-month').addEventListener('click', () => {
  const rows = recordsForMonth();
  if (rows.length && confirm(`¿Borrar los ${rows.length} registros de este mes?`)) { const all = getRecords(); rows.forEach(([date]) => delete all[date]); setRecords(all); updateMealButtons(); renderSummary(); }
});
updateMealButtons(); renderSummary();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
