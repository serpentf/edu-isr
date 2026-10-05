<template>
  <div class="row justify-content-center py-lg-5">
    <div class="col-md-8 col-lg-5 col-xl-4">
      <div class="card shadow-sm">
        <div class="card-body p-4 p-lg-5">
          <h1 class="h3 mb-4 text-center">{{ isRegisterMode ? 'Регистрация' : 'Вход' }}</h1>

          <form @submit.prevent="handleSubmit">
            <div v-if="isRegisterMode" class="mb-3">
              <label for="name" class="form-label">Имя</label>
              <input id="name" v-model="form.name" type="text" class="form-control" required placeholder="Введите ваше имя" />
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input id="email" v-model="form.email" type="email" class="form-control" required placeholder="your@email.com" />
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Пароль</label>
              <input id="password" v-model="form.password" type="password" class="form-control" required placeholder="Минимум 6 символов" minlength="6" />
            </div>

            <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

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
import { ref, computed, onMounted } from 'vue';
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

    const isRegisterMode = computed(() => route.path === '/register');

    const handleSubmit = async () => {
      error.value = null;

      try {
        if (isRegisterMode.value) {
          await auth.register(form.value);
        } else {
          await auth.login(form.value);
        }
        router.push('/dashboard');
      } catch (err) {
        error.value = err.error || (isRegisterMode.value ? 'Ошибка регистрации' : 'Ошибка входа');
      }
    };

    onMounted(() => {
      if (auth.isAuthenticated) {
        router.push('/dashboard');
      }
    });

    return { form, error, isRegisterMode, handleSubmit, auth };
  }
};
</script>
