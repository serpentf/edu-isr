#!/usr/bin/env bash
# Full update on the application host: pull, back up the database, build, restart,
# wait for the health check, then update the content of the courses whose files changed.
# Run as the owner of the checkout (not root); sudo is asked for when needed.
#
#   deploy/scripts/deploy.sh            # deploy new commits, confirm each course update
#   deploy/scripts/deploy.sh --yes      # apply course updates without asking
#   deploy/scripts/deploy.sh --force    # rebuild and update all courses even without new commits
set -Eeuo pipefail

SERVICE=edu-isr
ENV_FILE=/etc/edu-isr/backend.env
BACKUP_DIR="$HOME/backups"
BACKUPS_KEPT=14

yes=false
force=false
for arg in "$@"; do
  case "$arg" in
    --yes) yes=true ;;
    --force) force=true ;;
    *) echo "Неизвестный аргумент: $arg" >&2; exit 2 ;;
  esac
done

if [ "$EUID" -eq 0 ]; then
  echo "Запускайте от владельца каталога приложения, а не от root" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
root=$(pwd)

# Same isolation and environment as the service (deploy/README.md, step 7)
run_as_service() {
  sudo systemd-run --pipe --wait --collect --quiet \
    -p DynamicUser=yes -p EnvironmentFile="$ENV_FILE" \
    --working-directory="$root/backend" \
    /usr/bin/node "$@"
}

sudo -v

echo "==> Код"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "В $root есть незакоммиченные изменения, разберитесь с ними перед обновлением:" >&2
  git status --short --untracked-files=no >&2
  exit 1
fi
old=$(git rev-parse HEAD)
git pull --ff-only --quiet
new=$(git rev-parse HEAD)

if [ "$old" = "$new" ]; then
  if ! $force; then
    echo "Новых коммитов нет. Чтобы пересобрать всё равно, запустите с --force"
    exit 0
  fi
  echo "Новых коммитов нет, пересборка по --force"
else
  git log --oneline "$old..$new"
fi

# A failure after the pull leaves the new code on disk: tell how to go back
trap 'echo; echo "Обновление прервано. Вернуть прежнюю версию:" >&2
  echo "  cd $root && git reset --hard $old && deploy/scripts/build.sh && sudo systemctl restart $SERVICE" >&2
  echo "Резервная копия базы: ${backup:-не создана}" >&2' ERR

echo "==> Резервная копия базы"
# Before the restart: on start the backend adds new columns to the schema
mkdir -p "$BACKUP_DIR"
backup="$BACKUP_DIR/edu_isr-$(date +%F-%H%M%S).sql.gz"
sudo mysqldump --single-transaction edu_isr | gzip > "$backup"
echo "$backup"
ls -1t "$BACKUP_DIR"/edu_isr-*.sql.gz | tail -n +$((BACKUPS_KEPT + 1)) | xargs -r rm --

echo "==> Сборка"
deploy/scripts/build.sh

echo "==> Перезапуск"
sudo systemctl restart "$SERVICE"
host=$(sudo sed -n 's/^HOST=//p' "$ENV_FILE")
port=$(sudo sed -n 's/^PORT=//p' "$ENV_FILE")
health="http://${host:-127.0.0.1}:${port:-3001}/api/health"
for _ in $(seq 30); do
  curl -fsS -o /dev/null "$health" 2>/dev/null && break
  sleep 1
done
if ! curl -fsS -o /dev/null "$health" 2>/dev/null; then
  echo "Служба не ответила на $health за 30 секунд. Последние строки журнала:" >&2
  sudo journalctl -u "$SERVICE" -n 30 --no-pager >&2
  false
fi
echo "Служба работает: $health"

echo "==> Курсы"
if $force || [ "$old" = "$new" ]; then
  courses=$(ls -d course/*/ | xargs -n1 basename)
else
  courses=$(git diff --name-only "$old" "$new" -- course/ | cut -d/ -f2 | sort -u)
fi
if [ -z "$courses" ]; then
  echo "Файлы курсов не менялись"
fi
for course in $courses; do
  [ -d "course/$course" ] || continue
  echo "--- $course"
  # The plan exits with 1 when the update is impossible: stop and show why
  run_as_service scripts/update-course.js "../course/$course"
  if ! $yes; then
    read -rp "Применить изменения курса $course? [y/N] " answer
    case "$answer" in
      y|Y|д|Д) ;;
      *) echo "Пропущено. Применить позже: см. «Содержимое курса» в deploy/README.md"; continue ;;
    esac
  fi
  run_as_service scripts/update-course.js "../course/$course" --apply
done

trap - ERR
echo
echo "Готово: $(git log -1 --format='%h %s')"
