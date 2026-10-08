# Пример развёртывания за реверс-прокси

Пример установки Edu ISR без Docker на два сервера Ubuntu: **реверс-прокси** с nginx принимает HTTPS из интернета, **сервер приложения** выполняет Node.js и MySQL. Серверы связаны внутренней сетью.

Все адреса и имена в примерах условные. Подставьте свои:

| В примере | Что это |
|-----------|---------|
| `edu.example.com` | Домен сайта |
| `192.0.2.1` | Внутренний адрес реверс-прокси |
| `192.0.2.10` | Внутренний адрес сервера приложения |
| `/opt/edu-isr` | Каталог приложения |
| `edu-isr` | Имя службы systemd |

## Схема

```
Интернет
   │ https://edu.example.com :443
   ▼
Реверс-прокси (192.0.2.1)
   nginx: TLS (Let's Encrypt), HTTP → HTTPS, заголовки безопасности
   │ http://192.0.2.10:3001 — только внутренняя сеть
   ▼
Сервер приложения (192.0.2.10)
   Node.js (служба systemd): API /api/* и собранный фронтенд
   MySQL: только 127.0.0.1
```

На сервере приложения нет отдельного веб-сервера: собранный фронтенд раздаёт сам бэкенд (переменная `STATIC_DIR`). Наружу открыт один порт, и только для реверс-прокси.

## Файлы

| Файл | Где используется |
|------|------------------|
| [`nginx/reverse-proxy.http-only.conf`](nginx/reverse-proxy.http-only.conf) | Реверс-прокси, шаг 1: выпуск сертификата |
| [`nginx/reverse-proxy.conf`](nginx/reverse-proxy.conf) | Реверс-прокси, итоговая конфигурация |
| [`backend.env.example`](backend.env.example) | Сервер приложения: переменные окружения бэкенда |
| [`systemd/edu-isr.service`](systemd/edu-isr.service) | Сервер приложения: служба бэкенда |
| [`scripts/build.sh`](scripts/build.sh) | Сервер приложения: установка зависимостей и сборка |

## Сервер приложения

### 1. Пакеты

```bash
sudo apt update
sudo apt install -y git nodejs npm mysql-server
sudo systemctl enable --now mysql
node -v    # нужен Node.js 20 или новее (в Ubuntu 26.04 из коробки 22)
```

Если в репозитории дистрибутива Node.js старше 20, установите актуальную LTS-версию с [nodejs.org](https://nodejs.org/en/download).

### 2. Код

Отдельного системного пользователя создавать не нужно. Служба запускается с `DynamicUser=yes`: при старте systemd выдаёт ей временного пользователя без прав. Код принадлежит вам (тому, кто разворачивает), а для приложения доступен только на чтение, так что оно не может изменить даже собственные файлы.

```bash
sudo mkdir -p /opt/edu-isr
sudo chown "$USER": /opt/edu-isr
git clone https://github.com/<owner>/edu-isr.git /opt/edu-isr
```

### 3. База данных

MySQL в Ubuntu по умолчанию слушает только `127.0.0.1`, так что извне база недоступна.

```bash
openssl rand -hex 24          # пароль пользователя БД
sudo mysql
```

```sql
CREATE DATABASE edu_isr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'edu_isr'@'localhost' IDENTIFIED BY '<пароль>';
GRANT ALL PRIVILEGES ON edu_isr.* TO 'edu_isr'@'localhost';
```

Таблицы создаёт сам бэкенд при первом запуске.

### 4. Переменные окружения

```bash
sudo mkdir -p /etc/edu-isr
sudo cp /opt/edu-isr/deploy/backend.env.example /etc/edu-isr/backend.env
sudo chmod 600 /etc/edu-isr/backend.env
openssl rand -hex 32          # JWT_SECRET
sudo nano /etc/edu-isr/backend.env
```

Заполните `HOST` (внутренний адрес сервера приложения), `DB_PASSWORD`, `JWT_SECRET` и `FRONTEND_URL`. С пустым или слабым `JWT_SECRET` бэкенд в production не запустится: зная секрет, любой может подделать токен администратора.

Файл доступен только root: systemd читает его сам, до запуска приложения.

### 5. Сборка

```bash
cd /opt/edu-isr
deploy/scripts/build.sh
```

Скрипт ставит зависимости, проверяет практические задания всех курсов (сборка остановится, если эталонное решение какого-то задания не проходит) и собирает фронтенд в `frontend/dist`.

### 6. Служба

```bash
sudo cp /opt/edu-isr/deploy/systemd/edu-isr.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now edu-isr
sudo systemctl status edu-isr
curl http://192.0.2.10:3001/api/health
```

### 7. Первый администратор

Скрипт запускается через `systemd-run` с теми же переменными окружения и той же изоляцией, что и служба:

```bash
sudo systemd-run --pty --wait --collect \
  -p DynamicUser=yes -p EnvironmentFile=/etc/edu-isr/backend.env \
  --working-directory=/opt/edu-isr/backend \
  /usr/bin/node scripts/create-admin.js admin@example.com "Администратор"
```

Скрипт сгенерирует пароль и выведет его один раз. Тот же скрипт повышает до администратора уже зарегистрированного пользователя.

Чтобы задать свой пароль, введите его без отображения на экране и передайте через окружение. В аргументах команды пароль был бы виден в истории и в списке процессов:

```bash
read -rsp 'Пароль администратора: ' ADMIN_PASSWORD && export ADMIN_PASSWORD
sudo --preserve-env=ADMIN_PASSWORD systemd-run --pty --wait --collect --setenv=ADMIN_PASSWORD \
  -p DynamicUser=yes -p EnvironmentFile=/etc/edu-isr/backend.env \
  --working-directory=/opt/edu-isr/backend \
  /usr/bin/node scripts/create-admin.js admin@example.com "Администратор"
unset ADMIN_PASSWORD
```

`--preserve-env` обязателен: без него `sudo` очистит переменную, и скрипт молча сгенерирует случайный пароль вместо вашего.

### 8. Загрузка курса

```bash
cd /opt/edu-isr
node scripts/build-course-seed.js course/testing-software /tmp/seed-testing-software.sql
sudo mysql edu_isr < /tmp/seed-testing-software.sql
```

Курс создаётся от имени первого администратора, поэтому сначала выполните шаг 7. Чтобы перезалить курс, удалите его в админке и повторите команды.

### 9. Файрвол

Порт приложения открыт только для реверс-прокси:

```bash
sudo ufw allow ssh
sudo ufw allow from 192.0.2.1 to any port 3001 proto tcp
sudo ufw enable
```

## Реверс-прокси

### 1. nginx и certbot

```bash
sudo apt update
sudo apt install -y nginx certbot
sudo systemctl enable --now nginx
sudo mkdir -p /var/www/letsencrypt
```

DNS-запись домена должна указывать на внешний адрес реверс-прокси.

### 2. Сертификат

Пока сертификата нет, nginx не запустится с HTTPS-конфигурацией. Поэтому сначала подключите конфигурацию только с HTTP:

```bash
sudo cp deploy/nginx/reverse-proxy.http-only.conf /etc/nginx/sites-available/edu-isr.conf
sudo ln -s /etc/nginx/sites-available/edu-isr.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot certonly --webroot -w /var/www/letsencrypt -d edu.example.com \
  --deploy-hook "systemctl reload nginx"
```

`--deploy-hook` перезагружает nginx после каждого автоматического продления сертификата. Продление certbot выполняет сам по таймеру systemd.

### 3. Итоговая конфигурация

```bash
sudo cp deploy/nginx/reverse-proxy.conf /etc/nginx/sites-available/edu-isr.conf
sudo nginx -t && sudo systemctl reload nginx
```

Откройте `https://edu.example.com`.

## Реальный IP посетителей

Ограничение частоты попыток входа считается по IP посетителя, поэтому цепочка доверия должна быть настроена точно:

- реверс-прокси передаёт адрес клиента в `X-Forwarded-For` (`$proxy_add_x_forwarded_for`);
- бэкенд доверяет ровно одному прокси (`TRUST_PROXY_HOPS=1`) и берёт последний адрес из заголовка. Его дописал ваш nginx, поэтому подставить чужой IP клиент не может;
- приложение слушает только внутренний адрес, а файрвол пускает к нему только реверс-прокси. Иначе можно обратиться к приложению напрямую в обход nginx.

Если между посетителем и приложением появится ещё один прокси, например CDN, увеличьте `TRUST_PROXY_HOPS`.

## Ограничения частоты запросов

Задаются в `/etc/edu-isr/backend.env`, после изменения нужен `sudo systemctl restart edu-isr`:

| Переменная | По умолчанию | Что ограничивает |
|------------|--------------|------------------|
| `RATE_LIMIT_REGISTER_PER_HOUR` | 50 | Регистрации с одного IP за час |
| `RATE_LIMIT_LOGIN_PER_15MIN` | 100 | Все попытки входа с одного IP за 15 минут |
| `RATE_LIMIT_LOGIN_FAILED_PER_15MIN` | 10 | Неудачные входы в один аккаунт с одного IP за 15 минут |

Значение `0` отключает ограничение. Учебный класс обычно выходит в интернет через один внешний адрес, поэтому лимиты по IP намеренно высокие. От подбора пароля защищает третий лимит: он считает только неудачные попытки и только для конкретного email, поэтому не мешает остальным студентам той же сети.

Счётчики хранятся в памяти и сбрасываются при перезапуске службы. Если класс всё же упёрся в лимит во время занятия, перезапуск снимет блокировку сразу.

## Обновление

```bash
cd /opt/edu-isr
git pull --ff-only
deploy/scripts/build.sh
sudo systemctl restart edu-isr
```

## Резервные копии

Ежедневный дамп базы, например в `/etc/cron.d/edu-isr-backup`:

```cron
30 3 * * * root mysqldump --single-transaction edu_isr | gzip > /var/backups/edu-isr-$(date +\%F).sql.gz && find /var/backups -name 'edu-isr-*.sql.gz' -mtime +14 -delete
```

Храните копии и на другом сервере: дамп на той же машине не спасёт при отказе диска.

## Диагностика

```bash
sudo journalctl -u edu-isr -f                   # логи бэкенда
sudo tail -f /var/log/nginx/error.log           # ошибки реверс-прокси
curl -I https://edu.example.com/api/health      # вся цепочка целиком
```
