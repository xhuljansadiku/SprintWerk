<template>
  <div id="app">
    <header class="hdr">
      <div>
        <h1>SprintWerk</h1>
        <p class="sub">Kanban · Offline · Drag & Drop</p>
      </div>
      <div class="stats">
        <span>Todo: {{ store.counts.todo }}</span>
        <span>Doing: {{ store.counts.doing }}</span>
        <span>Done: {{ store.counts.done }}</span>
      </div>
    </header>

    <AddTaskForm />

    <!-- Controls -->
    <div class="toolbar">
      <input v-model="search" class="control" placeholder="Search tasks…" />
      <select v-model="byPriority" class="control">
        <option value="">All priorities</option>
        <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
      </select>
      <select v-model="byCategory" class="control">
        <option value="">All categories</option>
        <option value="work">Work</option><option value="personal">Personal</option><option value="shopping">Shopping</option>
      </select>
      <button class="btn light" @click="store.clearCompleted">Clear Done</button>
      <button class="btn" @click="store.exportTasks">Export</button>
    </div>

    <!-- Kanban -->
    <section class="board">
      <div class="col">
        <div class="col-h">To Do</div>
        <draggable v-model="todoIds" group="tasks" item-key="id" class="list" @change="onChange">
          <template #item="{ element }">
            <TaskCard :task="filterTask(store.getTask(element))" @edit="openEdit" @delete="store.removeTask(element)" />
          </template>
          <template #footer>
            <div v-if="todoEmpty" class="empty">No tasks</div>
          </template>
        </draggable>
      </div>

      <div class="col">
        <div class="col-h">Doing</div>
        <draggable v-model="doingIds" group="tasks" item-key="id" class="list" @change="onChange">
          <template #item="{ element }">
            <TaskCard :task="filterTask(store.getTask(element))" @edit="openEdit" @delete="store.removeTask(element)" />
          </template>
          <template #footer>
            <div v-if="doingEmpty" class="empty">No tasks</div>
          </template>
        </draggable>
      </div>

      <div class="col">
        <div class="col-h">Done</div>
        <draggable v-model="doneIds" group="tasks" item-key="id" class="list" @change="onChange">
          <template #item="{ element }">
            <TaskCard :task="filterTask(store.getTask(element))" @edit="openEdit" @delete="store.removeTask(element)" />
          </template>
          <template #footer>
            <div v-if="doneEmpty" class="empty">No tasks</div>
          </template>
        </draggable>
      </div>
    </section>

    <!-- Edit Modal -->
    <div v-if="editing" class="modal">
      <div class="modal-content">
        <h3>Edit Task</h3>
        <input v-model="edit.title" class="control" placeholder="Title" />
        <textarea v-model="edit.description" class="control" rows="3" placeholder="Description"></textarea>
        <div class="grid2">
          <input v-model="edit.dueDate" type="date" class="control" />
          <select v-model="edit.priority" class="control">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </div>
        <div class="grid2">
          <select v-model="edit.category" class="control">
            <option value="work">Work</option><option value="personal">Personal</option><option value="shopping">Shopping</option>
          </select>
          <select v-model="edit.status" class="control">
            <option value="todo">To Do</option><option value="doing">Doing</option><option value="done">Done</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn light" @click="editing=false">Cancel</button>
          <button class="btn" @click="saveEdit">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import draggable from 'vuedraggable';
import { useTasksStore } from '@/stores/useTasks';
import AddTaskForm from '@/components/AddTaskForm.vue';
import TaskCard from '@/components/TaskCard.vue';


const store = useTasksStore();
onMounted(() => store.load());

// UI Filters
const search = ref('');
const byPriority = ref('');
const byCategory = ref('');

// v-model for column ids; setter does persistence
const todoIds  = computed({
  get: () => store.columns.todo.filter(id => !!filterTask(store.getTask(id))),
  set: (val) => store.reorderColumn('todo', val)
});
const doingIds = computed({
  get: () => store.columns.doing.filter(id => !!filterTask(store.getTask(id))),
  set: (val) => store.reorderColumn('doing', val)
});
const doneIds  = computed({
  get: () => store.columns.done.filter(id => !!filterTask(store.getTask(id))),
  set: (val) => store.reorderColumn('done', val)
});

const todoEmpty = computed(() => todoIds.value.length === 0);
const doingEmpty = computed(() => doingIds.value.length === 0);
const doneEmpty = computed(() => doneIds.value.length === 0);

// Drag movement between columns
function onChange(evt) {
  const { from, to, item, newIndex } = evt;
  const id = item?.__draggable_context?.element;
  if (!id) return;
  const fromStatus = colName(from);
  const toStatus   = colName(to);
  if (fromStatus && toStatus && fromStatus !== toStatus) {
    store.moveBetween(fromStatus, toStatus, id, newIndex);
  }
}
function colName(el) {
  if (!el) return '';
  const parentCol = el.closest('.col');
  if (parentCol?.querySelector('.col-h')?.textContent.includes('To Do')) return 'todo';
  if (parentCol?.querySelector('.col-h')?.textContent.includes('Doing')) return 'doing';
  if (parentCol?.querySelector('.col-h')?.textContent.includes('Done'))  return 'done';
  return '';
}

// Filtering in UI (search/priority/category)
function filterTask(task) {
  if (!task) return null;
  if (byPriority.value && task.priority !== byPriority.value) return null;
  if (byCategory.value && task.category !== byCategory.value) return null;
  if (search.value && !task.title.toLowerCase().includes(search.value.toLowerCase())
      && !task.description?.toLowerCase().includes(search.value.toLowerCase())) return null;
  return task;
}

// Modal Edit
const editing = ref(false);
const edit = reactive({
  id: '', title: '', description: '', dueDate: '', priority: 'medium',
  category: 'work', status: 'todo'
});
function openEdit(id) {
  const t = store.getTask(id);
  if (!t) return;
  Object.assign(edit, { id: t.id, title: t.title, description: t.description || '',
    dueDate: t.dueDate || '', priority: t.priority || 'medium', category: t.category || 'work',
    status: t.status || 'todo' });
  editing.value = true;
}
function saveEdit() {
  store.updateTask(edit.id, {
    title: edit.title, description: edit.description, dueDate: edit.dueDate,
    priority: edit.priority, category: edit.category
  });
  // if column/status changes, move id
  const currentStatus = ['todo','doing','done'].find(s => store.columns[s].includes(edit.id));
  if (currentStatus && currentStatus !== edit.status) {
    store.moveBetween(currentStatus, edit.status, edit.id, 0);
  }
  editing.value = false;
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

/* ===== THEME===== */
:root{
  /* Colors */
  --bg:#f6f8fc;
  --ink:#0f172a;
  --muted:#64748b;

  --accent:#2563eb;
  --accent-ring: rgba(37,99,235,.25);

  --surface:#ffffff;
  --surface-2:#fbfdff;
  --border:#e6eaf2;

  /* Shadow */
  --shadow-sm: 0 8px 20px rgba(15,23,42,.06);
  --shadow-lg: 0 22px 60px rgba(15,23,42,.12);

  /* Spacing & radius */
  --space-1: .35rem;
  --space-2: .6rem;
  --space-3: .85rem;
  --space-4: 1.2rem;
  --space-5: 1.6rem;
  --space-6: 2.2rem;
  --radius-s: 12px;
  --radius-m: 14px;
  --radius-l: 18px;
  --radius-xl: 999px;

  /*   container */
  --container-max: 1100px;
}

/* Dark mode   */
@media (prefers-color-scheme: dark){
  :root{
    --bg:#0b1220;
    --ink:#e5e7eb;
    --muted:#94a3b8;

    --surface:#0f172a;
    --surface-2:#111827;
    --border:#223045;

    --shadow-sm: 0 8px 20px rgba(0,0,0,.35);
    --shadow-lg: 0 22px 60px rgba(0,0,0,.45);
  }
}

/* ===== BASE ===== */
*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  background:
    radial-gradient(60% 40% at 10% -10%, rgba(37,99,235,.10), transparent 50%),
    radial-gradient(60% 40% at 100% 0%, rgba(2,132,199,.10), transparent 55%),
    var(--bg);
  font-family:'Inter', system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  color:var(--ink);
  -webkit-tap-highlight-color: transparent;
}

/* Container with padding fluid + safe-area */
#app{
  max-width: var(--container-max);
  margin-inline: auto;
  padding:
    clamp(16px, 2.2vw, 28px)
    max(16px, env(safe-area-inset-right))
    clamp(44px, 4vw, 60px)
    max(16px, env(safe-area-inset-left));
}

/* ===== HEADER ===== */
.hdr{
  display:flex; align-items:flex-end; justify-content:space-between; gap:1rem;
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-2);
}
.hdr h1{
  margin:0;
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight:900; letter-spacing:.2px; color:#0b1220;
}
.hdr .sub{ 
  color:#718198; margin:.25rem 0 0;
  font-size: clamp(13px, 1.3vw, 15px);
}
.stats{ display:flex; gap:.5rem; color:#334155; flex-wrap:wrap; }
.stats span{
  background:#eef2ff;
  border:1px solid #e2e7ff;
  padding:.38rem .68rem; border-radius:var(--radius-xl);
  font-size:.85rem;
}

/* ===== CONTROLS ===== */
.toolbar{
  display:flex; flex-wrap:wrap; gap:.6rem; 
  margin: 10px 0 18px;
}
.control{
  min-width: min(100%, 280px);
  padding:.72rem .8rem; border-radius:var(--radius-s);
  border:1px solid var(--border); background:var(--surface);
  box-shadow: var(--shadow-sm);
  transition: border-color .2s ease, box-shadow .2s ease, transform .06s ease;
}
.control::placeholder{ color:#94a3b8; }
.control:focus{
  outline:0; border-color:var(--accent);
  box-shadow: 0 0 0 .18rem var(--accent-ring), var(--shadow-sm);
}

.btn{
  border:0; cursor:pointer; padding:.78rem 1.05rem; border-radius:var(--radius-s); font-weight:800;
  color:#fff; background:var(--accent);
  box-shadow: 0 10px 24px rgba(37,99,235,.22);
  transition: transform .06s ease, filter .2s ease, box-shadow .2s ease;
  touch-action: manipulation;
}
.btn:hover{ transform: translateY(-1px); filter:saturate(1.06); box-shadow: var(--shadow-lg); }
.btn:active{ transform: translateY(0); }

.btn.light{
  background:var(--surface); color:var(--ink); border:1px solid var(--border); box-shadow: var(--shadow-sm);
}
.btn.light:hover{ box-shadow: 0 14px 34px rgba(15,23,42,.10); }

/* ===== BOARD ===== */
.board{
  display:grid; gap: clamp(12px, 1.6vw, 16px);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items:start;
}


.col{
  background: var(--surface-2);
  border:1px solid var(--border);
  border-radius:var(--radius-l);
  padding: clamp(12px, 1.6vw, 18px);
  box-shadow: var(--shadow-sm);
  transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease;
}
.col:hover{ transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color:#dbe3ef; }
.col-h{
  font-weight:900; color:#0f172a; padding:.2rem .2rem .4rem; position:relative;
  font-size: clamp(15px, 1.5vw, 17px);
}
.col-h::after{
  content:""; display:block; height:3px; margin-top:8px; border-radius:var(--radius-xl);
  background: var(--accent); width:48px; opacity:.8;
}

/* ===== TASK CARD ===== */
.card{
  background: var(--surface);
  border:1px solid var(--border);
  border-radius:var(--radius-m); padding: clamp(.8rem, 1.6vw, 1rem);
  box-shadow: var(--shadow-sm);
  transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease;
}
.card:hover{ transform: translateY(-2px); box-shadow: 0 16px 40px rgba(15,23,42,.12); border-color:#dee4ef; }

.top{ display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
.title{ font-weight:800; color:#0f172a; font-size: clamp(14px, 1.5vw, 16px); }
.desc{ color:#475569; font-size: clamp(13px, 1.3vw, 15px); }

.meta{ display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.25rem; }
.chip{
  font-size: clamp(.72rem, 1.3vw, .78rem);
  background:#f5f7fb; border:1px solid #e6eaf2; color:#0f172a;
  border-radius:var(--radius-xl); padding:.18rem .6rem;
}
.chip.warn{ border-color:#f59e0b; color:#b45309; background:#fff4dc; }
.chip.danger{ border-color:#ef4444; color:#b91c1c; background:#ffe4e6; }
.chip.ok{ border-color:#10b981; color:#065f46; background:#dcfce7; }

.tags{ display:flex; gap:.35rem; flex-wrap:wrap; margin-top:.25rem; }
.tag{
  background:#eef2ff; border:1px solid #e0e7ff; color:#334155;
  border-radius:var(--radius-xl); padding:.15rem .55rem; font-size:.78rem;
}

/* ===== LIST & DnD ===== */
.list{ display:flex; flex-direction:column; gap:12px; min-height:64px; }
.empty{
  color:var(--muted); font-size:.92rem; text-align:center; padding:12px;
  border:1px dashed #cbd5e1; border-radius:12px; background:#fff;
}
.list :deep(.sortable-ghost){ opacity:.6; }
.list :deep(.sortable-drag){ transform: rotate(.6deg) scale(1.01); }

/* ===== MODAL ===== */
.modal{
  position:fixed; inset:0; z-index:1000;
  background: rgba(2,6,23,.35);
  display:flex; align-items:center; justify-content:center; padding:16px;
  backdrop-filter: blur(4px);
}
.modal-content{
  background: linear-gradient(180deg,var(--surface),var(--surface-2));
  border:1px solid var(--border); border-radius:16px; padding: clamp(16px, 2.2vw, 20px);
  width:min(540px,100%); box-shadow: var(--shadow-lg); display:grid; gap:.7rem;
}
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
.actions{ display:flex; justify-content:flex-end; gap:.6rem; }

/* ===== ACCESSIBILITY & STATES ===== */
:focus-visible{
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 8px;
}

/* ===== RESPONSIVE TWEAKS ===== */
@media (max-width: 980px){
  #app{ padding-inline: clamp(14px, 4vw, 22px); }
  .hdr{ align-items:flex-start; }
}

@media (max-width: 640px){
  .toolbar{ gap:.5rem; }
  .stats span{ padding:.3rem .55rem; }
  .top{ align-items:flex-start; }
  .grid2{ grid-template-columns:1fr; }
}


@media (prefers-reduced-motion: reduce){
  *{ transition:none !important; animation:none !important; }
}

</style>
