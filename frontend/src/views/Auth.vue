<template>
  <div class="row justify-content-center py-lg-5">
    <div class="col-md-8 col-lg-5 col-xl-4">
      <div class="card shadow-sm">
        <div class="card-body p-4 p-lg-5">
          <h1 class="h3 mb-4 text-center">{{ isRegisterMode ? 'Регистрация' : 'Вход' }}</h1>

          <form novalidate @submit.prevent="handleSubmit">
            <div v-if="isRegisterMode" class="mb-3">
              <label for="name" class="form-label">Имя</label>
              <input id="name" v-model="form.name" type="text" class="form-control" :class="{ 'is-invalid': fieldErrors.name }"
                     autocomplete="name" maxlength="100" required placeholder="Введите ваше имя"
                     :aria-describedby="fieldErrors.name ? 'name-error' : null" />
              <div v-if="fieldErrors.name" id="name-error" class="invalid-feedback">{{ fieldErrors.name }}</div>
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input id="email" v-model="form.email" type="email" class="form-control" :class="{ 'is-invalid': fieldErrors.email }"
                     autocomplete="email" required placeholder="your@email.com"
                     :aria-describedby="fieldErrors.email ? 'email-error' : null" />
              <div v-if="fieldErrors.email" id="email-error" class="invalid-feedback">{{ fieldErrors.email }}</div>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Пароль</label>
              <input id="password" v-model="form.password" type="password" class="form-control" :class="{ 'is-invalid': fieldErrors.password }"
                     :autocomplete="isRegisterMode ? 'new-password' : 'current-password'" required
                     :aria-describedby="isRegisterMode || fieldErrors.password ? 'password-help' : null" />
              <div v-if="fieldErrors.password" id="password-help" class="invalid-feedback">{{ fieldErrors.password }}</div>
              <div v-else-if="isRegisterMode" id="password-help" class="form-text">Не короче 8 символов</div>
            </div>

            <div v-if="error && !hasFieldErrors" class="alert alert-danger" role="alert">{{ error }}</div>

            <button type="submit" class="btn btn-primary w-100" :disabled="auth.loading">
              {{ auth.loading ? 'Загрузка...' : (isRegisterMode ? 'Зарегистрироваться' : 'Войти') }}
            </button>
          </form>

          <div class="text-center mt-4">
            <span class="text-body-secondary">{{ isRegisterMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?' }}</span>
            <router-link :to="isRegisterMode ? '/login' : '/register'" class="ms-1 fw-bold text-decoration-none">
              {{ isRegisterMode ? 'Войти' : 'Зарегистрироваться' }}
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Auth',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();

    const form = ref({
      name: '',
      email: '',
      password: ''
    });

    const error = ref(null);
    const fieldErrors = ref({});

    const isRegisterMode = computed(() => route.path === '/register');
    const hasFieldErrors = computed(() => Object.keys(fieldErrors.value).length > 0);

    // Only same-site paths, so ?redirect= cannot send the user to another site
    const redirectTarget = () => {
      const target = route.query.redirect;
      return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
    };

    const handleSubmit = async () => {
      error.value = null;
      fieldErrors.value = {};

      try {
        if (isRegisterMode.value) {
          await auth.register(form.value);
        } else {
          await auth.login(form.value);
        }
        router.push(redirectTarget());
      } catch (err) {
        error.value = err.error || (isRegisterMode.value ? 'Не удалось зарегистрироваться' : 'Не удалось войти');
        fieldErrors.value = err.fields || {};
      }
    };

    // Switching between login and registration starts with a clean form state
    watch(isRegisterMode, () => {
      error.value = null;
      fieldErrors.value = {};
    });

    onMounted(() => {
      if (auth.isAuthenticated) {
        router.push('/dashboard');
      }
    });

    return { form, error, fieldErrors, hasFieldErrors, isRegisterMode, handleSubmit, auth };
  }
};
</script>
