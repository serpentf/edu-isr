# Практика 3. Бизнес-правила: скидки в корзине

## Задание

Функция `cartTotal(prices, isVip)` считает итог корзины интернет-магазина. На вход — массив цен и признак VIP-клиента. Бизнес-правила:

1. VIP-клиент получает скидку **10%**.
2. Если сумма **после** скидки VIP **5000 ₽ или больше**, дополнительно вычитается **500 ₽**.

Напишите тесты, которые проверяют каждое правило и их **сочетание**. Обратите внимание:

- **граница 5000 ₽**: «5000 или больше» и «больше 5000» — разные правила;
- **порядок скидок**: у VIP-клиента с корзиной на 5000 ₽ после скидки 10% получается 4500 ₽, и вторая скидка уже не положена;
- **пустая корзина** — тоже корзина.

Каждый тест стройте по схеме [AAA](04-test-structure.md), пример есть в заготовке редактора.

**Деньги и дробные числа.** Компьютер хранит дробные числа в двоичном виде, и многие «круглые» десятичные дроби записываются в нём лишь приблизительно, так же как 1/3 в десятичной записи превращается в 0,3333… Обычно погрешность не видна, но при вычислениях она проявляется:

```js
0.1 + 0.2     // 0.30000000000000004, а не 0.3
1999 * 0.9    // 1799.1000000000001, а не 1799.1
```

Поэтому `expect(cartTotal([1999], true)).toBe(1799.1)` упадёт, хотя расчёт по смыслу верный. `toBe` сравнивает строго, до последнего знака. Для сумм после скидок используйте `toBeCloseTo`: он сравнивает с точностью до двух знаков после запятой, то есть до копейки, и такой тест пройдёт. Для целых сумм без умножения на дробь, например 1500, достаточно `toBe`.

```js @subject
function cartTotal(prices, isVip) {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
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
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  if (total >= 5000) {
    total = total - 500;
  }
  return total;
}
```

```js @mutant Сумма ровно 5000 ₽ не получает скидку 500 ₽
function cartTotal(prices, isVip) {
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
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
  let total = 0;
  for (const price of prices) {
    total = total + price;
  }
  if (total >= 5000) {
    total = total - 500;
  }
  if (isVip) {
    total = total * 0.9;
  }
  return total;
}
```

```js @mutant Пустая корзина стоит не 0 ₽
function cartTotal(prices, isVip) {
  let total = prices[0];
  for (let i = 1; i < prices.length; i++) {
    total = total + prices[i];
  }
  if (isVip) {
    total = total * 0.9;
  }
  if (total >= 5000) {
    total = total - 500;
  }
  return total;
}
```
