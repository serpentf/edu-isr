<template>
  <div>
    <div class="d-flex flex-wrap align-items-center justify-content-between mb-4">
      <h1 class="h3 mb-0">Управление курсами</h1>
      <router-link to="/admin/courses/create" class="btn btn-success">
        + Создать курс
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
      <p class="mt-3 text-muted">Загрузка...</p>
    </div>

    <div v-else class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
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
                <span class="badge" :class="levelBadgeClass(course.level)">{{ levelLabel(course.level) }}</span>
              </td>
              <td>{{ course.modules?.length || 0 }}</td>
              <td>
                <span class="badge" :class="course.is_published ? 'bg-success' : 'bg-secondary'">
                  {{ course.is_published ? 'Опубликован' : 'Черновик' }}
                </span>
              </td>
              <td>
                <router-link :to="`/admin/courses/${course.id}/edit`" class="btn btn-sm btn-outline-primary me-1">
                  ✏️
                </router-link>
                <button @click="deleteCourse(course.id)" class="btn btn-sm btn-outline-danger">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="courses.length === 0" class="alert alert-info m-3 mb-0">
        Курсы еще не созданы
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

    const levelBadgeClass = (level) => {
      const classes = {
        beginner: 'bg-success',
        intermediate: 'bg-warning text-dark',
        advanced: 'bg-danger'
      };
      return classes[level] || 'bg-secondary';
    };

    const levelLabel = (level) => {
      const labels = {
        beginner: 'Начинающий',
        intermediate: 'Средний',
        advanced: 'Продвинутый'
      };
      return labels[level] || level;
    };

    onMounted(() => {
      fetchCourses();
    });

    return { courses, loading, deleteCourse, auth, levelBadgeClass, levelLabel };
  }
};
</script>
