#!/usr/bin/env bash
# Full update on the application host: pull, back up the database, build, restart,
# wait for the health check, then update the content of the courses whose files changed.
# Run it as root or as the owner of the checkout: git and the build always run as the owner.
#
#   deploy/scripts/deploy.sh            # deploy what changed since the last deploy
#   deploy/scripts/deploy.sh --force    # rebuild and update all courses anyway
set -Eeuo pipefail

SERVICE=edu-isr
ENV_FILE=/etc/edu-isr/backend.env
BACKUP_DIR=/var/backups/edu-isr
BACKUPS_KEPT=14

force=false
for arg in "$@"; do
  case "$arg" in
    --force) force=true ;;
    *) echo "Неизвестный аргумент: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/../.."
root=$(pwd)
# Last deployed commit; inside .git so it is never committed
state="$root/.git/edu-isr-deployed"

# Files written by git, npm and the build must stay owned by whoever owns the checkout
owner=$(stat -c %U "$root")
as_owner() {
  if [ "$(id -un)" = "$owner" ]; then "$@"; else sudo -u "$owner" -H -- "$@"; fi
}
as_root() {
  if [ "$EUID" -eq 0 ]; then "$@"; else sudo "$@"; fi
}

# Same isolation and environment as the service (deploy/README.md, step 7)
run_as_service() {
  as_root systemd-run --pipe --wait --collect --quiet \
    -p DynamicUser=yes -p EnvironmentFile="$ENV_FILE" \
    --working-directory="$root/backend" \
    /usr/bin/node "$@"
}

[ "$EUID" -eq 0 ] || sudo -v

echo "==> Код"
if [ -n "$(as_owner git status --porcelain --untracked-files=no)" ]; then
  echo "В $root есть незакоммиченные изменения, разберитесь с ними перед обновлением:" >&2
  as_owner git status --short --untracked-files=no >&2
  exit 1
fi
as_owner git pull --ff-only --quiet
new=$(as_owner git rev-parse HEAD)
deployed=$(cat "$state" 2>/dev/null || true)

if [ "$deployed" = "$new" ] && ! $force; then
  echo "Уже выкачено: $(as_owner git log -1 --format='%h %s'). Пересобрать всё равно: $0 --force"
  exit 0
fi
if [ -n "$deployed" ] && as_owner git cat-file -e "$deployed" 2>/dev/null; then
  as_owner git log --oneline "$deployed..$new"
else
  deployed=""
  echo "Первое обновление этим скриптом: выкатываю всё"
fi

# A failure leaves the new code on disk: tell how to go back
trap 'echo; echo "Обновление прервано." >&2
  [ -n "$deployed" ] && echo "Вернуть прежнюю версию (от владельца каталога, $owner):" >&2 &&
    echo "  cd $root && git reset --hard $deployed && deploy/scripts/build.sh && sudo systemctl restart $SERVICE" >&2
  echo "Резервная копия базы: ${backup:-не создана}" >&2' ERR

echo "==> Резервная копия базы"
# Before the restart: on start the backend adds new columns to the schema
as_root mkdir -p "$BACKUP_DIR"
backup="$BACKUP_DIR/edu_isr-$(date +%F-%H%M%S).sql.gz"
as_root sh -c "umask 077 && mysqldump --single-transaction edu_isr | gzip > '$backup'"
echo "$backup"
as_root sh -c "ls -1t '$BACKUP_DIR'/edu_isr-*.sql.gz | tail -n +$((BACKUPS_KEPT + 1)) | xargs -r rm --"

echo "==> Сборка"
as_owner deploy/scripts/build.sh

echo "==> Перезапуск"
as_root systemctl restart "$SERVICE"
host=$(as_root sed -n 's/^HOST=//p' "$ENV_FILE")
port=$(as_root sed -n 's/^PORT=//p' "$ENV_FILE")
health="http://${host:-127.0.0.1}:${port:-3001}/api/health"
for _ in $(seq 30); do
  curl -fsS -o /dev/null "$health" 2>/dev/null && break
  sleep 1
done
if ! curl -fsS -o /dev/null "$health" 2>/dev/null; then
  echo "Служба не ответила на $health за 30 секунд. Последние строки журнала:" >&2
  as_root journalctl -u "$SERVICE" -n 30 --no-pager >&2
  false
fi
echo "Служба работает: $health"

echo "==> Курсы"
if $force || [ -z "$deployed" ]; then
  courses=$(ls -d course/*/ | xargs -n1 basename)
else
  courses=$(as_owner git diff --name-only "$deployed" "$new" -- course/ | cut -d/ -f2 | sort -u)
fi
[ -n "$courses" ] || echo "Файлы курсов не менялись"
for course in $courses; do
  [ -d "course/$course" ] || continue
  echo "--- $course"
  # Prints the plan, then applies it in one transaction; refuses if matching is ambiguous
  run_as_service scripts/update-course.js "../course/$course" --apply
done

as_owner sh -c "echo '$new' > '$state'"
trap - ERR
echo
echo "Готово: $(as_owner git log -1 --format='%h %s')"
