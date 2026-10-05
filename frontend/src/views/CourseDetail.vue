<template>
  <div class="course-detail">
    <div v-if="coursesStore.loading" class="loading">Загрузка курса...</div>

    <div v-else-if="coursesStore.error" class="error">
      {{ coursesStore.error.error || 'Ошибка загрузки курса' }}
    </div>

    <div v-else-if="course" class="course-content">
      <div class="course-header">
        <h1>{{ course.title }}</h1>
        <div class="course-badges">
          <span class="badge level" :class="course.level">{{ course.level }}</span>
          <span class="badge">⏱ {{ course.duration_hours }} часов</span>
        </div>
        <p class="course-description">{{ course.description }}</p>
      </div>

      <div v-if="courseProgress" class="progress-overview">
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: courseProgress.completion_percentage + '%' }"></div>
        </div>
        <p>{{ courseProgress.completed_lessons }} / {{ courseProgress.total_lessons }} уроков пройдено ({{ courseProgress.completion_percentage }}%)</p>
      </div>

      <div class="modules-list">
        <div v-for="module in course.modules" :key="module.id" class="module">
          <h2 class="module-title">
            <span class="module-number">{{ module.order_index }}</span>
            {{ module.title }}
          </h2>

          <div class="lessons-list">
            <router-link
              v-for="lesson in module.lessons"
              :key="lesson.id"
              :to="`/lesson/${lesson.id}`"
              class="lesson-item"
              :class="{ completed: isLessonCompleted(lesson.id) }"
            >
              <span class="lesson-type" :class="lesson.type">{{ getLessonTypeLabel(lesson.type) }}</span>
              <span class="lesson-title">{{ lesson.title }}</span>
              <span class="lesson-arrow">→</span>
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
      auth
    };
  }
};
</script>

<style scoped>
.course-detail h1 {
  color: #16213e;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.course-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
}

.badge.level.beginner { background: #d4edda; color: #155724; }
.badge.level.intermediate { background: #fff3cd; color: #856404; }
.badge.level.advanced { background: #f8d7da; color: #721c24; }

.course-description {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.progress-overview {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 2rem;
}

.progress-bar-container {
  background: #e9ecef;
  border-radius: 10px;
  height: 20px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar {
  background: linear-gradient(90deg, #4ecca3, #3db892);
  height: 100%;
  transition: width 0.3s;
}

.modules-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.module-title {
  color: #16213e;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.module-number {
  background: #4ecca3;
  color: white;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.lessons-list {
  margin-top: 1rem;
  padding-left: 2.5rem;
}

.lesson-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  transition: background 0.3s;
  margin-bottom: 0.5rem;
}

.lesson-item:hover {
  background: #f8f9fa;
}

.lesson-item.completed {
  background: #d4edda;
}

.lesson-type {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  background: #e9ecef;
}

.lesson-type.text { background: #d1ecf1; color: #0c5460; }
.lesson-type.video { background: #f8d7da; color: #721c24; }
.lesson-type.quiz { background: #fff3cd; color: #856404; }
.lesson-type.code_challenge { background: #d4edda; color: #155724; }

.lesson-title {
  flex: 1;
  font-weight: 500;
}

.lesson-arrow {
  color: #4ecca3;
  font-size: 1.2rem;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
}

.error { color: #ff6b6b; }
</style>
