#!/bin/sh
# Vercel "Ignored Build Step": exit 0 skips the build, exit 1 runs it.
# Only production builds run by default. Preview builds of other branches and pull requests are
# skipped to save build minutes; put [preview] in a commit message to get one for that push.
# Anything unexpected (unknown environment, empty branch) builds, so production never silently skips.
PRODUCTION_BRANCH="claude/friendly-newton-ogjcc2"

case "$VERCEL_GIT_COMMIT_MESSAGE" in
  *"[preview]"*) echo "build: [preview] requested"; exit 1 ;;
esac

if [ "$VERCEL_ENV" = "production" ]; then
  echo "build: production deployment"; exit 1
fi

if [ -z "$VERCEL_ENV" ]; then
  if [ -z "$VERCEL_GIT_COMMIT_REF" ] || [ "$VERCEL_GIT_COMMIT_REF" = "$PRODUCTION_BRANCH" ]; then
    echo "build: production branch or unknown ref"; exit 1
  fi
fi

echo "skip: $VERCEL_ENV deployment of ${VERCEL_GIT_COMMIT_REF:-?} (add [preview] to the commit message to build it)"
exit 0
