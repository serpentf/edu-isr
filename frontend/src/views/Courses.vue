<template>
  <div>
    <h1 class="mb-4">Каталог курсов</h1>

    <div v-if="coursesStore.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
      <p class="mt-3 text-muted">Загрузка...</p>
    </div>

    <div v-else-if="coursesStore.error" class="alert alert-danger">
      {{ coursesStore.error.error || 'Ошибка загрузки' }}
    </div>

    <div v-else class="row g-4">
      <div class="col-md-6 col-lg-4" v-for="course in coursesStore.publishedCourses" :key="course.id">
        <div class="card h-100 shadow-sm hover-shadow">
          <div v-if="course.image" class="card-img-top overflow-hidden" style="height: 200px;">
            <img :src="course.image" :alt="course.title" class="img-fluid w-100" style="object-fit: cover;">
          </div>
          <div class="card-body d-flex flex-column">
            <div class="mb-2">
              <span class="badge" :class="levelBadgeClass(course.level)">{{ levelLabel(course.level) }}</span>
            </div>
            <h5 class="card-title">{{ course.title }}</h5>
            <p class="card-text text-muted flex-grow-1">{{ course.description }}</p>
            <div class="text-muted small mt-3">
              <span class="me-3">⏱ {{ course.duration_hours }} часов</span>
              <span>📚 {{ course.modules?.length || 0 }} модулей</span>
            </div>
          </div>
          <div class="card-footer bg-transparent border-top-0 pb-3">
            <router-link :to="`/course/${course.slug}`" class="btn btn-primary w-100">Подробнее</router-link>
          </div>
        </div>
      </div>

      <div v-if="coursesStore.publishedCourses.length === 0" class="col-12">
        <div class="alert alert-info text-center">
          Курсы пока не добавлены. Загляните позже!
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useCoursesStore } from '@/stores/courses';

export default {
  name: 'Courses',
  setup() {
    const coursesStore = useCoursesStore();

    onMounted(() => {
      coursesStore.fetchAll(true);
    });

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

    return { coursesStore, levelBadgeClass, levelLabel };
  }
};
</script>

<style scoped>
.hover-shadow:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-2px);
  transition: all 0.2s ease-in-out;
}
</style>
