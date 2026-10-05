<template>
  <div>
    <!-- Hero Section -->
    <section class="p-5 mb-5 text-center text-bg-primary rounded-3">
      <h1 class="display-5 fw-bold mb-3">Интерактивные курсы по инструментам разработки</h1>
      <p class="lead mb-4">Изучайте современные инструменты и технологии программирования на практике</p>
      <router-link to="/courses" class="btn btn-light btn-lg px-5">Смотреть курсы</router-link>
    </section>

    <!-- Features Section -->
    <section class="mb-5">
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
        <div class="col">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">📖</div>
              <h2 class="h5 card-title">Пошаговые уроки</h2>
              <p class="card-text text-body-secondary">Структурированные материалы от простого к сложному</p>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">💻</div>
              <h2 class="h5 card-title">Практические задания</h2>
              <p class="card-text text-body-secondary">Код-челленджи и интерактивные тесты</p>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">📊</div>
              <h2 class="h5 card-title">Отслеживание прогресса</h2>
              <p class="card-text text-body-secondary">Следите за своими достижениями</p>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="display-4 mb-3">🏆</div>
              <h2 class="h5 card-title">Сертификаты</h2>
              <p class="card-text text-body-secondary">Получайте сертификаты после прохождения</p>
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
