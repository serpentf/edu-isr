<template>
  <div>
    <div v-if="coursesStore.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
      <p class="mt-3 text-muted">Загрузка курса...</p>
    </div>

    <div v-else-if="coursesStore.error" class="alert alert-danger">
      {{ coursesStore.error.error || 'Ошибка загрузки курса' }}
    </div>

    <div v-else-if="course" class="course-detail">
      <!-- Course Header -->
      <div class="mb-4">
        <h1 class="display-6 fw-bold mb-3">{{ course.title }}</h1>
        <div class="mb-3">
          <span class="badge me-2" :class="levelBadgeClass(course.level)">{{ levelLabel(course.level) }}</span>
          <span class="badge bg-secondary">⏱ {{ course.duration_hours }} часов</span>
        </div>
        <p class="lead text-muted">{{ course.description }}</p>
      </div>

      <!-- Progress Overview -->
      <div v-if="courseProgress" class="card mb-4 bg-light">
        <div class="card-body">
          <h5 class="card-title mb-3">Ваш прогресс</h5>
          <div class="progress" style="height: 25px;">
            <div class="progress-bar bg-success" role="progressbar" 
                 :style="{ width: courseProgress.completion_percentage + '%' }"
                 :aria-valuenow="courseProgress.completion_percentage" 
                 aria-valuemin="0" aria-valuemax="100">
              {{ courseProgress.completion_percentage }}%
            </div>
          </div>
          <p class="mt-2 small text-muted">
            {{ courseProgress.completed_lessons }} / {{ courseProgress.total_lessons }} уроков пройдено
          </p>
        </div>
      </div>

      <!-- Modules List -->
      <div class="modules-list">
        <div v-for="module in course.modules" :key="module.id" class="card mb-4 shadow-sm">
          <div class="card-header bg-white">
            <h2 class="h5 mb-0 d-flex align-items-center">
              <span class="badge bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                    style="width: 35px; height: 35px;">{{ module.order_index }}</span>
              {{ module.title }}
            </h2>
          </div>
          <div class="card-body p-0">
            <router-link
              v-for="lesson in module.lessons"
              :key="lesson.id"
              :to="`/lesson/${lesson.id}`"
              class="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
              :class="{ 'list-group-item-success': isLessonCompleted(lesson.id) }"
            >
              <div class="d-flex align-items-center gap-3">
                <span class="badge" :class="lessonTypeBadgeClass(lesson.type)">{{ getLessonTypeLabel(lesson.type) }}</span>
                <span>{{ lesson.title }}</span>
              </div>
              <span class="text-primary">→</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCoursesStore } from '@/stores/courses';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'CourseDetail',
  setup() {
    const route = useRoute();
    const coursesStore = useCoursesStore();
    const auth = useAuthStore();

    const course = computed(() => coursesStore.currentCourse);
    const courseProgress = computed(() => null);

    const isLessonCompleted = (lessonId) => {
      if (!auth.isAuthenticated) return false;
      return false;
    };

    const getLessonTypeLabel = (type) => {
      const labels = {
        text: '📄 Текст',
        video: '🎥 Видео',
        quiz: '❓ Тест',
        code_challenge: '💻 Код'
      };
      return labels[type] || type;
    };

    const lessonTypeBadgeClass = (type) => {
      const classes = {
        text: 'bg-info',
        video: 'bg-danger',
        quiz: 'bg-warning text-dark',
        code_challenge: 'bg-success'
      };
      return classes[type] || 'bg-secondary';
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

    const loadCourse = async () => {
      const slug = route.params.slug;
      await coursesStore.fetchBySlug(slug);
      if (auth.isAuthenticated) {
        await coursesStore.fetchCourseProgress(course.value?.id);
      }
    };

    onMounted(() => {
      loadCourse();
    });

    return {
      course,
      courseProgress,
      coursesStore,
      isLessonCompleted,
      getLessonTypeLabel,
      lessonTypeBadgeClass,
      levelBadgeClass,
      levelLabel,
      auth
    };
  }
};
</script>
