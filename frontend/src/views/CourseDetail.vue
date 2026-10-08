<template>
  <div>
    <div v-if="coursesStore.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
      <p class="mt-3 text-body-secondary">Загрузка курса...</p>
    </div>

    <div v-else-if="coursesStore.error" class="alert alert-danger">
      {{ coursesStore.error.error || 'Ошибка загрузки курса' }}
    </div>

    <div v-else-if="course">
      <!-- Course Header -->
      <div class="mb-4">
        <h1 class="display-6 fw-bold mb-3">{{ course.title }}</h1>
        <div class="mb-3">
          <span class="badge me-2" :class="levelBadgeClass(course.level)">{{ levelLabel(course.level) }}</span>
          <span class="badge text-bg-secondary"><i class="bi bi-clock me-1" aria-hidden="true"></i>{{ course.duration_hours }} ч</span>
        </div>
        <p class="lead text-body-secondary">{{ course.description }}</p>
      </div>

      <!-- Progress Overview -->
      <div v-if="courseProgress" class="card mb-4">
        <div class="card-body">
          <h5 class="card-title mb-3">Ваш прогресс</h5>
          <div class="progress" role="progressbar" :aria-valuenow="courseProgress.completion_percentage"
               aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar bg-success" :style="{ width: courseProgress.completion_percentage + '%' }">
              {{ Math.round(courseProgress.completion_percentage) }}%
            </div>
          </div>
          <p class="mt-2 mb-0 small text-body-secondary">
            {{ courseProgress.completed_lessons }} / {{ courseProgress.total_lessons }} уроков пройдено
          </p>
        </div>
      </div>

      <CertificatePanel :course-id="course.id" />

      <!-- Modules List -->
      <div>
        <div v-for="module in course.modules" :key="module.id" class="card mb-4 shadow-sm">
          <div class="card-header">
            <h2 class="h5 mb-0">{{ module.title }}</h2>
          </div>
          <div class="list-group list-group-flush">
            <router-link
              v-for="lesson in module.lessons"
              :key="lesson.id"
              :to="`/lesson/${lesson.id}`"
              class="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
              :class="{ 'list-group-item-success': isLessonCompleted(lesson.id) }"
            >
              <div class="d-flex align-items-center gap-3">
                <span class="badge" :class="lessonTypeBadgeClass(lesson.type)"><i class="bi me-1" :class="lessonTypeIcon(lesson.type)" aria-hidden="true"></i>{{ lessonTypeLabel(lesson.type) }}</span>
                <span>{{ lesson.title }}</span>
              </div>
              <i class="bi bi-chevron-right text-primary" aria-hidden="true"></i>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useCoursesStore } from '@/stores/courses';
import { useAuthStore } from '@/stores/auth';
import { levelBadgeClass, levelLabel, lessonTypeBadgeClass, lessonTypeLabel, lessonTypeIcon } from '@/utils/badges';
import CertificatePanel from '@/components/CertificatePanel.vue';

export default {
  name: 'CourseDetail',
  components: { CertificatePanel },
  setup() {
    const route = useRoute();
    const coursesStore = useCoursesStore();
    const auth = useAuthStore();

    const course = computed(() => coursesStore.currentCourse);
    const courseProgress = ref(null);

    const isLessonCompleted = (lessonId) =>
      Boolean(courseProgress.value?.completed_lesson_ids?.includes(lessonId));

    const loadCourse = async () => {
      const slug = route.params.slug;
      await coursesStore.fetchBySlug(slug);
      if (auth.isAuthenticated && course.value) {
        courseProgress.value = await coursesStore.fetchCourseProgress(course.value.id);
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
      lessonTypeLabel,
      lessonTypeIcon,
      lessonTypeBadgeClass,
      levelBadgeClass,
      levelLabel,
      auth
    };
  }
};
</script>
