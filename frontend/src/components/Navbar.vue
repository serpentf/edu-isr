<template>
  <nav class="navbar navbar-expand-lg bg-dark sticky-top" data-bs-theme="dark">
    <div class="container">
      <router-link to="/" class="navbar-brand fw-bold">📚 Edu ISR</router-link>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
              aria-controls="navbarNav" aria-expanded="false" aria-label="Меню">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div ref="collapseEl" class="collapse navbar-collapse" id="navbarNav">
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

        <ul class="navbar-nav align-items-lg-center gap-2">
          <template v-if="auth.isAuthenticated">
            <li class="nav-item">
              <span class="navbar-text">{{ auth.user?.name }}</span>
            </li>
            <li class="nav-item">
              <button @click="auth.logout()" class="btn btn-outline-danger btn-sm">Выход</button>
            </li>
          </template>

          <template v-else>
            <li class="nav-item">
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
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Collapse } from 'bootstrap';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Navbar',
  setup() {
    const auth = useAuthStore();
    const route = useRoute();
    const collapseEl = ref(null);

    // Close the mobile menu after navigation
    watch(() => route.fullPath, () => {
      Collapse.getInstance(collapseEl.value)?.hide();
    });

    return { auth, collapseEl };
  }
};
</script>
