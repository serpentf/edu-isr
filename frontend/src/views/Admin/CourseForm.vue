<template>
  <div class="course-form-page">
    <h1>{{ isEdit ? 'Редактировать' : 'Создать' }} курс</h1>

    <form @submit.prevent="handleSubmit" class="course-form">
      <div class="form-group">
        <label for="title">Название курса</label>
        <input id="title" v-model="form.title" type="text" required placeholder="Введите название" />
      </div>

      <div class="form-group">
        <label for="description">Описание</label>
        <textarea id="description" v-model="form.description" required placeholder="Описание курса" rows="4"></textarea>
      </div>

      <div class="form-group">
        <label for="slug">URL-адрес (slug)</label>
        <input id="slug" v-model="form.slug" type="text" required placeholder="my-awesome-course" />
        <small class="hint">Уникальный URL-адрес для курса</small>
      </div>

      <div class="form-group">
        <label for="image">URL изображения</label>
        <input id="image" v-model="form.image" type="url" placeholder="https://example.com/image.jpg" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="level">Уровень</label>
          <select id="level" v-model="form.level" required>
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>

        <div class="form-group">
          <label for="duration_hours">Длительность (часы)</label>
          <input id="duration_hours" v-model.number="form.duration_hours" type="number" step="0.5" min="0" required />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.is_published" />
            Опубликовать
          </label>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Сохранение...' : (isEdit ? 'Сохранить изменения' : 'Создать курс') }}
        </button>
        <router-link to="/admin/courses" class="btn-cancel">Отмена</router-link>
      </div>
    </form>
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

    const generateSlug = (title) => {
      return title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    };

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

<style scoped>
.course-form-page h1 {
  color: #16213e;
  margin-bottom: 2rem;
}

.course-form {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 700px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4ecca3;
}

.hint {
  color: #888;
  font-size: 0.8rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400 !important;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-submit {
  background: #4ecca3;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-submit:hover:not(:disabled) {
  background: #3db892;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #e9ecef;
  color: #333;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.3s;
}

.btn-cancel:hover {
  background: #ddd;
}
</style>
