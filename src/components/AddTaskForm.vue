<template>
  <form class="add-form" @submit.prevent="submit">
    <div class="row">
      <input v-model.trim="title" class="input" type="text" placeholder="Task title *" required />
      <select v-model="priority" class="input">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <input v-model="dueDate" class="input" type="date" />
      <select v-model="category" class="input">
        <option value="work">Work</option>
        <option value="personal">Personal</option>
        <option value="shopping">Shopping</option>
      </select>
    </div>
    <textarea v-model.trim="description" class="input" rows="2" placeholder="Description (optional)"></textarea>
    <input v-model.trim="tagsText" class="input" type="text" placeholder="Tags (comma separated)" />
    <button class="btn">Add Task</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useTasksStore } from '../stores/useTasks';

const store = useTasksStore();
const title = ref('');
const description = ref('');
const dueDate = ref('');
const priority = ref('medium');
const category = ref('work');
const tagsText = ref('');

function submit() {
  if (!title.value.trim()) return;
  const tags = tagsText.value.split(',').map(s => s.trim()).filter(Boolean);
  store.addTask({ title: title.value, description: description.value, dueDate: dueDate.value, priority: priority.value, tags, category: category.value });
  title.value = ''; description.value = ''; dueDate.value = ''; priority.value = 'medium'; tagsText.value = ''; category.value = 'work';
}
</script>

<style scoped>
.add-form { display: grid; gap: .5rem; margin-bottom: 1rem; }
.row { display: grid; grid-template-columns: 1fr auto auto auto; gap: .5rem; }
.input {
  background: #F9FAFB; border: 1px solid #E5E7EB; color: #111827;
  border-radius: 10px; padding: .6rem .75rem; outline: none;
}
.input:focus { border-color: #3B82F6; background: #fff; box-shadow: 0 0 0 .15rem rgba(59,130,246,.15); }
.btn {
  justify-self: start; background: #111827; color: #fff; border: 0; border-radius: 10px;
  padding: .6rem .9rem; font-weight: 700; cursor: pointer;
}
.btn:hover { filter: brightness(1.05); }
@media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
</style>
