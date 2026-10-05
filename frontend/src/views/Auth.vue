<template>
  <div class="auth-page">
    <div class="auth-container">
      <h1>{{ isRegisterMode ? 'Регистрация' : 'Вход' }}</h1>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="isRegisterMode" class="form-group">
          <label for="name">Имя</label>
          <input id="name" v-model="form.name" type="text" required placeholder="Введите ваше имя" />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="form.email" type="email" required placeholder="your@email.com" />
        </div>

        <div class="form-group">
          <label for="password">Пароль</label>
          <input id="password" v-model="form.password" type="password" required placeholder="Минимум 6 символов" minlength="6" />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="btn-submit" :disabled="auth.loading">
          {{ auth.loading ? 'Загрузка...' : (isRegisterMode ? 'Зарегистрироваться' : 'Войти') }}
        </button>
      </form>

      <div class="auth-switch">
        {{ isRegisterMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?' }}
        <router-link :to="isRegisterMode ? '/login' : '/register'">
          {{ isRegisterMode ? 'Войти' : 'Зарегистрироваться' }}
        </router-link>
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

<style scoped>
.auth-page {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-container {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
}

.auth-container h1 {
  color: #16213e;
  text-align: center;
  margin-bottom: 2rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #4ecca3;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
}

.btn-submit {
  background: #4ecca3;
  color: white;
  padding: 1rem;
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

.auth-switch {
  text-align: center;
  margin-top: 1.5rem;
  color: #666;
}

.auth-switch a {
  color: #4ecca3;
  text-decoration: none;
  font-weight: 500;
}

.auth-switch a:hover {
  text-decoration: underline;
}
</style>
