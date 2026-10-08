#!/usr/bin/env bash
# Installs dependencies and builds the frontend on the application host.
# Run as the owner of the checkout (not root): deploy/scripts/build.sh
# Then restart the service (sudo systemctl restart edu-isr) and, if lessons changed,
# update the course content with backend/scripts/update-course.js (deploy/README.md).
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "==> Backend dependencies"
(cd backend && npm ci --omit=dev)

echo "==> Frontend dependencies"
(cd frontend && npm ci)

echo "==> Courses: verify challenges and copy course images into frontend/public"
for dir in course/*/; do
  node scripts/build-course-seed.js "$dir" "/tmp/seed-$(basename "$dir").sql"
done

echo "==> Frontend build"
(cd frontend && npm run build)

echo "Done. Restart the service: sudo systemctl restart edu-isr"
