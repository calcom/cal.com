#!/bin/bash
set -xeuf -o pipefail

# exit this file if we are not in Codespaces
if [ -z "${CODESPACES}" ]; then
  exit 0
fi

echo "echo \"🚀 Welcome to Cal.com! Try typing 'yarn dx' to get a quick dev envionment.\"" >> ~/.bashrc