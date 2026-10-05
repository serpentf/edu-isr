<template>
  <div>
    <h1 class="h3 mb-4">{{ isEdit ? 'Редактировать' : 'Создать' }} курс</h1>

    <div class="card shadow-sm" style="max-width: 700px;">
      <div class="card-body p-4">
        <form @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label for="title" class="form-label">Название курса</label>
            <input id="title" v-model="form.title" type="text" class="form-control" required placeholder="Введите название" />
          </div>

          <div class="mb-3">
            <label for="description" class="form-label">Описание</label>
            <textarea id="description" v-model="form.description" class="form-control" required placeholder="Описание курса" rows="4"></textarea>
          </div>

          <div class="mb-3">
            <label for="slug" class="form-label">URL-адрес (slug)</label>
            <input id="slug" v-model="form.slug" type="text" class="form-control" required placeholder="my-awesome-course" />
            <small class="form-text text-muted">Уникальный URL-адрес для курса</small>
          </div>

          <div class="mb-3">
            <label for="image" class="form-label">URL изображения</label>
            <input id="image" v-model="form.image" type="url" class="form-control" placeholder="https://example.com/image.jpg" />
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label for="level" class="form-label">Уровень</label>
              <select id="level" v-model="form.level" class="form-select" required>
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>

            <div class="col-md-4">
              <label for="duration_hours" class="form-label">Длительность (часы)</label>
              <input id="duration_hours" v-model.number="form.duration_hours" type="number" class="form-control" step="0.5" min="0" required />
            </div>

            <div class="col-md-4 d-flex align-items-end">
              <div class="form-check mb-2">
                <input type="checkbox" v-model="form.is_published" class="form-check-input" id="is_published">
                <label class="form-check-label" for="is_published">Опубликовать</label>
              </div>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

          <div class="d-flex gap-2 mt-4">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Сохранение...' : (isEdit ? 'Сохранить изменения' : 'Создать курс') }}
            </button>
            <router-link to="/admin/courses" class="btn btn-secondary">Отмена</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { coursesAPI } from '@/api';

export default {
  name: 'CourseForm',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const form = ref({
      title: '',
      description: '',
      slug: '',
      image: '',
      level: 'beginner',
      duration_hours: 0,
      is_published: false
    });

    const loading = ref(false);
    const error = ref(null);

    const isEdit = computed(() => !!route.params.id);
    const courseId = computed(() => route.params.id);

    const loadCourse = async () => {
      if (!isEdit.value) return;

      try {
        const response = await fetch(`/api/courses/${courseId.value}`);
        const course = await response.json();

        form.value = {
          title: course.title,
          description: course.description,
          slug: course.slug,
          image: course.image || '',
          level: course.level,
          duration_hours: course.duration_hours,
          is_published: course.is_published
        };
      } catch (error) {
        console.error('Failed to load course:', error);
      }
    };

    const handleSubmit = async () => {
      error.value = null;
      loading.value = true;

      try {
        if (isEdit.value) {
          await coursesAPI.update(courseId.value, form.value);
        } else {
          await coursesAPI.create(form.value);
        }
        router.push('/admin/courses');
      } catch (err) {
        error.value = err.response?.data?.error || 'Ошибка сохранения';
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadCourse();
    });

    return { form, loading, error, isEdit, handleSubmit };
  }
};
</script>
