<template>
  <ul class="nav nav-tabs mb-4">
    <li class="nav-item">
      <router-link to="/admin/stats" class="nav-link" active-class="active">
        <i class="bi bi-graph-up me-1" aria-hidden="true"></i>Статистика
      </router-link>
    </li>
    <li class="nav-item">
      <router-link to="/admin/courses" class="nav-link" active-class="active">
        <i class="bi bi-collection me-1" aria-hidden="true"></i>Курсы
      </router-link>
    </li>
    <li class="nav-item">
      <router-link to="/admin/certificates" class="nav-link" active-class="active">
        <i class="bi bi-award me-1" aria-hidden="true"></i>Сертификаты
      </router-link>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'AdminTabs'
};
</script>
