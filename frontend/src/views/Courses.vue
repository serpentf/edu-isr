<template>
  <div>
    <h1 class="mb-4">Каталог курсов</h1>

    <div v-if="coursesStore.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
      <p class="mt-3 text-body-secondary">Загрузка...</p>
    </div>

    <div v-else-if="coursesStore.error" class="alert alert-danger">
      {{ coursesStore.error.error || 'Ошибка загрузки' }}
    </div>

    <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div class="col" v-for="course in coursesStore.publishedCourses" :key="course.id">
        <div class="card h-100 shadow-sm">
          <div v-if="course.image" class="ratio ratio-16x9">
            <img :src="course.image" :alt="course.title" class="card-img-top object-fit-cover">
          </div>
          <div class="card-body d-flex flex-column">
            <div class="mb-2">
              <span class="badge" :class="levelBadgeClass(course.level)">{{ levelLabel(course.level) }}</span>
            </div>
            <h2 class="h5 card-title">{{ course.title }}</h2>
            <p class="card-text text-body-secondary flex-grow-1">{{ course.description }}</p>
            <div class="small text-body-secondary d-flex gap-3">
              <span><i class="bi bi-clock me-1" aria-hidden="true"></i>{{ course.duration_hours }} ч</span>
              <span><i class="bi bi-collection me-1" aria-hidden="true"></i>{{ course.modules?.length || 0 }} модулей</span>
            </div>
          </div>
          <div class="card-footer bg-transparent border-top-0 pb-3">
            <router-link :to="`/course/${course.slug}`" class="btn btn-primary w-100 stretched-link">Подробнее</router-link>
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
import { levelBadgeClass, levelLabel } from '@/utils/badges';

export default {
  name: 'Courses',
  setup() {
    const coursesStore = useCoursesStore();

    onMounted(() => {
      coursesStore.fetchAll(true);
    });

    return { coursesStore, levelBadgeClass, levelLabel };
  }
};
</script>
