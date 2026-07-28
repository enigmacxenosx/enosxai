#!/bin/bash
# hackerai-agent/setup.sh — One-command setup

set -e

echo "▸ Setting up HackerAI Agent..."

# Check Python
python3 --version || { echo "Need Python 3.10+"; exit 1; }

# Create venv
python3 -m venv venv
source venv/bin/activate

# Install deps
pip install -r requirements.txt

# Check system tools
echo "▸ Checking system tools..."
command -v nmap >/dev/null 2>&1 || echo "  ⚠ Install: sudo apt install nmap"
command -v nuclei >/dev/null 2>&1 || echo "  ⚠ Install: https://github.com/projectdiscovery/nuclei"
command -v subfinder >/dev/null 2>&1 || echo "  ⚠ Install: https://github.com/projectdiscovery/subfinder"
command -v httpx >/dev/null 2>&1 || echo "  ⚠ Install: https://github.com/projectdiscovery/httpx"

echo ""
echo "✓ Setup complete!"
echo ""
echo "Usage:"
echo "  source venv/bin/activate"
echo "  python main.py <target>                 # CLI mode"
echo "  python webui.py                          # Web UI at http://localhost:8080"
echo ""
