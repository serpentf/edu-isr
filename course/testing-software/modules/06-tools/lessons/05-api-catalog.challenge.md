---
id: les-041669c7
---

# Практика 1. Первые API-тесты: каталог товаров

## Задание

Это задание про чтение данных: проверьте каталог интернет-магазина.

1. **Исследуйте API вручную.** В консоли ниже нажмите на примеры запросов или отправьте свои. Посмотрите, что возвращается для существующего и несуществующего товара.
2. **Закрепите проверки автотестами.** Удобно начать с кнопки «Добавить как тест» и затем отредактировать сгенерированный тест.
3. Запустите тесты и посмотрите, какие баги они ловят. Подсказки к оставшимся появятся после запуска.

Помните, что проверять: статус, значения, **типы данных** и **негативный сценарий**. Тип значения проверяется через `typeof`:

```js
expect(typeof res.body.price).toBe('number');
```

## Документация демо-API

Интернет-магазин с каталогом товаров и заказами. Данные хранятся в памяти: в консоли они сохраняются между запросами, а каждый тест начинает с исходного каталога.

| Метод и путь | Авторизация | Ответ |
|--------------|-------------|-------|
| `GET /products` | Нет | `200` — массив товаров `{ id, name, price, stock }`, цена — число в рублях |
| `GET /products/:id` | Нет | `200` — товар; `404` — `{ error: 'Product not found' }` |
| `POST /orders` | Да | `201` — заказ `{ id, productId, quantity, total, status }`; `400` — ошибка валидации; `401` — нет токена |
| `GET /orders/:id` | Да | `200` — заказ; `404` — нет такого заказа; `401` — нет токена |

Авторизация: заголовок `Authorization: Bearer secret-token`.

Исходный каталог: Чайник (id 1, 2500 ₽, на складе 10), Кружка (id 2, 400 ₽, на складе 0), Френч-пресс (id 3, 1800 ₽, на складе 5).

Правила заказа: `quantity` — целое число от 1, товар должен существовать, и на складе должно хватать количества. Сумма заказа `total` = цена × количество, после заказа остаток на складе уменьшается.

```js @subject
// Демо-API интернет-магазина. Данные живут в памяти.
const TOKEN = 'secret-token';

function createServer() {
  const db = {
    products: [
      { id: 1, name: 'Чайник', price: 2500, stock: 10 },
      { id: 2, name: 'Кружка', price: 400, stock: 0 },
      { id: 3, name: 'Френч-пресс', price: 1800, stock: 5 }
    ],
    orders: [],
    nextOrderId: 1
  };
  return (req) => route(db, req);
}

function route(db, req) {
  const [, resource, id] = req.path.split('/');
  if (resource === 'products' && req.method === 'GET') {
    return id ? getProduct(db, Number(id)) : listProducts(db);
  }
  if (resource === 'orders' && req.method === 'POST' && !id) return createOrder(db, req);
  if (resource === 'orders' && req.method === 'GET' && id) return getOrder(db, req, Number(id));
  return { status: 404, body: { error: 'Not found' } };
}

function listProducts(db) {
  return { status: 200, body: db.products };
}

function getProduct(db, id) {
  const product = db.products.find((p) => p.id === id);
  if (!product) return { status: 404, body: { error: 'Product not found' } };
  return { status: 200, body: product };
}

function isAuthorized(req) {
  return req.headers.Authorization === `Bearer ${TOKEN}`;
}

function validateOrder(db, body) {
  if (!body || !Number.isInteger(body.productId)) return 'productId must be an integer';
  if (!Number.isInteger(body.quantity) || body.quantity < 1) return 'quantity must be a positive integer';
  const product = db.products.find((p) => p.id === body.productId);
  if (!product) return 'product not found';
  if (product.stock < body.quantity) return 'not enough stock';
  return null;
}

function createOrder(db, req) {
  if (!isAuthorized(req)) return { status: 401, body: { error: 'Unauthorized' } };
  const error = validateOrder(db, req.body);
  if (error) return { status: 400, body: { error } };
  const product = db.products.find((p) => p.id === req.body.productId);
  product.stock -= req.body.quantity;
  const order = {
    id: db.nextOrderId++,
    productId: product.id,
    quantity: req.body.quantity,
    total: product.price * req.body.quantity,
    status: 'created'
  };
  db.orders.push(order);
  return { status: 201, body: order };
}

function getOrder(db, req, id) {
  if (!isAuthorized(req)) return { status: 401, body: { error: 'Unauthorized' } };
  const order = db.orders.find((o) => o.id === id);
  if (!order) return { status: 404, body: { error: 'Order not found' } };
  return { status: 200, body: order };
}
```

```js @starter
test('список товаров возвращается со статусом 200', () => {
  const res = api.get('/products');
  expect(res.status).toBe(200);
});
```

```js @solution
test('список товаров возвращается со статусом 200', () => {
  const res = api.get('/products');
  expect(res.status).toBe(200);
});

test('в каталоге все 3 товара, включая отсутствующие на складе', () => {
  const res = api.get('/products');
  expect(res.body.length).toBe(3);
});

test('цены в каталоге — числа', () => {
  const res = api.get('/products');
  for (const product of res.body) {
    expect(typeof product.price).toBe('number');
  }
});

test('товар по id возвращает именно этот товар', () => {
  const res = api.get('/products/2');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ id: 2, name: 'Кружка', price: 400, stock: 0 });
});

test('несуществующий товар возвращает 404', () => {
  const res = api.get('/products/999');
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Product not found');
});
```

```json @config
{
  "kind": "api",
  "mutantMode": "override",
  "minTests": 3,
  "examples": [
    { "method": "GET", "path": "/products" },
    { "method": "GET", "path": "/products/1" },
    { "method": "GET", "path": "/products/999" }
  ]
}
```

```js @mutant Несуществующий товар возвращает 200 вместо 404
function getProduct(db, id) {
  const product = db.products.find((p) => p.id === id);
  return { status: 200, body: product || null };
}
```

```js @mutant По id возвращается не тот товар
function getProduct(db, id) {
  const product = db.products[id];
  if (!product) return { status: 404, body: { error: 'Product not found' } };
  return { status: 200, body: product };
}
```

```js @mutant В каталоге нет товаров, которых нет на складе
function listProducts(db) {
  return { status: 200, body: db.products.filter((p) => p.stock > 0) };
}
```

```js @mutant Цены в каталоге приходят строками
function listProducts(db) {
  return { status: 200, body: db.products.map((p) => ({ ...p, price: String(p.price) })) };
}
```
