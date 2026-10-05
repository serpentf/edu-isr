# Структура автотеста: AAA и Page Object

## Цель урока

Освоить схему Arrange–Act–Assert и паттерн Page Object, которые делают автотесты читаемыми и поддерживаемыми.

## Схема AAA

Большинство автотестов следуют схеме **AAA**:

| Шаг | Что происходит |
|-----|----------------|
| **Arrange** (подготовка) | Создаём объекты и данные, приводим систему в нужное состояние |
| **Act** (действие) | Выполняем одно проверяемое действие |
| **Assert** (проверка) | Сравниваем фактический результат с ожидаемым |

Пример на PyTest: VIP-клиент получает скидку 10%.

```python
def test_discount_for_vip():
    cart = Cart(user=User(vip=True))   # Arrange
    cart.add(Item(price=1000))
    total = cart.total()               # Act
    assert total == 900                # Assert: скидка 10%
```

### Почему это важно

- Тест **читается как спецификация**: «при таких условиях, после такого действия, ожидаем такой результат».
- **Одно действие на тест**: если тест упал, сразу понятно, какое поведение сломалось.
- Имя теста описывает проверяемое поведение (`test_discount_for_vip`), а не просто нумерацию (`test_1`).

Обратите внимание на сходство со структурой ручного тест-кейса: предусловия, шаги, ожидаемый результат. Хороший ручной тест-кейс почти напрямую переводится в автотест.

## Паттерн Page Object

В UI-тестах применяется паттерн **Page Object**: элементы и действия каждой страницы описываются в отдельном классе.

Без Page Object каждый тест содержит локаторы элементов:

```python
def test_login():
    driver.find_element(By.ID, "email").send_keys("user@test.ru")
    driver.find_element(By.ID, "password").send_keys("secret")
    driver.find_element(By.CSS_SELECTOR, "button.login").click()
    assert driver.find_element(By.ID, "profile").is_displayed()
```

С Page Object тест говорит на языке пользователя, а детали вёрстки спрятаны в классе страницы:

```python
class LoginPage:
    def __init__(self, driver):
        self.driver = driver

    def login(self, email, password):
        self.driver.find_element(By.ID, "email").send_keys(email)
        self.driver.find_element(By.ID, "password").send_keys(password)
        self.driver.find_element(By.CSS_SELECTOR, "button.login").click()
        return ProfilePage(self.driver)


def test_login():
    profile = LoginPage(driver).login("user@test.ru", "secret")
    assert profile.is_opened()
```

**Выгода:** если кнопку входа переименовали, правится **один класс**, а не десятки тестов, которые через неё входят в систему.

## Главное

- AAA: подготовка → действие → проверка.
- Один тест проверяет одно поведение, имя теста это поведение описывает.
- Page Object изолирует детали вёрстки, и при её изменении правится один класс.

## Вопросы для самопроверки

1. Разметьте шаги Arrange, Act и Assert в любом знакомом вам тесте.
2. Почему в одном тесте лучше выполнять одно проверяемое действие?
3. В интерфейсе поменяли поле «Email» на «Логин». Сколько файлов придётся править с Page Object и без него?
