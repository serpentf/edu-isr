<template>
  <div class="home">
    <section class="hero">
      <h1>Интерактивные курсы по инструментам разработки</h1>
      <p>Изучайте современные инструменты и технологии программирования на практике</p>
      <router-link to="/courses" class="btn-primary">Смотреть курсы</router-link>
    </section>

    <section class="features">
      <div class="feature-card">
        <div class="feature-icon">📖</div>
        <h3>Пошаговые уроки</h3>
        <p>Структурированные материалы от простого к сложному</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💻</div>
        <h3>Практические задания</h3>
        <p>Код-челленджи и интерактивные тесты</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Отслеживание прогресса</h3>
        <p>Следите за своими достижениями</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🏆</div>
        <h3>Сертификаты</h3>
        <p>Получайте сертификаты после прохождения</p>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'Home'
};
</script>

<style scoped>
.hero {
  text-align: center;
  padding: 4rem 2rem;
}

.hero h1 {
  font-size: 2.5rem;
  color: #16213e;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
}

.btn-primary {
  display: inline-block;
  background: #4ecca3;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 1.1rem;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #3db892;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #16213e;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #666;
}
</style>
