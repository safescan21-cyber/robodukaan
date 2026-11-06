#!/usr/bin/env bash
# Installs the small local AI model behind the website chat, once:
# Ollama (https://ollama.com) + Qwen 2.5 1.5B. Runs from auto-update.sh as root.
# It is limited to 1.5 CPU cores and 3 GB RAM so other sites on this server stay fast.
# To turn the AI off:  touch /etc/robodukaan/chat-disabled  (the chat then answers with plain product search)
set -euo pipefail
MODEL="${CHAT_MODEL:-qwen2.5:1.5b}"
MARK=/etc/robodukaan/chat-ready
LOG=/var/log/robodukaan-update.log
log() { echo "$(date '+%F %T') [chat] $*" >> "$LOG"; }

mkdir -p /etc/robodukaan
[ -f /etc/robodukaan/chat-disabled ] && exit 0
if [ -f "$MARK" ] && [ "$(cat "$MARK")" = "$MODEL" ] && systemctl is-active --quiet ollama; then exit 0; fi

mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$mem_mb" -lt 3500 ]; then log "Skipping AI chat: only ${mem_mb} MB RAM"; exit 0; fi
free_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if [ "${free_gb:-0}" -lt 6 ]; then log "Skipping AI chat: only ${free_gb} GB disk free"; exit 0; fi

if ! command -v ollama >/dev/null; then
  log "Installing Ollama"
  curl -fsSL https://ollama.com/install.sh | sh >> "$LOG" 2>&1
fi

mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/pcbdukaan.conf <<UNIT
[Service]
Environment=OLLAMA_HOST=127.0.0.1:11434
Environment=OLLAMA_NUM_PARALLEL=1
Environment=OLLAMA_MAX_LOADED_MODELS=1
Environment=OLLAMA_KEEP_ALIVE=30m
CPUQuota=150%
MemoryMax=3G
Nice=10
UNIT
systemctl daemon-reload
systemctl enable ollama >/dev/null 2>&1 || true
systemctl restart ollama
for _ in $(seq 1 30); do curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1 && break; sleep 1; done

log "Downloading AI model $MODEL (about 1 GB)"
ollama pull "$MODEL" > /dev/null 2>> "$LOG"
# Warm it up so the first visitor doesn't wait for loading.
curl -fsS http://127.0.0.1:11434/api/generate -d "{\"model\":\"$MODEL\",\"prompt\":\"hi\",\"stream\":false,\"options\":{\"num_predict\":1}}" > /dev/null 2>&1 || true
echo "$MODEL" > "$MARK"
log "AI chat ready ($MODEL)"
