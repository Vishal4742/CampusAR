const baseInput = document.querySelector('#apiBase');
const tokenInput = document.querySelector('#token');
const output = document.querySelector('#output');
const status = document.querySelector('#status');

const savedBase = localStorage.getItem('campusar.admin.apiBase');
const savedToken = localStorage.getItem('campusar.admin.token');

if (savedBase) {
  baseInput.value = savedBase;
}

if (savedToken) {
  tokenInput.value = savedToken;
}

const show = (payload) => {
  output.textContent = JSON.stringify(payload, null, 2);
};

const request = async (path, { auth = false } = {}) => {
  const baseUrl = baseInput.value.replace(/\/$/, '');
  const headers = { accept: 'application/json' };

  if (auth && tokenInput.value.trim()) {
    headers.authorization = `Bearer ${tokenInput.value.trim()}`;
  }

  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = await response.json();
  status.textContent = `${response.status} ${response.statusText}`;
  show(body);
};

document.querySelector('#saveBase').addEventListener('click', () => {
  localStorage.setItem('campusar.admin.apiBase', baseInput.value);
  localStorage.setItem('campusar.admin.token', tokenInput.value);
  status.textContent = 'Saved';
});

document.querySelector('#checkHealth').addEventListener('click', () => request('/health'));
document.querySelector('#loadRoutes').addEventListener('click', () => request('/api/v1/routes'));
document.querySelector('#loadManifest').addEventListener('click', () => request('/api/v1/sync/manifest'));
document.querySelector('#loadUsers').addEventListener('click', () => request('/api/v1/admin/users', { auth: true }));
document.querySelector('#loadThresholds').addEventListener('click', () => request('/api/v1/admin/thresholds', { auth: true }));
document.querySelector('#loadMapLock').addEventListener('click', () => request('/api/v1/admin/map-lock', { auth: true }));
