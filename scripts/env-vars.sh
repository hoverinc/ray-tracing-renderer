# Load env vars for .env
export $(grep -v '^#' .env | xargs -0) > /dev/null
