---
id: les-19fbd544
---

# Практика 4. Исключения и граничные значения

## Задание

Функция `parseQuantity(input)` разбирает количество товара, которое пользователь ввёл в поле формы:

- возвращает **число** от 1 до 99;
- на дробное или нечисловое значение выбрасывает ошибку «Количество должно быть целым числом»;
- на значение вне диапазона — ошибку «Количество должно быть от 1 до 99».

Это самое сложное задание модуля: баги спрятаны **на границах** диапазона. Чтобы поймать их все, нужно проверить значения на каждой границе и рядом с ней с обеих сторон. Такая техника называется **анализом граничных значений**, подробно её разберём в модуле 5.

Ошибки проверяются так:

```js
expect(() => parseQuantity('abc')).toThrow('целым числом');
```

Обратите внимание на `() =>`: в `expect` передаётся **функция**, а не результат вызова. Иначе исключение вылетит до того, как `expect` успеет его перехватить.

```js @subject
function parseQuantity(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value < 1 || value > 99) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return value;
}
```

```js @starter
test('строка "5" превращается в число 5', () => {
  expect(parseQuantity('5')).toBe(5);
});

test('буквы вызывают ошибку', () => {
  expect(() => parseQuantity('abc')).toThrow('целым числом');
});

// Добавьте проверки граничных значений
```

```js @solution
test('строка "5" превращается в число 5', () => {
  expect(parseQuantity('5')).toBe(5);
});

test('буквы вызывают ошибку', () => {
  expect(() => parseQuantity('abc')).toThrow('целым числом');
});

test('дробное количество вызывает ошибку', () => {
  expect(() => parseQuantity('2.5')).toThrow('целым числом');
});

test('нижняя граница: 0 — ошибка, 1 — допустимо', () => {
  expect(() => parseQuantity('0')).toThrow('от 1 до 99');
  expect(parseQuantity('1')).toBe(1);
});

test('верхняя граница: 99 — допустимо, 100 — ошибка', () => {
  expect(parseQuantity('99')).toBe(99);
  expect(() => parseQuantity('100')).toThrow('от 1 до 99');
});
```

```json @config
{ "minTests": 5 }
```

```js @mutant Функция возвращает строку вместо числа
function parseQuantity(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value < 1 || value > 99) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return input;
}
```

```js @mutant Дробное количество проходит проверку
function parseQuantity(input) {
  const value = Number(input);
  if (Number.isNaN(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value < 1 || value > 99) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return value;
}
```

```js @mutant Количество 0 считается допустимым
function parseQuantity(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value < 0 || value > 99) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return value;
}
```

```js @mutant Количество 1 отклоняется
function parseQuantity(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value <= 1 || value > 99) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return value;
}
```

```js @mutant Количество 99 отклоняется
function parseQuantity(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value < 1 || value >= 99) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return value;
}
```

```js @mutant Количество 100 считается допустимым
function parseQuantity(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error('Количество должно быть целым числом');
  }
  if (value < 1 || value > 100) {
    throw new Error('Количество должно быть от 1 до 99');
  }
  return value;
}
```
