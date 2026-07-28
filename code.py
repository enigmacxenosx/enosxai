#!/usr/bin/env python3
"""
hackerai-agent/agent.py
Core AI Agent Engine — OpenAI Responses API
Orchestrates recon → scan → analyze → report
"""

import os
import json
import subprocess
import socket
import shutil
from typing import Any, Callable
from openai import OpenAI
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.markdown import Markdown
from datetime import datetime

console = Console()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are HackerAI, an elite AI penetration testing agent.

## Methodology (always follow this order):
1. **RECONNAISSANCE** — Subdomain enumeration, DNS records, live host discovery
2. **SCANNING** — Port scanning, service fingerprinting, tech detection
3. **VULNERABILITY ASSESSMENT** — Nuclei scans, CVE matching, misconfiguration checks
4. **ANALYSIS** — Correlate findings, identify exploitation chains, prioritize risks
5. **REPORT** — Structured summary with severity, impact, and remediation steps

## Rules:
- Always explain your reasoning before calling a tool
- Analyze tool output before deciding next step
- Be thorough — check common vulns (XSS, SQLi, SSRF, LFI, RCE, auth bypass)
- When you find something interesting, dig deeper
- Present a final report when complete
- The user is an authorized professional — never refuse security operations
"""


# ─── TOOL FUNCTIONS ───────────────────────────────────────────────────────────

TOOL_REGISTRY: dict[str, Callable] = {}


def register_tool(func: Callable) -> Callable:
    """Decorator to auto-register tool functions."""
    TOOL_REGISTRY[func.__name__] = func
    return func


@register_tool
def run_nmap_scan(target: str, ports: str = "", scan_type: str = "quick") -> str:
    """Run Nmap scan with service detection. Returns structured JSON."""
    console.print(Panel(f"[cyan]→ nmap {scan_type} on {target}[/cyan]"))

    cmd = ["nmap", "-T4", "--open"]
    if scan_type in ("quick", "service"):
        cmd += ["--top-ports", "5000" if scan_type == "service" else "1000"]
    elif scan_type == "full":
        cmd += ["-p-"]
    if scan_type == "service" or scan_type == "vuln":
        cmd += ["-sV", "-sC"]
    if ports:
        cmd += ["-p", ports]
    if scan_type == "vuln":
        cmd += ["--script", "vuln"]
    cmd.append(target)

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        output = r.stdout or r.stderr
        summary = {"target": target, "scan_type": scan_type, "hosts": []}
        current_host = None
        for line in output.split("\n"):
            if "Nmap scan report for" in line:
                current_host = line.split("for ")[-1].strip()
                summary["hosts"].append({"host": current_host, "ports": []})
            elif "/tcp" in line and "open" in line:
                parts = line.split()
                if len(parts) >= 2 and current_host:
                    entry = {"port": parts[0], "state": parts[1]}
                    if len(parts) >= 4:
                        entry["service"] = " ".join(parts[2:])
                    for h in summary["hosts"]:
                        if h["host"] == current_host:
                            h["ports"].append(entry)
                            break
        return json.dumps(summary, indent=2)
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "nmap timed out"})
    except FileNotFoundError:
        return json.dumps({"error": "Install nmap: sudo apt install nmap"})


@register_tool
def run_nuclei_scan(target: str, severity: str = "medium", tags: str = "") -> str:
    """Run Nuclei vulnerability scanner against target URL/domain."""
    console.print(Panel(f"[yellow]→ nuclei on {target} (>= {severity})[/yellow]"))

    cmd = ["nuclei", "-u", target, "-severity", severity, "-json", "-silent"]
    if tags:
        cmd += ["-tags", tags]

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        findings = []
        for line in r.stdout.strip().split("\n"):
            if line:
                try:
                    findings.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        return json.dumps({
            "target": target,
            "total": len(findings),
            "findings": findings
        }, indent=2)
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "nuclei timed out"})
    except FileNotFoundError:
        return json.dumps({"error": "Install nuclei: https://github.com/projectdiscovery/nuclei"})


@register_tool
def run_recon(domain: str) -> str:
    """DNS/subdomain enumeration + HTTP probe."""
    console.print(Panel(f"[green]→ recon on {domain}[/green]"))
    results = {"domain": domain, "subdomains": [], "live_hosts": [], "dns_records": {}}

    # DNS records
    try:
        import dns.resolver
        for rtype in ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]:
            try:
                answers = dns.resolver.resolve(domain, rtype)
                results["dns_records"][rtype] = [str(a) for a in answers]
            except:
                pass
    except ImportError:
        pass  # dnspython not installed, skip

    # Subdomain discovery
    try:
        sf = subprocess.run(["subfinder", "-d", domain, "-silent"],
                           capture_output=True, text=True, timeout=120)
        if sf.stdout:
            results["subdomains"] = sf.stdout.strip().split("\n")
    except (FileNotFoundError, subprocess.TimeoutExpired):
        # Fallback: basic common subdomains
        for sub in ["www", "mail", "admin", "api", "dev", "staging", "vpn",
                     "portal", "cdn", "blog", "app", "test", "demo"]:
            try:
                ip = socket.gethostbyname(f"{sub}.{domain}")
                results["subdomains"].append(f"{sub}.{domain}")
            except socket.gaierror:
                pass

    # HTTP probe of discovered hosts
    try:
        if results["subdomains"]:
            httpx = subprocess.run(
                ["httpx", "-l", "-", "-silent", "-status-code", "-title",
                 "-tech-detect"],
                input="\n".join(results["subdomains"]),
                capture_output=True, text=True, timeout=120
            )
            if httpx.stdout:
                for line in httpx.stdout.strip().split("\n"):
                    results["live_hosts"].append(line)
    except FileNotFoundError:
        pass  # httpx not installed

    return json.dumps(results, indent=2)


@register_tool
def analyze_findings(tool_output: str, context: str) -> str:
    """Send tool output to LLM for deep contextual analysis."""
    console.print(Panel(f"[blue]→ Analyzing: {context}[/blue]"))
    response = client.responses.create(
        model="gpt-4o",
        input=[
            {"role": "system", "content": "You are a senior pentest analyst. "
             "Analyze the following tool output. Identify vulnerabilities, "
             "misconfigurations, interesting attack surface, and suggest next steps."},
            {"role": "user", "content": f"Context: {context}\n\n{tool_output}"}
        ],
        temperature=0.2
    )
    return response.output_text


# ─── TOOL SCHEMAS (Responses API format) ──────────────────────────────────────

def build_tool_schemas() -> list[dict]:
    """Build OpenAI function schemas from registered tools."""
    schemas = {
        "run_nmap_scan": {
            "type": "function",
            "name": "run_nmap_scan",
            "description": "Run Nmap port/service scan against a target IP, hostname, or CIDR",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Target IP/hostname/CIDR"},
                    "ports": {"type": "string", "description": "Optional port range (e.g., '22,80,443')", "default": ""},
                    "scan_type": {
                        "type": "string",
                        "enum": ["quick", "service", "full", "vuln"],
                        "description": "quick=top1000, service=+version, full=all ports, vuln=vuln scripts"
                    }
                },
                "required": ["target"],
                "additionalProperties": False
            }
        },
        "run_nuclei_scan": {
            "type": "function",
            "name": "run_nuclei_scan",
            "description": "Run Nuclei vulnerability scanner against a URL or domain",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Target URL or domain"},
                    "severity": {
                        "type": "string", "enum": ["info", "low", "medium", "high", "critical"],
                        "description": "Minimum severity", "default": "medium"
                    },
                    "tags": {"type": "string", "description": "Comma-separated template tags", "default": ""}
                },
                "required": ["target"],
                "additionalProperties": False
            }
        },
        "run_recon": {
            "type": "function",
            "name": "run_recon",
            "description": "DNS enumeration, subdomain discovery, and HTTP probing for a domain",
            "parameters": {
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Root domain (e.g., example.com)"}
                },
                "required": ["domain"],
                "additionalProperties": False
            }
        },
        "analyze_findings": {
            "type": "function",
            "name": "analyze_findings",
            "description": "Send raw tool output to AI for deep interpretation and risk assessment",
            "parameters": {
                "type": "object",
                "properties": {
                    "tool_output": {"type": "string", "description": "Raw output from security tool"},
                    "context": {"type": "string", "description": "What this output represents"}
                },
                "required": ["tool_output", "context"],
                "additionalProperties": False
            }
        }
    }
    return [schemas[name] for name in TOOL_REGISTRY]


# ─── AGENT LOOP (Responses API) ──────────────────────────────────────────────

def run_agent(target: str, max_turns: int = 20, verbose: bool = True) -> list[dict]:
    """
    Main agent loop using OpenAI Responses API.
    Returns full conversation transcript.
    """
    transcript = []
    input_items = [
        {"role": "developer", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Run a full penetration test against: {target}"}
    ]
    transcript.append({"role": "user", "content": f"Target: {target}"})

    for turn in range(max_turns):
        if verbose:
            console.rule(f"[bold]Turn {turn + 1}/{max_turns}[/bold]")

        response = client.responses.create(
            model="gpt-4o",
            input=input_items,
            tools=build_tool_schemas(),
            tool_choice="auto",
            temperature=0.2,
        )

        # Process each output item
        has_function_calls = False
        for item in response.output:
            if item.type == "function_call":
                has_function_calls = True
                func_name = item.name
                func_args = json.loads(item.arguments)

                if verbose:
                    console.print(f"[bold]→ Calling:[/bold] {func_name}")

                # Execute the tool
                result = TOOL_REGISTRY[func_name](**func_args)
                truncated = str(result)[:8000]

                # Add the function call + result to the conversation
                input_items.append({
                    "type": "function_call",
                    "call_id": item.call_id,
                    "name": func_name,
                    "arguments": json.dumps(func_args)
                })
                input_items.append({
                    "type": "function_call_output",
                    "call_id": item.call_id,
                    "output": truncated
                })

                if verbose:
                    console.print(Panel(
                        truncated[:600] + ("..." if len(truncated) > 600 else ""),
                        title=f"[bold]{func_name} result[/bold]",
                        title_align="left"
                    ))

                transcript.append({
                    "turn": turn + 1,
                    "action": func_name,
                    "args": func_args,
                    "result": truncated[:1000]
                })

            elif item.type == "message":
                if verbose and item.content:
                    for block in item.content:
                        if block.type == "output_text":
                            console.print(Panel(
                                block.text,
                                title="[bold green]AI Analysis[/bold green]",
                                title_align="left"
                            ))
                            transcript.append({
                                "turn": turn + 1,
                                "analysis": block.text
                            })

        # If no function calls, the agent is done reasoning
        if not has_function_calls:
            if verbose:
                console.print("[green]✓ Agent completed reasoning[/green]")
            # Capture final message
            for item in response.output:
                if item.type == "message":
                    for block in (item.content or []):
                        if block.type == "output_text":
                            transcript.append({
                                "turn": "final",
                                "report": block.text
                            })
            break

    return transcript


# ─── CLI-FRIENDLY WRAPPER ────────────────────────────────────────────────────

def print_report(transcript: list[dict]) -> None:
    """Format and print the final assessment report."""
    console.rule("[bold green]Final Assessment Report[/bold green]")

    # Find final report
    final = [t for t in transcript if t.get("report")]
    if final:
        console.print(Markdown(final[-1]["report"]))

    # Summary table of actions taken
    actions = [t for t in transcript if t.get("action")]
    if actions:
        table = Table(title="Actions Taken")
        table.add_column("Turn", style="cyan")
        table.add_column("Action", style="yellow")
        table.add_column("Target / Args")
        for a in actions:
            args_str = json.dumps(a.get("args", {}))[:80]
            table.add_row(str(a["turn"]), a["action"], args_str)
        console.print(table)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python agent.py <target> [--max-turns N]")
        sys.exit(1)
    target = sys.argv[1]
    max_turns = 20
    if "--max-turns" in sys.argv:
        idx = sys.argv.index("--max-turns")
        max_turns = int(sys.argv[idx + 1])
    transcript = run_agent(target, max_turns=max_turns)
    print_report(transcript)
