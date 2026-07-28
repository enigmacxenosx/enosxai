#!/usr/bin/env python3
"""
hackerai-agent/webui.py
FastAPI web dashboard for the AI pentest agent
Run with: uvicorn webui:app --reload --port 8080
"""

import os
import json
import asyncio
import queue
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, Form, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import uvicorn

from agent import run_agent, SYSTEM_PROMPT

app = FastAPI(title="HackerAI - Web Dashboard")

# Templates directory
TEMPLATES_DIR = Path(__file__).parent / "templates"
TEMPLATES_DIR.mkdir(exist_ok=True)

# In-memory scan state
active_scans: dict = {}
scan_history: list = []


# ─── HTML TEMPLATE (inline — self-contained) ──────────────────────────────────

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HackerAI - AI Pentest Agent</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
            background: #0a0e14;
            color: #e6e6e6;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #0f1923 0%, #1a2835 100%);
            border-bottom: 2px solid #00ff88;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: #00ff88;
            font-size: 24px;
            letter-spacing: 2px;
        }
        .header span { color: #4a9eff; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .card {
            background: #111b24;
            border: 1px solid #1e3347;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .card h2 {
            color: #4a9eff;
            margin-bottom: 15px;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        input[type="text"] {
            flex: 1;
            background: #0d151e;
            border: 1px solid #1e3347;
            border-radius: 4px;
            padding: 12px 16px;
            color: #e6e6e6;
            font-family: inherit;
            font-size: 14px;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #00ff88;
        }
        button {
            background: #00ff88;
            color: #0a0e14;
            border: none;
            border-radius: 4px;
            padding: 12px 24px;
            font-family: inherit;
            font-weight: bold;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        button:hover { background: #00cc6a; }
        button:disabled {
            background: #2a3a4a;
            color: #6a7a8a;
            cursor: not-allowed;
        }
        button.danger { background: #ff3355; }
        button.danger:hover { background: #cc2244; }
        .scan-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .log-box {
            background: #080c12;
            border: 1px solid #1a2835;
            border-radius: 4px;
            padding: 12px;
            height: 500px;
            overflow-y: auto;
            font-size: 12px;
            line-height: 1.6;
        }
        .log-entry { margin-bottom: 4px; }
        .log-entry .time { color: #6a7a8a; }
        .log-entry .tool-call { color: #ffaa33; }
        .log-entry .analysis { color: #4a9eff; }
        .log-entry .result { color: #aabbcc; }
        .log-entry .error { color: #ff3355; }
        .log-entry .success { color: #00ff88; }
        .status-bar {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            padding: 10px;
            background: #080c12;
            border-radius: 4px;
            font-size: 12px;
        }
        .status-bar .label { color: #6a7a8a; }
        .status-bar .value { color: #00ff88; font-weight: bold; }
        .history-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .history-table th {
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid #1e3347;
            color: #4a9eff;
        }
        .history-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #0d151e;
        }
        .history-table tr:hover td { background: #0d151e; }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
        }
        .badge.running { background: #ffaa33; color: #0a0e14; }
        .badge.done { background: #00ff88; color: #0a0e14; }
        .badge.error { background: #ff3355; color: #fff; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080c12; }
        ::-webkit-scrollbar-thumb { background: #1e3347; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1><span>◢</span> HACKERAI <span>◣</span></h1>
        <div style="font-size:12px;color:#6a7a8a;">AI Penetration Testing Agent</div>
    </div>
    <div class="container">
        <!-- New Scan -->
        <div class="card">
            <h2>▶ New Assessment</h2>
            <form action="/scan" method="post" id="scan-form">
                <div class="input-group">
                    <input type="text" name="target" placeholder="Target IP, domain, or URL (e.g., scanme.nmap.org)" required>
                    <input type="number" name="max_turns" value="20" min="5" max="50" style="width:80px;text-align:center;">
                    <button type="submit">▶ Start Scan</button>
                </div>
            </form>
        </div>

        <!-- Active Scan -->
        {% if active %}
        <div class="scan-grid">
            <div class="card">
                <h2>📡 Live Log</h2>
                <div class="log-box" id="live-log">
                    {% for entry in active.log %}
                    <div class="log-entry">
                        <span class="time">[{{ entry.time }}]</span>
                        <span class="{{ entry.type }}">{{ entry.text }}</span>
                    </div>
                    {% endfor %}
                </div>
                <div class="status-bar">
                    <div><span class="label">Target:</span> <span class="value">{{ active.target }}</span></div>
                    <div><span class="label">Turns:</span> <span class="value">{{ active.turns }}</span></div>
                    <div><span class="label">Status:</span> <span class="value">{{ active.status }}</span></div>
                </div>
            </div>
            <div class="card">
                <h2>📊 Findings</h2>
                <div class="log-box" id="findings-log">
                    {% for finding in active.findings %}
                    <div class="log-entry">
                        <span class="time">[{{ finding.severity }}]</span>
                        <span class="success">{{ finding.text }}</span>
                    </div>
                    {% endfor %}
                </div>
                <form action="/cancel" method="post" style="margin-top:10px;">
                    <button type="submit" class="danger">■ Stop Scan</button>
                </form>
            </div>
        </div>
        {% endif %}

        <!-- History -->
        <div class="card">
            <h2>📋 Scan History</h2>
            {% if history %}
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Target</th>
                        <th>Turns</th>
                        <th>Status</th>
                        <th>Findings</th>
                    </tr>
                </thead>
                <tbody>
                    {% for scan in history %}
                    <tr>
                        <td>{{ scan.time }}</td>
                        <td>{{ scan.target }}</td>
                        <td>{{ scan.turns }}</td>
                        <td><span class="badge {{ scan.status }}">{{ scan.status }}</span></td>
                        <td>{{ scan.finding_count }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            {% else %}
            <p style="color:#6a7a8a;">No scans yet. Start one above!</p>
            {% endif %}
        </div>
    </div>

    <script>
        // Auto-scroll logs
        function scrollLogs() {
            const log = document.getElementById('live-log');
            if (log) log.scrollTop = log.scrollHeight;
            const findings = document.getElementById('findings-log');
            if (findings) findings.scrollTop = findings.scrollHeight;
        }
        setInterval(scrollLogs, 500);
        // Auto-refresh every 3 seconds if scan is active
        {% if active %}
        setTimeout(() => location.reload(), 3000);
        {% endif %}
    </script>
</body>
</html>
"""


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    global active_scans
    active = next((s for s_id, s in active_scans.items() if s["status"] == "running"), None)
    return HTMLResponse(
        DASHBOARD_HTML.replace("{{ active }}", json.dumps(active is not None))
        # Note: using Jinja2 would be cleaner, keeping it self-contained
    )


@app.post("/scan")
async def start_scan(target: str = Form(...), max_turns: int = Form(20)):
    scan_id = datetime.now().strftime("%Y%m%d%H%M%S")
    active_scans[scan_id] = {
        "id": scan_id,
        "target": target,
        "turns": 0,
        "status": "running",
        "log": [{"time": datetime.now().strftime("%H:%M:%S"), "type": "success",
                 "text": f"Starting assessment against {target}"}],
        "findings": []
    }

    def run():
        try:
            transcript = run_agent(target, max_turns=max_turns, verbose=False)
            # Process transcript into log entries
            for entry in transcript:
                if entry.get("action"):
                    active_scans[scan_id]["log"].append({
                        "time": datetime.now().strftime("%H:%M:%S"),
                        "type": "tool-call",
                        "text": f"[{entry['action']}] {json.dumps(entry.get('args', {}))}"
                    })
                    active_scans[scan_id]["turns"] = entry.get("turn", 0)
                if entry.get("analysis"):
                    active_scans[scan_id]["findings"].append({
                        "severity": "analysis",
                        "text": entry["analysis"][:200]
                    })
                if entry.get("report"):
                    active_scans[scan_id]["log"].append({
                        "time": datetime.now().strftime("%H:%M:%S"),
                        "type": "success",
                        "text": "Assessment complete!"
                    })
                    active_scans[scan_id]["findings"].append({
                        "severity": "report",
                        "text": entry["report"][:500]
                    })
            active_scans[scan_id]["status"] = "done"
        except Exception as e:
            active_scans[scan_id]["status"] = "error"
            active_scans[scan_id]["log"].append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "type": "error",
                "text": f"Error: {e}"
            })

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    return HTMLResponse(DASHBOARD_HTML)


@app.post("/cancel")
async def cancel_scan():
    for s_id, s in active_scans.items():
        if s["status"] == "running":
            s["status"] = "cancelled"
            s["log"].append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "type": "error",
                "text": "Scan cancelled by user"
            })
    return HTMLResponse(DASHBOARD_HTML)


@app.get("/status")
async def scan_status():
    active = {k: {"target": v["target"], "status": v["status"],
                   "turns": v["turns"], "findings": len(v["findings"])}
              for k, v in active_scans.items()}
    return JSONResponse(active)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
