<template>
  <div class="courses-page">
    <h1>Каталог курсов</h1>

    <div v-if="coursesStore.loading" class="loading">Загрузка...</div>

    <div v-else-if="coursesStore.error" class="error">
      {{ coursesStore.error.error || 'Ошибка загрузки' }}
    </div>

    <div v-else class="courses-grid">
      <div
        v-for="course in coursesStore.publishedCourses"
        :key="course.id"
        class="course-card"
      >
        <router-link :to="`/course/${course.slug}`" class="course-link">
          <div class="course-image" v-if="course.image">
            <img :src="course.image" :alt="course.title" />
          </div>
          <div class="course-content">
            <span class="course-level" :class="course.level">{{ course.level }}</span>
            <h2>{{ course.title }}</h2>
            <p>{{ course.description }}</p>
            <div class="course-meta">
              <span>⏱ {{ course.duration_hours }} часов</span>
              <span>📚 {{ course.modules?.length || 0 }} модулей</span>
            </div>
          </div>
        </router-link>
      </div>

      <div v-if="coursesStore.publishedCourses.length === 0" class="empty-state">
        <p>Курсы пока не добавлены. Загляните позже!</p>
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

    return { coursesStore };
  }
};
</script>

<style scoped>
.courses-page h1 {
  color: #16213e;
  margin-bottom: 2rem;
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.course-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.course-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.course-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.course-image {
  height: 180px;
  overflow: hidden;
}

.course-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-content {
  padding: 1.5rem;
}

.course-level {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.course-level.beginner { background: #d4edda; color: #155724; }
.course-level.intermediate { background: #fff3cd; color: #856404; }
.course-level.advanced { background: #f8d7da; color: #721c24; }

.course-content h2 {
  color: #16213e;
  margin: 0.75rem 0;
}

.course-content p {
  color: #666;
  font-size: 0.9rem;
}

.course-meta {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  color: #888;
  font-size: 0.85rem;
}

.loading, .error, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.error { color: #ff6b6b; }
</style>
