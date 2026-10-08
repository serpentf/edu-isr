<template>
  <div>
    <div v-if="!auth.isAuthenticated" class="alert alert-info">
      Подсказки в лаборатории у каждого студента свои, а ответы проверяет сервер.
      <router-link :to="`/login?redirect=${encodeURIComponent($route.fullPath)}`">Войдите</router-link>, чтобы начать.
    </div>

    <div v-else-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else-if="state">
      <!-- The mock shop: every clue is hidden in a place only DevTools can reach -->
      <div class="card border-primary shadow-sm mb-4">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-shop text-primary" aria-hidden="true"></i>
          <span class="fw-semibold">Учебный магазин «Чайная лавка»</span>
        </div>
        <div class="card-body">
          <div class="alert alert-info d-sm-none">
            <i class="bi bi-phone me-1" aria-hidden="true"></i>
            Скидка 10% в мобильном приложении по коду <strong>{{ state.clues.mobile_code }}</strong>
          </div>

          <div class="row g-3 align-items-center mb-3">
            <div class="col-auto">
              <i class="bi bi-cup-hot display-5 text-primary" aria-hidden="true"></i>
            </div>
            <div class="col">
              <h3 class="h5 mb-1">Чайник заварочный, 1 л</h3>
              <div class="text-body-secondary small">Стекло, съёмное ситечко</div>
            </div>
            <div class="col-auto fs-4 fw-semibold">2 500 ₽</div>
          </div>

          <div class="d-none" data-testid="promo">Промокод для сотрудников: {{ state.clues.promo }}</div>

          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" @click="checkout">
              <i class="bi bi-bag-check me-1" aria-hidden="true"></i>Оформить заказ
            </button>
            <button type="button" class="btn btn-outline-secondary" :disabled="reviewsLoading" @click="loadReviews">
              <span v-if="reviewsLoading" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              <i v-else class="bi bi-chat-square-text me-1" aria-hidden="true"></i>Загрузить отзывы
            </button>
          </div>

          <div v-if="shopMessage" class="alert alert-warning mt-3 mb-0" aria-live="polite">{{ shopMessage }}</div>
        </div>
      </div>

      <!-- Answers -->
      <div class="card shadow-sm mb-4">
        <div class="card-body p-4">
          <h2 class="h4 mb-3">Ответы</h2>
          <div v-if="state.completed && !result" class="alert alert-success">
            <i class="bi bi-check-circle-fill me-1" aria-hidden="true"></i>Лаборатория уже пройдена. Можно пройти ещё раз для тренировки.
          </div>

          <form novalidate @submit.prevent="submit">
            <div v-for="(task, index) in state.tasks" :key="task.key" class="mb-3">
              <label :for="`lab-${task.key}`" class="form-label">
                <span class="badge text-bg-secondary me-1">{{ task.panel }}</span>
                {{ index + 1 }}. {{ task.label }}
              </label>
              <input :id="`lab-${task.key}`" v-model="answers[task.key]" type="text" class="form-control font-monospace"
                     :class="fieldClass(task.key)" autocomplete="off" spellcheck="false"
                     :aria-describedby="resultFor(task.key)?.hint ? `lab-${task.key}-hint` : null">
              <div v-if="resultFor(task.key)?.hint" :id="`lab-${task.key}-hint`" class="invalid-feedback">
                {{ resultFor(task.key).hint }}
              </div>
            </div>

            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Проверить ответы
            </button>
          </form>

          <div v-if="submitError" class="alert alert-danger mt-3 mb-0">{{ submitError }}</div>
          <div v-if="result" class="alert mt-3 mb-0" :class="result.passed ? 'alert-success' : 'alert-warning'" aria-live="polite">
            <template v-if="result.passed">
              <i class="bi bi-trophy-fill me-1" aria-hidden="true"></i><strong>Лаборатория пройдена!</strong> Все подсказки найдены.
            </template>
            <template v-else>
              Верно {{ correctCount }} из {{ state.tasks.length }}. Подсказки — под полями с ошибками.
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue';
import { labsAPI } from '@/api';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'DevtoolsLab',
  props: {
    lessonId: { type: Number, required: true }
  },
  emits: ['passed'],
  setup(props, { emit }) {
    const auth = useAuthStore();
    const state = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const answers = ref({});
    const result = ref(null);
    const submitting = ref(false);
    const submitError = ref(null);
    const shopMessage = ref(null);
    const reviewsLoading = ref(false);

    const resultFor = (key) => result.value?.results.find((r) => r.key === key);
    const fieldClass = (key) => {
      const r = resultFor(key);
      if (!r) return null;
      return r.correct ? 'is-valid' : 'is-invalid';
    };
    const correctCount = computed(() => result.value?.results.filter((r) => r.correct).length || 0);

    const load = async () => {
      if (!auth.isAuthenticated) return;
      loading.value = true;
      try {
        state.value = (await labsAPI.state(props.lessonId)).data;
        // Task 6: something the site keeps in the browser storage
        try {
          localStorage.setItem('cart_token', state.value.clues.storage_token);
        } catch {
          // Storage may be blocked; the task hint explains where to look
        }
      } catch (err) {
        error.value = err.response?.data?.error || 'Не удалось загрузить лабораторию';
      } finally {
        loading.value = false;
      }
    };

    // Task 2: the user sees a vague message, the details are only in the console
    const checkout = () => {
      console.error(new Error(`PaymentGatewayError: платёжный шлюз отклонил запрос [${state.value.clues.console_code}]`));
      shopMessage.value = 'Не удалось оформить заказ. Что-то пошло не так.';
    };

    // Tasks 3–5: a real HTTP request that fails; inspect it in the Network panel
    const loadReviews = async () => {
      reviewsLoading.value = true;
      try {
        await labsAPI.reviews(props.lessonId);
        shopMessage.value = 'Отзывы загружены.';
      } catch {
        shopMessage.value = 'Не удалось загрузить отзывы. Попробуйте позже.';
      } finally {
        reviewsLoading.value = false;
      }
    };

    const submit = async () => {
      submitting.value = true;
      submitError.value = null;
      try {
        result.value = (await labsAPI.check(props.lessonId, answers.value)).data;
        if (result.value.passed) emit('passed');
      } catch (err) {
        submitError.value = err.response?.data?.error || 'Не удалось проверить ответы';
      } finally {
        submitting.value = false;
      }
    };

    onMounted(load);

    return {
      auth, state, loading, error, answers, result, submitting, submitError, shopMessage, reviewsLoading,
      resultFor, fieldClass, correctCount, checkout, loadReviews, submit
    };
  }
};
</script>
