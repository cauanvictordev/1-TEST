const taskList = document.querySelector('#taskList');
const taskForm = document.querySelector('#taskForm');
const titleInput = document.querySelector('#taskTitle');
const descriptionInput = document.querySelector('#taskDescription');
let tasks = [];
let activeFilter = 'TODAS';
let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function notify(message, isError = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.erro || 'Não foi possível concluir a operação.');
  }
  return response.status === 204 ? null : response.json();
}

function renderTasks() {
  const filtered = tasks.filter((task) => activeFilter === 'TODAS' || task.status === activeFilter);
  taskList.innerHTML = filtered.length ? filtered.map((task, index) => `
    <article class="task-card ${task.status === 'CONCLUÍDA' ? 'completed' : ''}" style="animation-delay:${Math.min(index * 35, 210)}ms">
      <input class="task-check" type="checkbox" data-action="toggle" data-id="${task.id}" ${task.status === 'CONCLUÍDA' ? 'checked' : ''} aria-label="${task.status === 'CONCLUÍDA' ? 'Reabrir' : 'Concluir'} ${escapeHtml(task.titulo)}">
      <div class="task-copy"><div class="task-title">${escapeHtml(task.titulo)}</div>${task.descricao ? `<div class="task-description">${escapeHtml(task.descricao)}</div>` : ''}<div class="task-date">Criada em ${new Date(`${task.data_criacao.replace(' ', 'T')}`).toLocaleDateString('pt-BR')}</div></div>
      <span class="status-pill">${task.status}</span>
      <button class="delete-task" data-action="delete" data-id="${task.id}" type="button" aria-label="Excluir ${escapeHtml(task.titulo)}" title="Excluir tarefa">×</button>
    </article>`).join('') : `
    <div class="empty-state"><span class="empty-icon">✦</span><strong>${activeFilter === 'TODAS' ? 'Tudo começa com uma tarefa' : 'Nenhuma tarefa por aqui'}</strong><span>${activeFilter === 'TODAS' ? 'Adicione uma tarefa e organize seu próximo passo.' : 'Escolha outro filtro ou adicione uma nova tarefa.'}</span></div>`;

  const pending = tasks.filter((task) => task.status === 'PENDENTE').length;
  const done = tasks.length - pending;
  document.querySelector('#totalCount').textContent = tasks.length;
  document.querySelector('#pendingCount').textContent = pending;
  document.querySelector('#doneCount').textContent = done;
  document.querySelector('#headingCount').textContent = tasks.length;
  document.querySelector('#navCount').textContent = pending;
}

async function loadTasks() {
  try {
    tasks = await request('/api/tarefas');
    renderTasks();
  } catch (error) {
    taskList.innerHTML = `<div class="empty-state"><strong>Não foi possível carregar as tarefas</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

document.querySelector('#openForm').addEventListener('click', () => {
  taskForm.hidden = !taskForm.hidden;
  if (!taskForm.hidden) titleInput.focus();
});
document.querySelector('#cancelForm').addEventListener('click', () => { taskForm.reset(); taskForm.hidden = true; });
taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = taskForm.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await request('/api/tarefas', { method: 'POST', body: JSON.stringify({ titulo: titleInput.value, descricao: descriptionInput.value }) });
    taskForm.reset();
    taskForm.hidden = true;
    activeFilter = 'TODAS';
    document.querySelectorAll('.filter-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.filter === activeFilter));
    await loadTasks();
    notify('Tarefa salva no banco de dados.');
  } catch (error) { notify(error.message, true); }
  finally { submit.disabled = false; }
});

document.querySelector('.filter-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-filter]');
  if (!tab) return;
  activeFilter = tab.dataset.filter;
  document.querySelectorAll('.filter-tab').forEach((item) => item.classList.toggle('active', item === tab));
  renderTasks();
});

taskList.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;
  checkbox.disabled = true;
  try { await request(`/api/tarefas/${checkbox.dataset.id}`, { method: 'PUT' }); await loadTasks(); }
  catch (error) { notify(error.message, true); await loadTasks(); }
});

taskList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  button.disabled = true;
  try { await request(`/api/tarefas/${button.dataset.id}`, { method: 'DELETE' }); await loadTasks(); notify('Tarefa excluída.'); }
  catch (error) { notify(error.message, true); button.disabled = false; }
});

const themeToggle = document.querySelector('#themeToggle');
function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  document.querySelector('#themeIcon').textContent = dark ? '☀' : '☾';
  themeToggle.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  localStorage.setItem('taskflow-theme', dark ? 'dark' : 'light');
}
setTheme(localStorage.getItem('taskflow-theme') === 'dark');
themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));

document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
loadTasks();
