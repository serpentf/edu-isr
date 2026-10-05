<template>
  <div class="dashboard">
    <h1>Мой прогресс</h1>

    <div v-if="auth.isAuthenticated" class="dashboard-content">
      <div class="welcome-banner">
        <h2>Привет, {{ auth.user.name }}! 👋</h2>
        <p>Следите за своим прогрессом обучения</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <span class="stat-value">{{ allProgress.length }}</span>
            <span class="stat-label">Всего уроков</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ completedCount }}</span>
            <span class="stat-label">Пройдено</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <span class="stat-value">{{ completionRate }}%</span>
            <span class="stat-label">Прогресс</span>
          </div>
        </div>
      </div>

      <div class="my-courses">
        <h3>Мои курсы</h3>
        <div class="courses-list">
          <div v-for="item in groupedCourses" :key="item.courseId" class="course-progress-item">
            <router-link :to="`/course/${item.courseSlug}`" class="course-link">
              <h4>{{ item.courseTitle }}</h4>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="{ width: item.completionPercentage + '%' }"></div>
              </div>
              <span class="completion-text">{{ item.completedLessons }} / {{ item.totalLessons }} уроков ({{ item.completionPercentage }}%)</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { useCoursesStore } from '@/stores/courses';

export default {
  name: 'Dashboard',
  setup() {
    const auth = useAuthStore();
    const progressStore = useProgressStore();
    const coursesStore = useCoursesStore();

    const allProgress = computed(() => progressStore.progress);
    const completedCount = computed(() =>
      allProgress.value.filter(p => p.is_completed).length
    );

    const completionRate = computed(() => {
      if (allProgress.value.length === 0) return 0;
      return ((completedCount.value / allProgress.value.length) * 100).toFixed(1);
    });

    const groupedCourses = computed(() => {
      const courseMap = new Map();

      allProgress.value.forEach(progress => {
        const course = progress.lesson?.module?.course;
        if (course) {
          const courseId = course.id;
          if (!courseMap.has(courseId)) {
            courseMap.set(courseId, {
              courseId: course.id,
              courseTitle: course.title,
              courseSlug: course.slug,
              totalLessons: 0,
              completedLessons: 0,
              completionPercentage: 0
            });
          }

          const courseData = courseMap.get(courseId);
          courseData.totalLessons++;
          if (progress.is_completed) {
            courseData.completedLessons++;
          }
        }
      });

      return Array.from(courseMap.values()).map(data => ({
        ...data,
        completionPercentage: data.totalLessons > 0
          ? ((data.completedLessons / data.totalLessons) * 100).toFixed(0)
          : 0
      }));
    });

    const loadDashboard = async () => {
      if (auth.isAuthenticated) {
        await progressStore.getProgress(auth.user.id);
      }
    };

    onMounted(() => {
      loadDashboard();
    });

    return {
      auth,
      allProgress,
      completedCount,
      completionRate,
      groupedCourses,
      coursesStore
    };
  }
};
</script>

<style scoped>
.dashboard h1 {
  color: #16213e;
  margin-bottom: 2rem;
}

.welcome-banner {
  background: linear-gradient(135deg, #4ecca3, #2d8f6f);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.welcome-banner h2 {
  margin: 0 0 0.5rem 0;
}

.welcome-banner p {
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #16213e;
}

.stat-label {
  color: #888;
  font-size: 0.9rem;
}

.my-courses h3 {
  color: #16213e;
  margin-bottom: 1rem;
}

.courses-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.course-progress-item {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.course-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.course-link h4 {
  color: #16213e;
  margin-bottom: 0.75rem;
}

.progress-bar-container {
  background: #e9ecef;
  border-radius: 10px;
  height: 12px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-bar {
  background: linear-gradient(90deg, #4ecca3, #3db892);
  height: 100%;
  transition: width 0.3s;
}

.completion-text {
  color: #666;
  font-size: 0.85rem;
}
</style>
