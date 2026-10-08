# Практика 2. Заказы: авторизация, валидация, побочные эффекты

## Задание

Теперь проверьте создание заказа. Это сложнее, чем чтение каталога: у операции есть **авторизация**, **валидация** и **побочные эффекты**.

Составьте набор тестов, который покрывает:

- **авторизацию** — без токена заказ создать нельзя;
- **валидацию** — некорректное количество, товар, которого нет на складе (используйте граничные значения из модуля 5);
- **успешное создание** — правильный код статуса и сумма заказа;
- **побочный эффект** — созданный заказ находится по своему id.

Каждый тест начинает с исходного каталога, поэтому, чтобы проверить `GET /orders/:id`, создайте заказ в том же тесте. Заголовок авторизации удобно вынести в константу, как в заготовке.

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
const AUTH = { headers: { Authorization: 'Bearer secret-token' } };

test('без токена заказ не создаётся', () => {
  const res = api.post('/orders', { productId: 1, quantity: 1 });
  expect(res.status).toBe(401);
});
```

```js @solution
const AUTH = { headers: { Authorization: 'Bearer secret-token' } };

test('без токена заказ не создаётся', () => {
  const res = api.post('/orders', { productId: 1, quantity: 1 });
  expect(res.status).toBe(401);
});

test('количество 0 отклоняется', () => {
  const res = api.post('/orders', { productId: 1, quantity: 0 }, AUTH);
  expect(res.status).toBe(400);
});

test('товар, которого нет на складе, заказать нельзя', () => {
  const res = api.post('/orders', { productId: 2, quantity: 1 }, AUTH);
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('not enough stock');
});

test('успешный заказ: 201 и сумма = цена × количество', () => {
  const res = api.post('/orders', { productId: 1, quantity: 2 }, AUTH);
  expect(res.status).toBe(201);
  expect(res.body.total).toBe(5000);
  expect(res.body.status).toBe('created');
});

test('созданный заказ находится по id', () => {
  // Arrange
  const created = api.post('/orders', { productId: 3, quantity: 1 }, AUTH);

  // Act
  const res = api.get(`/orders/${created.body.id}`, AUTH);

  // Assert
  expect(res.status).toBe(200);
  expect(res.body).toEqual(created.body);
});
```

```json @config
{
  "kind": "api",
  "mutantMode": "override",
  "minTests": 5,
  "examples": [
    { "method": "POST", "path": "/orders", "body": { "productId": 1, "quantity": 2 } },
    { "method": "POST", "path": "/orders", "authorization": "Bearer secret-token", "body": { "productId": 1, "quantity": 2 } },
    { "method": "GET", "path": "/orders/1", "authorization": "Bearer secret-token" }
  ]
}
```

```js @mutant Заказ можно создать без токена
function isAuthorized(req) {
  return true;
}
```

```js @mutant Количество 0 принимается
function validateOrder(db, body) {
  if (!body || !Number.isInteger(body.productId)) return 'productId must be an integer';
  if (!Number.isInteger(body.quantity) || body.quantity < 0) return 'quantity must be a positive integer';
  const product = db.products.find((p) => p.id === body.productId);
  if (!product) return 'product not found';
  if (product.stock < body.quantity) return 'not enough stock';
  return null;
}
```

```js @mutant Можно заказать товар, которого нет на складе
function validateOrder(db, body) {
  if (!body || !Number.isInteger(body.productId)) return 'productId must be an integer';
  if (!Number.isInteger(body.quantity) || body.quantity < 1) return 'quantity must be a positive integer';
  const product = db.products.find((p) => p.id === body.productId);
  if (!product) return 'product not found';
  return null;
}
```

```js @mutant Успешное создание возвращает 200 вместо 201
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
  return { status: 200, body: order };
}
```

```js @mutant Сумма заказа не учитывает количество
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
    total: product.price,
    status: 'created'
  };
  db.orders.push(order);
  return { status: 201, body: order };
}
```

```js @mutant Созданный заказ не находится по id
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
  return { status: 201, body: order };
}
```
