cd "$(dirname "$0")/.." > /dev/null

set -e

# load env variables
source scripts/env-vars.sh

if [ -z "$GITHUB_TOKEN" ]; then
  echo 'GITHUB_TOKEN is not set. Canceling release process.'
else
  echo 'GITHUB_TOKEN is set, proceed with release.'

  # run "release-it" in interactive mode (CLI)
  node_modules/release-it/bin/release-it.js -VV
fi
