#!/usr/bin/env python3
"""
hackerai-agent/main.py
CLI interface for the AI pentest agent
"""

import os
import sys
import shutil
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from agent import run_agent, print_report

load_dotenv()
console = Console()

BANNER = """
╔══════════════════════════════════════════════╗
║        HackerAI - AI Pentest Agent v1        ║
║    Ethical Hacking Assistant (CLI Edition)   ║
╚══════════════════════════════════════════════╝
"""


def check_deps():
    missing = []
    for tool in ["nmap", "nuclei", "subfinder"]:
        if not shutil.which(tool):
            missing.append(tool)
    if missing:
        console.print(f"[yellow]⚠ Missing tools: {', '.join(missing)}[/yellow]")
        console.print("[yellow]  Install: sudo apt install nmap[/yellow]")
        console.print("[yellow]  Nuclei: https://github.com/projectdiscovery/nuclei[/yellow]")
        console.print("[yellow]  Subfinder: https://github.com/projectdiscovery/subfinder[/yellow]")
        console.print("[yellow]  The agent will fall back to Python-based alternatives where possible.\n[/yellow]")


def main():
    if not os.getenv("OPENAI_API_KEY"):
        console.print("[red]✖ Error: OPENAI_API_KEY not set[/red]")
        console.print("  export OPENAI_API_KEY='sk-...'")
        console.print("  Or create a .env file with: OPENAI_API_KEY=sk-...")
        sys.exit(1)

    if len(sys.argv) < 2:
        console.print("[yellow]Usage:[/yellow] python main.py <target> [--max-turns N]")
        console.print("[yellow]  Target: IP, domain, or URL[/yellow]")
        sys.exit(1)

    target = sys.argv[1]
    max_turns = 20
    if "--max-turns" in sys.argv:
        idx = sys.argv.index("--max-turns")
        max_turns = int(sys.argv[idx + 1])

    console.print(BANNER, style="bold cyan")
    check_deps()
    console.print(Panel(
        f"[bold]Target:[/bold] {target}\n"
        f"[bold]Max Turns:[/bold] {max_turns}\n"
        f"[bold]Date:[/bold] {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}",
        title="Configuration"
    ))

    try:
        transcript = run_agent(target, max_turns=max_turns)
        print_report(transcript)
    except KeyboardInterrupt:
        console.print("\n[yellow]⏹ Agent stopped by user.[/yellow]")
        sys.exit(0)
    except Exception as e:
        console.print(f"\n[red]✖ Error: {e}[/red]")
        import traceback
        console.print(traceback.format_exc())


if __name__ == "__main__":
    main()
