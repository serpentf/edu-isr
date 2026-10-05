<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
    <div class="container">
      <router-link to="/" class="navbar-brand fw-bold">📚 Edu ISR</router-link>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <router-link to="/courses" class="nav-link">Курсы</router-link>
          </li>

          <template v-if="auth.isAuthenticated">
            <li class="nav-item">
              <router-link to="/dashboard" class="nav-link">Мой прогресс</router-link>
            </li>

            <template v-if="auth.isAdmin">
              <li class="nav-item">
                <router-link to="/admin/courses" class="nav-link text-warning">Админ-панель</router-link>
              </li>
            </template>
          </template>
        </ul>

        <ul class="navbar-nav">
          <template v-if="auth.isAuthenticated">
            <li class="nav-item">
              <span class="nav-link text-light">{{ auth.user?.name }}</span>
            </li>
            <li class="nav-item">
              <button @click="auth.logout()" class="btn btn-outline-danger btn-sm">Выход</button>
            </li>
          </template>

          <template v-else>
            <li class="nav-item me-2">
              <router-link to="/login" class="btn btn-outline-light btn-sm">Войти</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/register" class="btn btn-success btn-sm">Регистрация</router-link>
            </li>
          </template>
        </ul>
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
