<template>
  <nav class="navbar">
    <div class="nav-container">
      <router-link to="/" class="nav-logo">📚 Edu ISR</router-link>

      <div class="nav-links">
        <router-link to="/courses">Курсы</router-link>

        <template v-if="auth.isAuthenticated">
          <router-link to="/dashboard">Мой прогресс</router-link>

          <template v-if="auth.isAdmin">
            <router-link to="/admin/courses" class="admin-link">Админ-панель</router-link>
          </template>

          <span class="user-name">{{ auth.user?.name }}</span>
          <button @click="auth.logout()" class="btn-logout">Выход</button>
        </template>

        <template v-else>
          <router-link to="/login" class="btn-login">Войти</router-link>
          <router-link to="/register" class="btn-register">Регистрация</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script>
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Navbar',
  setup() {
    const auth = useAuthStore();
    return { auth };
  }
};
</script>

<style scoped>
.navbar {
  background: #1a1a2e;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav-links a {
  color: #a0a0c0;
  text-decoration: none;
  transition: color 0.3s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: white;
}

.admin-link {
  color: #ff6b6b !important;
}

.user-name {
  color: #a0a0c0;
  font-size: 0.9rem;
}

.btn-logout,
.btn-login,
.btn-register {
  padding: 0.5rem 1rem;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-logout {
  background: transparent;
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
}

.btn-logout:hover {
  background: #ff6b6b;
  color: white;
}

.btn-login {
  background: transparent;
  color: white;
  border: 1px solid #4ecca3;
}

.btn-login:hover {
  background: #4ecca3;
}

.btn-register {
  background: #4ecca3;
  color: white;
}

.btn-register:hover {
  background: #3db892;
}
</style>
