import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { coursesAPI, progressAPI } from '@/api';

export const useCoursesStore = defineStore('courses', () => {
  const courses = ref([]);
  const currentCourse = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const publishedCourses = computed(() =>
    courses.value.filter(c => c.is_published)
  );

  const fetchAll = async (published = true) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await coursesAPI.getAll({ published });
      courses.value = response.data;
    } catch (err) {
      error.value = err.response?.data || { error: 'Failed to fetch courses' };
    } finally {
      loading.value = false;
    }
  };

  const fetchBySlug = async (slug) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await coursesAPI.getBySlug(slug);
      currentCourse.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err.response?.data || { error: 'Failed to fetch course' };
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchCourseProgress = async (courseId) => {
    try {
      const response = await progressAPI.getCourse(courseId);
      return response.data;
    } catch (err) {
      return null;
    }
  };

  const clearCurrent = () => {
    currentCourse.value = null;
  };

  return {
    courses,
    currentCourse,
    loading,
    error,
    publishedCourses,
    fetchAll,
    fetchBySlug,
    fetchCourseProgress,
    clearCurrent
  };
});
