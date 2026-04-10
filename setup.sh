#!/bin/bash

set -e  # stop on error

echo "🚀 Updating system..."
sudo apt update && sudo apt upgrade -y

echo "📦 Installing basic packages..."
sudo apt install -y software-properties-common curl git build-essential

# -------------------------
# 🐍 Install Python 3.14
# -------------------------
echo "🐍 Installing Python..."

# Add deadsnakes repo
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Try installing Python 3.14
if sudo apt install -y python3.14 python3.14-venv python3.14-dev; then
    PYTHON=python3.14
else
    echo "⚠️ Python 3.14 not available, falling back to python3"
    sudo apt install -y python3 python3-venv python3-dev
    PYTHON=python3
fi

# -------------------------
# 🟢 Install Node.js (LTS)
# -------------------------
echo "🟢 Installing Node.js..."

curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# -------------------------
# 📁 Create project folder
# -------------------------
echo "📁 Creating project directory..."

PROJECT_DIR="$HOME/app"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# -------------------------
# 🧪 Create Python venv
# -------------------------
echo "🧪 Creating virtual environment..."

$PYTHON -m venv env

# Activate once for setup
source env/bin/activate

pip install --upgrade pip

deactivate

# -------------------------
# ✅ Final checks
# -------------------------
echo "✅ Installation complete!"

echo "Python version:"
$PYTHON --version

echo "Node version:"
node -v

echo "NPM version:"
npm -v

echo "📌 To activate venv later:"
echo "cd $PROJECT_DIR && source env/bin/activate"