<template>
  <div class="card">
    <div class="top">
      <strong class="title">{{ task.title }}</strong>
      <div class="actions">
        <button class="link" title="Edit" @click="$emit('edit', task.id)">✏️</button>
        <button class="link" title="Delete" @click="$emit('delete', task.id)">🗑️</button>
      </div>
    </div>

    <p v-if="task.description" class="desc">{{ task.description }}</p>

    <div class="meta">
      <span v-if="task.dueDate" class="chip">📅 {{ task.dueDate }}</span>
      <span class="chip" :class="priorityClass">⚡ {{ task.priority }}</span>
      <span class="chip">🗂️ {{ task.category }}</span>
    </div>

    <!-- s'ka më optional chaining -->
    <div v-if="task.tags && task.tags.length" class="tags">
      <span v-for="t in task.tags" :key="t" class="tag">#{{ t }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  task: { type: Object, required: true }
});

const priorityMap = { high: 'danger', medium: 'warn', low: 'ok' };
const priorityClass = computed(() => priorityMap[props.task.priority] || '');
</script>

<style scoped>
.card { background: #fff; border:1px solid #E5E7EB; border-radius: 14px; padding: .75rem; display:flex; flex-direction:column; gap:.4rem; }
.top { display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
.title { font-weight:800; color:#111827; }
.actions .link { all:unset; cursor:pointer; opacity:.75; font-size: 18px; margin-left: .5rem; }
.actions .link:hover{ opacity:1; transform: scale(1.05); }
.desc { color:#4B5563; margin:.25rem 0; }
.meta { display:flex; gap:.4rem; flex-wrap:wrap; }
.chip { font-size:.8rem; background:#F3F4F6; border:1px solid #E5E7EB; border-radius:999px; padding:.15rem .5rem; color:#111827; }
.chip.warn{ border-color:#F59E0B; color:#B45309; background:#FEF3C7; }
.chip.danger{ border-color:#EF4444; color:#B91C1C; background:#FEE2E2; }
.chip.ok{ border-color:#10B981; color:#065F46; background:#D1FAE5; }
.tags { display:flex; flex-wrap:wrap; gap:.35rem; }
.tag { background:#EEF2FF; border:1px solid #E0E7FF; color:#4338CA; border-radius:999px; padding:.15rem .5rem; font-size:.8rem; }
</style>
