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

// Filtra UI
const search = ref('');
const byPriority = ref('');
const byCategory = ref('');

// v-model për id-të e kolonave; setter bën persistim
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

// Drag lëvizje midis kolonave
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

// Filtrim në UI (search/priority/category)
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
  // nëse ndryshon kolona/statusi, lëviz id-në
  const currentStatus = ['todo','doing','done'].find(s => store.columns[s].includes(edit.id));
  if (currentStatus && currentStatus !== edit.status) {
    store.moveBetween(currentStatus, edit.status, edit.id, 0);
  }
  editing.value = false;
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

body { background-color: #040430; margin:0; }
#app {
  font-family: 'Inter', sans-serif;
  max-width: 1100px;
  margin: 32px auto;
  padding: 0 16px 40px;
  color:#111827;
}
.hdr { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin-bottom: 10px; }
.hdr h1 { color:#fff; margin:0; font-size: 28px; font-weight: 900; letter-spacing:.2px; }
.hdr .sub { color:#cbd5e1; margin:.2rem 0 0; }
.stats { display:flex; gap:.75rem; color:#cbd5e1; }

.toolbar { display:flex; flex-wrap:wrap; gap:.5rem; margin: 12px 0 18px; }
.control {
  background:#fff; border:1px solid #E5E7EB; border-radius:10px; padding:.55rem .7rem; min-width: 180px;
}
.btn { background:#111827; color:#fff; border:0; padding:.55rem .9rem; border-radius:10px; font-weight:700; cursor:pointer; }
.btn.light { background:#E5E7EB; color:#111827; }

.board { display:grid; gap: 12px; grid-template-columns: repeat(3, 1fr); }
.col { background: #F8FAFC; border:1px solid #E5E7EB; border-radius:16px; padding: 10px; display:flex; flex-direction:column; gap:10px; }
.col-h { font-weight:800; color:#111827; padding:.2rem .4rem .4rem .4rem; }
.list { display:flex; flex-direction:column; gap:8px; min-height: 60px; }
.empty { color:#94A3B8; font-size:.9rem; text-align:center; padding: 8px; border:1px dashed #CBD5E1; border-radius:10px; }

.list :deep(.sortable-ghost){ opacity:.6; }
.list :deep(.sortable-drag){ transform: rotate(1deg); }

.modal { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.modal-content { background:#fff; border-radius:14px; padding:18px; width:min(520px, 100%); display:grid; gap:.6rem; }
.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:.5rem; }
.actions { display:flex; justify-content:flex-end; gap:.5rem; }

@media (max-width: 900px){ .board { grid-template-columns: 1fr; } }
</style>
