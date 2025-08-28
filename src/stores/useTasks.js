// src/stores/useTasks.js
import { defineStore } from 'pinia';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { toRaw } from 'vue';

localforage.config({ name: 'SprintWerk', storeName: 'todo' });
const STORAGE_KEY = 'tasks_v1';

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [], // [{id,title,description,dueDate,priority,tags[],category,status,createdAt,updatedAt}]
    columns: { todo: [], doing: [], done: [] }
  }),

  getters: {
    getTask: (state) => (id) => state.tasks.find(t => t.id === id),
    counts: (state) => ({
      todo: state.columns.todo.length,
      doing: state.columns.doing.length,
      done: state.columns.done.length
    })
  },

  actions: {
    async load() {
      const data = await localforage.getItem(STORAGE_KEY);

      // Nqs u ruajt si string, parse-o
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          this.tasks = (parsed.tasks || []).map(t => ({ ...t }));
          this.columns = {
            todo: [...(parsed.columns?.todo || [])],
            doing: [...(parsed.columns?.doing || [])],
            done: [...(parsed.columns?.done || [])]
          };
        } catch {
          // në rast korruptimi, reset
          this.tasks = [];
          this.columns = { todo: [], doing: [], done: [] };
        }
      } else if (data && typeof data === 'object') {
        // për kompatibilitet nëse ke ruajtur si objekt më herët
        this.tasks = (data.tasks || []).map(t => ({ ...t }));
        this.columns = {
          todo: [...(data.columns?.todo || [])],
          doing: [...(data.columns?.doing || [])],
          done: [...(data.columns?.done || [])]
        };
      } else {
        // Migrim nga localStorage "tasks" (formati yt i vjetër)
        const legacy = localStorage.getItem('tasks');
        if (legacy) {
          const old = JSON.parse(legacy);
          const migrated = old.map(o => ({
            id: o.id || uuidv4(),
            title: o.text || 'Untitled',
            description: o.notes || '',
            dueDate: o.dueDate || '',
            priority: o.priority || 'medium',
            tags: [],
            category: o.category || 'work',
            status: o.completed ? 'done' : 'todo',
            createdAt: dayjs().toISOString(),
            updatedAt: dayjs().toISOString()
          }));
          this.tasks = migrated;
          this.columns = {
            todo: migrated.filter(t => t.status === 'todo').map(t => t.id),
            doing: migrated.filter(t => t.status === 'doing').map(t => t.id),
            done: migrated.filter(t => t.status === 'done').map(t => t.id)
          };
          await this.save(); // ruaje menjëherë në formatin e ri
        }
      }

      // Autosave me debounce (s’ruan për çdo ndryshim mikroskopik)
      let t;
      this.$subscribe(() => {
        clearTimeout(t);
        t = setTimeout(() => this.save(), 150);
      }, { detached: true });
    },

    async save() {
      // Hiq proxy-t reaktivë dhe krijo payload të pastër
      const plainTasks = toRaw(this.tasks).map(t => ({ ...t }));
      const plainColumns = {
        todo: [...toRaw(this.columns.todo)],
        doing: [...toRaw(this.columns.doing)],
        done: [...toRaw(this.columns.done)]
      };

      const payload = { tasks: plainTasks, columns: plainColumns };

      // ✅ ruaje si STRING — shmang DataCloneError
      await localforage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },

    addTask({ title, description = '', dueDate = '', priority = 'medium', tags = [], category = 'work' }) {
      const id = uuidv4();
      const now = dayjs().toISOString();
      const task = {
        id, title, description, dueDate, priority, tags, category,
        status: 'todo', createdAt: now, updatedAt: now
      };
      this.tasks.unshift(task);
      this.columns.todo.unshift(id);
    },

    updateTask(id, patch) {
      const idx = this.tasks.findIndex(t => t.id === id);
      if (idx === -1) return;
      this.tasks[idx] = { ...this.tasks[idx], ...patch, updatedAt: dayjs().toISOString() };
    },

    removeTask(id) {
      this.tasks = this.tasks.filter(t => t.id !== id);
      Object.keys(this.columns).forEach(k => {
        this.columns[k] = this.columns[k].filter(x => x !== id);
      });
    },

    reorderColumn(status, newIds) {
      this.columns[status] = [...newIds];
    },

    moveBetween(from, to, id, newIndex) {
      if (from === to) return;
      this.columns[from] = this.columns[from].filter(x => x !== id);
      const arr = [...this.columns[to]];
      arr.splice(newIndex ?? 0, 0, id);
      this.columns[to] = arr;
      this.updateTask(id, { status: to });
    },

    clearCompleted() {
      const keep = new Set(this.columns.todo.concat(this.columns.doing));
      this.tasks = this.tasks.filter(t => keep.has(t.id));
      this.columns.done = [];
    },

    exportTasks() {
      const data = JSON.stringify({ tasks: this.tasks, columns: this.columns }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'tasks-export.json'; a.click();
      URL.revokeObjectURL(url);
    }
  }
});
