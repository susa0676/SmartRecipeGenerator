#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Install a stable Python version (3.11 is highly compatible)
echo "Installing Python 3.11.8 for compatibility..."
pyenv install 3.11.8

# 2. Set the newly installed version as local default for this project
pyenv local 3.11.8

# 3. Ensure the project environment is built with the correct version
/usr/bin/env python3.11 -m venv .venv

# 4. Define CARGO_HOME (the previous fix) and run pip install using the stable venv python
echo "Running pip install with CARGO_HOME fix..."
export CARGO_HOME=/opt/render/project/src/.cargo 
/opt/render/project/src/.venv/bin/python3.11 -m pip install -r requirements.txt
