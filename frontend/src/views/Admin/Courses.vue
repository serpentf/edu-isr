<template>
  <div class="admin-courses">
    <div class="admin-header">
      <h1>Управление курсами</h1>
      <router-link to="/admin/courses/create" class="btn-create">+ Создать курс</router-link>
    </div>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Уровень</th>
            <th>Модули</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in courses" :key="course.id">
            <td>{{ course.id }}</td>
            <td>{{ course.title }}</td>
            <td>
              <span class="badge level" :class="course.level">{{ course.level }}</span>
            </td>
            <td>{{ course.modules?.length || 0 }}</td>
            <td>
              <span class="badge" :class="course.is_published ? 'published' : 'draft'">
                {{ course.is_published ? 'Опубликован' : 'Черновик' }}
              </span>
            </td>
            <td class="actions">
              <router-link :to="`/admin/courses/${course.id}/edit`" class="btn-edit">✏️</router-link>
              <button @click="deleteCourse(course.id)" class="btn-delete">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="courses.length === 0" class="empty-state">
        <p>Курсы еще не созданы</p>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import { coursesAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'AdminCourses',
  setup() {
    const courses = ref([]);
    const loading = ref(true);
    const auth = useAuthStore();

    const fetchCourses = async () => {
      try {
        const response = await coursesAPI.getAll({ published: undefined });
        courses.value = response.data;
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        loading.value = false;
      }
    };

    const deleteCourse = async (id) => {
      if (!confirm('Вы уверены, что хотите удалить этот курс?')) return;

      try {
        await coursesAPI.delete(id);
        courses.value = courses.value.filter(c => c.id !== id);
      } catch (error) {
        alert('Ошибка при удалении курса');
      }
    };

    onMounted(() => {
      fetchCourses();
    });

    return { courses, loading, deleteCourse, auth };
  }
};
</script>

<style scoped>
.admin-courses h1 {
  color: #16213e;
  margin-bottom: 1rem;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.btn-create {
  background: #4ecca3;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.3s;
}

.btn-create:hover {
  background: #3db892;
}

.admin-table-container {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.admin-table th,
.admin-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.admin-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #16213e;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
}

.badge.level.beginner { background: #d4edda; color: #155724; }
.badge.level.intermediate { background: #fff3cd; color: #856404; }
.badge.level.advanced { background: #f8d7da; color: #721c24; }

.badge.published { background: #d4edda; color: #155724; }
.badge.draft { background: #e9ecef; color: #666; }

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit, .btn-delete {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: opacity 0.3s;
}

.btn-edit {
  background: #4ecca3;
  color: white;
  text-decoration: none;
}

.btn-delete {
  background: #ff6b6b;
  color: white;
}

.btn-edit:hover, .btn-delete:hover {
  opacity: 0.8;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}
</style>
