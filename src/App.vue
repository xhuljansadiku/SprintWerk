<template>
  <div id="app" :class="{ 'dark-mode': isDarkMode }">
    <h1>My To-Do List</h1>
    <div class="todo-container">
      <!-- Dark Mode Toggle -->
      <button @click="toggleDarkMode" class="dark-mode-toggle">
        {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
      </button>

      <!-- Add Task Section -->
      <div class="add-task">
        <input
          v-model="newTask"
          @keyup.enter="addTask"
          placeholder="Add a new task"
        />
        <input
          type="date"
          v-model="newTaskDueDate"
          placeholder="Due Date"
        />
        <select v-model="newTaskCategory">
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="shopping">Shopping</option>
        </select>
        <select v-model="newTaskPriority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button @click="addTask">Add</button>
      </div>

      <!-- Search Bar -->
      <input
        v-model="searchQuery"
        placeholder="Search tasks..."
        class="search-bar"
      />

      <!-- Task Count and Controls -->
      <div class="task-controls">
        <span>{{ remainingTasks }} tasks left</span>
        <button @click="clearCompleted">Clear Completed</button>
        <button @click="showArchived = !showArchived">
          {{ showArchived ? 'Hide Archived' : 'Show Archived' }}
        </button>
      </div>

      <!-- Filter buttons -->
      <div class="filters">
        <button @click="setFilter('all')" :class="{ active: filter === 'all' }">All</button>
        <button @click="setFilter('completed')" :class="{ active: filter === 'completed' }">Completed</button>
        <button @click="setFilter('incomplete')" :class="{ active: filter === 'incomplete' }">Incomplete</button>
      </div>

      <!-- List of tasks -->
      <ul>
        <li
          v-for="(task, index) in filteredTasks"
          :key="task.id"
          draggable="true"
          @dragstart="dragStart(index)"
          @dragover.prevent
          @drop="drop(index)"
          :class="[task.priority, { completed: task.completed, archived: task.archived }]"
        >
          <span>
            {{ task.text }}
            <small v-if="task.dueDate">(Due: {{ formatDate(task.dueDate) }})</small>
            <small v-if="task.category"> | {{ task.category }}</small>
          </span>
          <div>
            <button @click="toggleComplete(task.id)">
              {{ task.completed ? 'Undo' : 'Complete' }}
            </button>
            <button @click="editTask(task.id)">Edit</button>
            <button @click="archiveTask(task.id)">
              {{ task.archived ? 'Unarchive' : 'Archive' }}
            </button>
            <button @click="removeTask(task.id)">Delete</button>
          </div>
        </li>
      </ul>

      <!-- Archived Tasks -->
      <div v-if="showArchived">
        <h2>Archived Tasks</h2>
        <ul>
          <li
            v-for="task in archivedTasks"
            :key="task.id"
            :class="[task.priority, { completed: task.completed }]"
          >
            <span>
              {{ task.text }}
              <small v-if="task.dueDate">(Due: {{ formatDate(task.dueDate) }})</small>
              <small v-if="task.category"> | {{ task.category }}</small>
            </span>
            <div>
              <button @click="unarchiveTask(task.id)">Unarchive</button>
              <button @click="removeTask(task.id)">Delete</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Export/Import Buttons -->
      <div class="import-export">
        <button @click="exportTasks">Export Tasks</button>
        <input type="file" @change="importTasks" accept=".json" />
      </div>
    </div>

    <!-- Edit Task Modal -->
    <div v-if="editingTask" class="modal">
      <div class="modal-content">
        <h2>Edit Task</h2>
        <input v-model="editedTaskText" placeholder="Edit task" />
        <input type="date" v-model="editedTaskDueDate" placeholder="Due Date" />
        <select v-model="editedTaskCategory">
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="shopping">Shopping</option>
        </select>
        <select v-model="editedTaskPriority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <textarea v-model="editedTaskNotes" placeholder="Notes"></textarea>
        <button @click="saveEditedTask">Save</button>
        <button @click="cancelEdit">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      newTask: '', // Holds the new task input
      newTaskDueDate: '', // Holds the due date for the new task
      newTaskCategory: 'work', // Holds the category for the new task
      newTaskPriority: 'low', // Holds the priority for the new task
      tasks: [], // Holds the list of tasks
      filter: 'all', // Current filter
      searchQuery: '', // Search query
      editingTask: null, // Task being edited
      editedTaskText: '', // Text for the task being edited
      editedTaskDueDate: '', // Due date for the task being edited
      editedTaskCategory: 'work', // Category for the task being edited
      editedTaskPriority: 'low', // Priority for the task being edited
      editedTaskNotes: '', // Notes for the task being edited
      dragStartIndex: null, // Index of the task being dragged
      isDarkMode: false, // Dark mode toggle
      showArchived: false, // Show archived tasks
    };
  },
  computed: {
    // Filter tasks based on the selected filter and search query
    filteredTasks() {
      let tasks = this.tasks.filter((task) => !task.archived);
      if (this.filter === 'completed') {
        tasks = tasks.filter((task) => task.completed);
      } else if (this.filter === 'incomplete') {
        tasks = tasks.filter((task) => !task.completed);
      }
      if (this.searchQuery) {
        tasks = tasks.filter((task) =>
          task.text.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }
      return tasks;
    },
    // Archived tasks
    archivedTasks() {
      return this.tasks.filter((task) => task.archived);
    },
    // Count remaining tasks
    remainingTasks() {
      return this.tasks.filter((task) => !task.completed && !task.archived).length;
    },
  },
  methods: {
    // Add a new task
    addTask() {
      if (this.newTask.trim() === '') return; // Prevent empty tasks
      this.tasks.push({
        id: Date.now(), // Unique ID for each task
        text: this.newTask,
        dueDate: this.newTaskDueDate,
        category: this.newTaskCategory,
        priority: this.newTaskPriority,
        notes: '',
        completed: false,
        archived: false,
      });
      this.newTask = ''; // Clear the input
      this.newTaskDueDate = ''; // Clear the due date
      this.newTaskCategory = 'work'; // Reset category
      this.newTaskPriority = 'low'; // Reset priority
      this.saveTasks();
    },
    // Toggle task completion
    toggleComplete(taskId) {
      const task = this.tasks.find((task) => task.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveTasks();
      }
    },
    // Archive a task
    archiveTask(taskId) {
      const task = this.tasks.find((task) => task.id === taskId);
      if (task) {
        task.archived = !task.archived;
        this.saveTasks();
      }
    },
    // Unarchive a task
    unarchiveTask(taskId) {
      const task = this.tasks.find((task) => task.id === taskId);
      if (task) {
        task.archived = false;
        this.saveTasks();
      }
    },
    // Remove a task
    removeTask(taskId) {
      this.tasks = this.tasks.filter((task) => task.id !== taskId);
      this.saveTasks();
    },
    // Edit a task
    editTask(taskId) {
      const task = this.tasks.find((task) => task.id === taskId);
      if (task) {
        this.editingTask = taskId;
        this.editedTaskText = task.text;
        this.editedTaskDueDate = task.dueDate;
        this.editedTaskCategory = task.category;
        this.editedTaskPriority = task.priority;
        this.editedTaskNotes = task.notes;
      }
    },
    // Save the edited task
    saveEditedTask() {
      const task = this.tasks.find((task) => task.id === this.editingTask);
      if (task) {
        task.text = this.editedTaskText;
        task.dueDate = this.editedTaskDueDate;
        task.category = this.editedTaskCategory;
        task.priority = this.editedTaskPriority;
        task.notes = this.editedTaskNotes;
        this.saveTasks();
      }
      this.cancelEdit();
    },
    // Cancel editing
    cancelEdit() {
      this.editingTask = null;
      this.editedTaskText = '';
      this.editedTaskDueDate = '';
      this.editedTaskCategory = 'work';
      this.editedTaskPriority = 'low';
      this.editedTaskNotes = '';
    },
    // Set the filter
    setFilter(filter) {
      this.filter = filter;
    },
    // Clear completed tasks
    clearCompleted() {
      this.tasks = this.tasks.filter((task) => !task.completed);
      this.saveTasks();
    },
    // Drag and drop functionality
    dragStart(index) {
      this.dragStartIndex = index;
    },
    drop(dropIndex) {
      const task = this.tasks.splice(this.dragStartIndex, 1)[0];
      this.tasks.splice(dropIndex, 0, task);
      this.saveTasks();
    },
    // Format date for display
    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },
    // Toggle dark mode
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
    },
    // Export tasks as JSON
    exportTasks() {
      const data = JSON.stringify(this.tasks);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tasks.json';
      link.click();
      URL.revokeObjectURL(url);
    },
    // Import tasks from JSON
    importTasks(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.tasks = JSON.parse(e.target.result);
          this.saveTasks();
        };
        reader.readAsText(file);
      }
    },
    // Save tasks to localStorage
    saveTasks() {
      localStorage.setItem('tasks', JSON.stringify(this.tasks));
    },
    // Load tasks from localStorage
    loadTasks() {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
      }
    },
  },
  mounted() {
    this.loadTasks(); // Load tasks when the app is mounted
  },
};
</script>

 <style>
/* Global Styles */
body {
  font-family: 'Arial', sans-serif;
  background-color: #f4f4f9;
  color: #333;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  transition: background-color 0.3s, color 0.3s;
}

.dark-mode body {
  background-color: #1e1e2f;
  color: #f4f4f9;
}

/* App Container */
#app {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;
}

.dark-mode #app {
  background-color: #2a2a40;
}

/* Header */
h1 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.dark-mode h1 {
  color: #fff;
}

/* Dark Mode Toggle */
.dark-mode-toggle {
  background-color: #4a4a4a;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dark-mode .dark-mode-toggle {
  background-color: #e0e0e0;
  color: #333;
}

/* Add Task Section */
.add-task {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.add-task input,
.add-task select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
  transition: border-color 0.3s;
}

.add-task input:focus,
.add-task select:focus {
  border-color: #007bff;
}

.add-task button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-task button:hover {
  background-color: #0056b3;
}

/* Search Bar */
.search-bar {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-bottom: 20px;
  transition: border-color 0.3s;
}

.search-bar:focus {
  border-color: #007bff;
}

/* Task List */
ul {
  padding: 0;
  list-style: none;
}

li {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s;
}

li.completed {
  text-decoration: line-through;
  opacity: 0.6;
}

li.archived {
  display: none;
}

li.low {
  border-left: 5px solid #28a745;
}

li.medium {
  border-left: 5px solid #ffc107;
}

li.high {
  border-left: 5px solid #dc3545;
}

.dark-mode li {
  background-color: #3a3a55;
  border-color: #444;
}

/* Task Buttons */
li button {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  transition: color 0.3s;
}

li button:hover {
  color: #0056b3;
}

/* Task Controls */
.task-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.task-controls button {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.task-controls button:hover {
  background-color: #5a6268;
}

/* Filters */
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters button {
  background-color: #e9ecef;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.filters button.active {
  background-color: #007bff;
  color: white;
}

.filters button:hover {
  background-color: #ced4da;
}

.dark-mode .filters button.active {
  background-color: #0056b3;
}

/* Archived Tasks */
.archived-tasks {
  margin-top: 20px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.dark-mode .archived-tasks {
  background-color: #2a2a40;
}

/* Import/Export */
.import-export {
  margin-top: 20px;
}

.import-export button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.import-export button:hover {
  background-color: #0056b3;
}

.import-export input[type='file'] {
  margin-left: 10px;
}

/* Edit Task Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 5px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.modal-content input,
.modal-content select,
.modal-content textarea {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.modal-content button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.modal-content button:hover {
  background-color: #218838;
}

/* Animations */
li {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 600px) {
  .add-task {
    flex-direction: column;
  }

  .task-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}

</style>