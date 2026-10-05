<template>
  <div>
    <!-- Hero Section -->
    <section class="bg-primary text-white text-center py-5 mb-5">
      <div class="container">
        <h1 class="display-4 fw-bold mb-3">Интерактивные курсы по инструментам разработки</h1>
        <p class="lead mb-4">Изучайте современные инструменты и технологии программирования на практике</p>
        <router-link to="/courses" class="btn btn-light btn-lg px-5">Смотреть курсы</router-link>
      </div>
    </section>

    <!-- Features Section -->
    <section class="mb-5">
      <div class="row g-4">
        <div class="col-md-6 col-lg-3">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">📖</div>
              <h5 class="card-title">Пошаговые уроки</h5>
              <p class="card-text text-muted">Структурированные материалы от простого к сложному</p>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">💻</div>
              <h5 class="card-title">Практические задания</h5>
              <p class="card-text text-muted">Код-челленджи и интерактивные тесты</p>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">📊</div>
              <h5 class="card-title">Отслеживание прогресса</h5>
              <p class="card-text text-muted">Следите за своими достижениями</p>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">🏆</div>
              <h5 class="card-title">Сертификаты</h5>
              <p class="card-text text-muted">Получайте сертификаты после прохождения</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'Home'
};
</script>
