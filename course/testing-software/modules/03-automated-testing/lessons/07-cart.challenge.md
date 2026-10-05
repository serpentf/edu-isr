# Практика 3. Бизнес-правила: скидки в корзине

## Задание

Функция `cartTotal(prices, isVip)` считает итог корзины интернет-магазина. На вход — массив цен и признак VIP-клиента. Бизнес-правила:

1. VIP-клиент получает скидку **10%**.
2. Если сумма **после** скидки VIP **5000 ₽ или больше**, дополнительно вычитается **500 ₽**.

Напишите тесты, которые проверяют каждое правило и их **сочетание**. Обратите внимание:

- **граница 5000 ₽**: «5000 или больше» и «больше 5000» — разные правила;
- **порядок скидок**: у VIP-клиента с корзиной на 5000 ₽ после скидки 10% получается 4500 ₽, и вторая скидка уже не положена;
- **пустая корзина** — тоже корзина.

Каждый тест строите по схеме AAA. Для денег с копейками удобен `toBeCloseTo`: дробная арифметика в JavaScript неточна (`0.1 + 0.2 !== 0.3`).

```js @subject
function cartTotal(prices, isVip) {
  let total = prices.reduce((sum, price) => sum + price, 0);
  if (isVip) {
    total = total * 0.9;
  }
  if (total >= 5000) {
    total = total - 500;
  }
  return total;
}
```

```js @starter
test('обычный клиент, сумма меньше 5000 — без скидок', () => {
  // Arrange
  const prices = [1000, 500];

  // Act
  const total = cartTotal(prices, false);

  // Assert
  expect(total).toBe(1500);
});
```

```js @solution
test('обычный клиент, сумма меньше 5000 — без скидок', () => {
  const total = cartTotal([1000, 500], false);
  expect(total).toBe(1500);
});

test('VIP-клиент, сумма меньше 5000 — только скидка 10%', () => {
  const total = cartTotal([1000], true);
  expect(total).toBeCloseTo(900);
});

test('обычный клиент, ровно 5000 — минус 500 ₽', () => {
  const total = cartTotal([3000, 2000], false);
  expect(total).toBe(4500);
});

test('VIP-клиент, 5000 до скидки — после 10% порог не достигнут', () => {
  const total = cartTotal([5000], true);
  expect(total).toBeCloseTo(4500);
});

test('пустая корзина стоит 0', () => {
  expect(cartTotal([], false)).toBe(0);
});
```

```json @config
{ "minTests": 4 }
```

```js @mutant VIP-скидка 10% не применяется
function cartTotal(prices, isVip) {
  let total = prices.reduce((sum, price) => sum + price, 0);
  if (total >= 5000) {
    total = total - 500;
  }
  return total;
}
```

```js @mutant Сумма ровно 5000 ₽ не получает скидку 500 ₽
function cartTotal(prices, isVip) {
  let total = prices.reduce((sum, price) => sum + price, 0);
  if (isVip) {
    total = total * 0.9;
  }
  if (total > 5000) {
    total = total - 500;
  }
  return total;
}
```

```js @mutant Скидки применяются в неправильном порядке
function cartTotal(prices, isVip) {
  let total = prices.reduce((sum, price) => sum + price, 0);
  if (total >= 5000) {
    total = total - 500;
  }
  if (isVip) {
    total = total * 0.9;
  }
  return total;
}
```

```js @mutant Пустая корзина ломает расчёт
function cartTotal(prices, isVip) {
  let total = prices.reduce((sum, price) => sum + price);
  if (isVip) {
    total = total * 0.9;
  }
  if (total >= 5000) {
    total = total - 500;
  }
  return total;
}
```
