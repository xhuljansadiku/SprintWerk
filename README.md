# SprintWerk (Vue 3 + Pinia + DnD + Offline)

Kanban board with drag & drop, offline storage (IndexedDB), and a clean Pinia store.

•  **Live:** https://sprintwerk.netlify.app/ 
• **Repo:** https://github.com/xhuljansadiku/SprintWerk

---

## Features
- To Do / Doing / Done columns (drag & drop with vuedraggable)
- Offline-first (IndexedDB via localforage) + debounced autosave
- Search & filters (priority, category)
- Edit modal (title, description, due date, priority, category, status)
- Export JSON (tasks + column order)
- Auto-migration from legacy `localStorage` → new store

---

## Quick Start
```bash
npm i
npm run serve   # http://localhost:8080
npm run build   # outputs to /dist
