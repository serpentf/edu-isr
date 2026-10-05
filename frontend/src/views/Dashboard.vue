<template>
  <div>
    <h1 class="mb-4">Мой прогресс</h1>

    <div v-if="auth.isAuthenticated">
      <!-- Welcome Banner -->
      <div class="alert alert-primary alert-dismissible fade show mb-4" role="alert">
        <h2 class="h4 mb-0">Привет, {{ auth.user.name }}! 👋</h2>
        <p class="mb-0 mt-1">Следите за своим прогрессом обучения</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>

      <!-- Stats Grid -->
      <div class="row row-cols-1 row-cols-md-3 g-4 mb-4">
        <div class="col">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="display-6 mb-2">📚</div>
              <h3 class="h2 fw-bold">{{ allProgress.length }}</h3>
              <p class="text-body-secondary mb-0">Всего уроков</p>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="display-6 mb-2">✅</div>
              <h3 class="h2 fw-bold text-success">{{ completedCount }}</h3>
              <p class="text-body-secondary mb-0">Пройдено</p>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="display-6 mb-2">📊</div>
              <h3 class="h2 fw-bold text-primary">{{ completionRate }}%</h3>
              <p class="text-body-secondary mb-0">Прогресс</p>
            </div>
          </div>
        </div>
      </div>

      <!-- My Courses -->
      <div class="card shadow-sm">
        <div class="card-header">
          <h3 class="h5 mb-0">Мои курсы</h3>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6" v-for="item in groupedCourses" :key="item.courseId">
              <router-link :to="`/course/${item.courseSlug}`" class="text-decoration-none">
                <div class="card h-100 border-0 shadow-sm">
                  <div class="card-body">
                    <h4 class="h5 card-title mb-2">{{ item.courseTitle }}</h4>
                    <div class="progress mb-2" role="progressbar" :aria-valuenow="item.completionPercentage"
                         aria-valuemin="0" aria-valuemax="100">
                      <div class="progress-bar bg-success" :style="{ width: item.completionPercentage + '%' }"></div>
                    </div>
                    <small class="text-body-secondary">{{ item.completedLessons }} / {{ item.totalLessons }} уроков ({{ item.completionPercentage }}%)</small>
                  </div>
                </div>
              </router-link>
            </div>
            <div v-if="groupedCourses.length === 0" class="col-12">
              <p class="text-body-secondary">Вы ещё не начали ни одного курса.</p>
            </div>
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
