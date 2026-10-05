import { defineStore } from 'pinia';
import { ref } from 'vue';
import { progressAPI } from '@/api';

export const useProgressStore = defineStore('progress', () => {
  const progress = ref([]);
  const stats = ref(null);
  const loading = ref(false);

  const getProgress = async (userId) => {
    loading.value = true;
    try {
      const response = await progressAPI.get(userId);
      progress.value = response.data.progress;
      stats.value = response.data.stats;
      return response.data;
    } catch (error) {
      return { progress: [], stats: {} };
    } finally {
      loading.value = false;
    }
  };

  const updateLessonProgress = async (lessonId, data) => {
    try {
      const response = await progressAPI.updateLesson(lessonId, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return { progress, stats, loading, getProgress, updateLessonProgress };
});
