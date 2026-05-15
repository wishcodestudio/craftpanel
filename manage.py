#!/usr/bin/env python3
"""
CraftPanel Management CLI
Run: python manage.py
"""
import sys
import os
import subprocess
from pathlib import Path

# ── Auto-install required packages ────────────────────────────────────────────
_DEPS = ['rich', 'questionary', 'psycopg2-binary', 'python-dotenv', 'bcrypt']
_IMPORT_MAP = {'psycopg2-binary': 'psycopg2', 'python-dotenv': 'dotenv'}

def _bootstrap():
    import importlib.util
    missing = [d for d in _DEPS if importlib.util.find_spec(_IMPORT_MAP.get(d, d)) is None]
    if missing:
        print(f"Installing: {', '.join(missing)} ...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet'] + missing)
        print("Done. Restarting...\n")
        os.execv(sys.executable, [sys.executable] + sys.argv)

_bootstrap()

# ── Imports ────────────────────────────────────────────────────────────────────
import re
import secrets

import bcrypt as py_bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv, set_key, dotenv_values

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table
import questionary

ROOT        = Path(__file__).parent
ENV_PATH    = ROOT / '.env'
ENV_EXAMPLE = ROOT / '.env.example'
SCHEMA_PATH = ROOT / 'backend' / 'schema.sql'

console = Console()

# ── DB / .env helpers ─────────────────────────────────────────────────────────

def _db():
    load_dotenv(ENV_PATH, override=True)
    url = os.getenv('DATABASE_URL')
    if not url:
        console.print("[red]DATABASE_URL not set — run 'Configure .env' first.[/red]")
        return None
    try:
        return psycopg2.connect(url, cursor_factory=RealDictCursor)
    except Exception as e:
        console.print(f"[red]DB connection failed: {e}[/red]")
        console.print("[dim]Is Docker running? Try: docker compose up -d postgres[/dim]")
        return None

def _write_env(key: str, value: str):
    if not ENV_PATH.exists():
        if ENV_EXAMPLE.exists():
            import shutil; shutil.copy(ENV_EXAMPLE, ENV_PATH)
        else:
            ENV_PATH.touch()
    set_key(str(ENV_PATH), key, value)

def _header():
    console.print()
    console.print(Panel.fit(
        "[bold #7c6af7]⬡  CraftPanel[/bold #7c6af7]  [dim]Management CLI[/dim]",
        border_style="#7c6af7",
    ))
    console.print()

# ── 1. Install dependencies ───────────────────────────────────────────────────

def screen_install():
    console.print(Panel("[bold]Install Dependencies[/bold]", border_style="blue"))

    steps = [
        ("npm run install:all",            "Install npm packages (root + backend + frontend)"),
        ("docker compose up -d postgres",  "Start PostgreSQL container"),
    ]
    for cmd, label in steps:
        if Confirm.ask(f"  Run [cyan]{cmd}[/cyan]?", default=True):
            console.print(f"  [dim]{label}...[/dim]")
            r = subprocess.run(cmd, shell=True, cwd=ROOT)
            if r.returncode == 0:
                console.print("  [green]✓[/green] Done")
            else:
                console.print(f"  [red]✗[/red] Failed (exit {r.returncode})")
    console.print()

# ── 2. Configure .env ─────────────────────────────────────────────────────────

def screen_env():
    console.print(Panel("[bold]Configure .env[/bold]", border_style="blue"))

    if not ENV_PATH.exists() and ENV_EXAMPLE.exists():
        import shutil; shutil.copy(ENV_EXAMPLE, ENV_PATH)
        console.print("  [dim].env created from .env.example[/dim]\n")

    env = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}

    # (key, label, default_value, is_secret)
    FIELDS = [
        ("DATABASE_URL",      "PostgreSQL URL",
         env.get("DATABASE_URL", "postgresql://craftpanel:craftpanel_secret@localhost:5432/craftpanel"), False),
        ("JWT_SECRET",        "JWT Secret  (blank = auto-generate)",
         env.get("JWT_SECRET", ""),  True),
        ("PORT",              "Backend port",
         env.get("PORT", "3001"),    False),
        ("FRONTEND_URL",      "Frontend URL",
         env.get("FRONTEND_URL", "http://localhost:5173"), False),
        ("ANTHROPIC_API_KEY", "Anthropic API Key  (sk-ant-…)",
         env.get("ANTHROPIC_API_KEY", ""), True),
        ("GEMINI_API_KEY",    "Gemini API Key  (optional)",
         env.get("GEMINI_API_KEY", ""),    True),
        ("OPENAI_API_KEY",    "OpenAI API Key  (optional)",
         env.get("OPENAI_API_KEY", ""),    True),
        ("AI_PROVIDER",       "Force AI provider  (anthropic / gemini / openai — blank = auto)",
         env.get("AI_PROVIDER", ""), False),
    ]

    for key, label, current, is_secret in FIELDS:
        console.print(f"\n  [cyan]{label}[/cyan]")

        if is_secret and current:
            console.print("    [dim](already set — press Enter to keep)[/dim]")
            val = questionary.password("    New value:").ask()
            if not val:
                val = current
        elif is_secret:
            val = questionary.password(f"    Value:").ask() or ""
        else:
            val = Prompt.ask("   ", default=current)

        # Auto-generate JWT secret
        if key == "JWT_SECRET" and (not val or val.startswith("change")):
            val = secrets.token_hex(32)
            console.print(f"    [dim]Generated: {val[:20]}…[/dim]")

        if val:
            _write_env(key, val)

    console.print(f"\n  [green]✓[/green] .env saved → [dim]{ENV_PATH}[/dim]\n")

# ── 3. Setup DB schema ────────────────────────────────────────────────────────

def screen_setup_db():
    console.print(Panel("[bold]Setup Database Schema[/bold]", border_style="blue"))

    if not SCHEMA_PATH.exists():
        console.print(f"  [red]Schema not found: {SCHEMA_PATH}[/red]\n")
        return

    db = _db()
    if not db:
        return

    try:
        with db.cursor() as cur:
            cur.execute(SCHEMA_PATH.read_text(encoding='utf-8'))
        db.commit()
        console.print("  [green]✓[/green] Schema applied\n")
    except Exception as e:
        console.print(f"  [red]✗ Error: {e}[/red]\n")
    finally:
        db.close()

# ── 4. Server management ──────────────────────────────────────────────────────

def screen_servers():
    while True:
        console.print(Panel("[bold]Server Management[/bold]", border_style="blue"))

        db = _db()
        if not db:
            return

        with db.cursor() as cur:
            cur.execute("""
                SELECT s.id, s.name, sg.name AS group_name,
                       s.ip, s.port, s.rcon_port, s.dir_path, s.version
                FROM servers s
                JOIN server_groups sg ON s.group_id = sg.id
                ORDER BY sg.name, s.name
            """)
            servers = list(cur.fetchall())
        db.close()

        t = Table(box=box.ROUNDED, border_style="dim")
        t.add_column("ID",      style="dim",        width=6)
        t.add_column("Group",   style="cyan",        width=14)
        t.add_column("Name",    style="bold white",  width=16)
        t.add_column("IP:Port", style="green",       width=18)
        t.add_column("RCON",    style="yellow",      width=6)
        t.add_column("Directory")
        t.add_column("Ver",     style="dim",         width=14)

        for s in servers:
            t.add_row(
                str(s['id'])[:8],
                s['group_name'],
                s['name'],
                f"{s['ip']}:{s['port']}",
                str(s['rcon_port']),
                s['dir_path'] or "—",
                s['version'] or "—",
            )

        if servers:
            console.print(t)
        else:
            console.print("  [dim]No servers registered yet.[/dim]")
        console.print()

        action = questionary.select("Action:", choices=[
            "Add server manually",
            "Create demo server folder  (fake files for testing)",
            "Scan directory for servers",
            "Delete server",
            "Back to main menu",
        ]).ask()

        if action == "Add server manually":
            _add_server()
        elif action == "Create demo server folder  (fake files for testing)":
            _create_demo_folder()
        elif action == "Scan directory for servers":
            _scan_directory()
        elif action == "Delete server":
            if servers:
                _delete_server(servers)
            else:
                console.print("  [yellow]No servers to delete.[/yellow]\n")
        elif action == "Back to main menu" or action is None:
            break

def _pick_or_create_group(db) -> str | None:
    with db.cursor() as cur:
        cur.execute("SELECT id, name FROM server_groups ORDER BY name")
        groups = list(cur.fetchall())

    choices = [f"{g['name']}  (id={str(g['id'])[:8]})" for g in groups] + ["＋ Create new group"]
    chosen = questionary.select("Server group:", choices=choices).ask()
    if chosen is None:
        return None

    if chosen == "＋ Create new group":
        gname = Prompt.ask("  New group name")
        if not gname:
            return None
        with db.cursor() as cur:
            cur.execute("INSERT INTO server_groups (name) VALUES (%s) RETURNING id", [gname])
            gid = cur.fetchone()['id']
        db.commit()
        console.print(f"  [green]✓[/green] Group [bold]{gname}[/bold] created")
        return str(gid)

    for g in groups:
        if chosen == f"{g['name']}  (id={str(g['id'])[:8]})":
            return str(g['id'])

    return None

def _create_demo_folder():
    console.print("\n  [bold]Create Demo Server Folder[/bold]\n")
    console.print("  This creates a realistic folder structure so the file manager works immediately.")
    console.print("  [dim]No real Minecraft server needed — just browsable files.[/dim]\n")

    default_base = str(Path.home() / "mc-servers")
    base_raw = Prompt.ask("  Where to create it", default=default_base)
    server_name = Prompt.ask("  Server folder name", default="SurvivalCraft")

    server_dir = Path(base_raw) / server_name
    server_dir.mkdir(parents=True, exist_ok=True)

    # server.properties
    (server_dir / "server.properties").write_text(
        "server-port=25565\n"
        "rcon.port=25575\n"
        "rcon.password=changeme123\n"
        "enable-rcon=true\n"
        "level-name=world\n"
        "gamemode=survival\n"
        "difficulty=normal\n"
        "max-players=20\n"
        "online-mode=true\n"
        "motd=A Minecraft Server\n",
        encoding="utf-8",
    )

    # eula.txt
    (server_dir / "eula.txt").write_text("eula=true\n", encoding="utf-8")

    # logs/
    logs_dir = server_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    (logs_dir / "latest.log").write_text(
        "[00:00:01 INFO]: Starting minecraft server version 1.20.4\n"
        "[00:00:02 INFO]: Loading properties\n"
        "[00:00:03 INFO]: This server is running Paper version git-Paper-1\n"
        "[00:00:05 INFO]: Done! For help, type \"help\"\n",
        encoding="utf-8",
    )

    # plugins/
    plugins_dir = server_dir / "plugins"
    plugins_dir.mkdir(exist_ok=True)
    (plugins_dir / "README.txt").write_text(
        "Drop your .jar plugin files here.\n", encoding="utf-8"
    )

    # world/
    world_dir = server_dir / "world"
    world_dir.mkdir(exist_ok=True)
    (world_dir / "level.dat").write_bytes(b"\x00" * 64)  # fake NBT placeholder

    # ops.json
    (server_dir / "ops.json").write_text("[]\n", encoding="utf-8")

    # banned-players.json
    (server_dir / "banned-players.json").write_text("[]\n", encoding="utf-8")

    console.print(f"\n  [green]✓[/green] Created: [bold]{server_dir}[/bold]")
    console.print("    server.properties, eula.txt, logs/latest.log, plugins/, world/\n")

    if Confirm.ask("  Register this folder as a server in the database?", default=True):
        db = _db()
        if db:
            group_id = _pick_or_create_group(db)
            if group_id:
                with db.cursor() as cur:
                    cur.execute(
                        """INSERT INTO servers
                           (group_id, name, dir_path, ip, port, rcon_port, rcon_password, version)
                           VALUES (%s, %s, %s, '127.0.0.1', 25565, 25575, 'changeme123', 'Paper 1.20.4')
                           RETURNING id""",
                        [group_id, server_name, str(server_dir)],
                    )
                    sid = cur.fetchone()['id']
                db.commit()
                console.print(f"  [green]✓[/green] Registered as [bold]{server_name}[/bold] (id={str(sid)[:8]})\n")
            db.close()

    console.print(f"  [dim]To use a real Minecraft server instead, point dir_path to its folder[/dim]")
    console.print(f"  [dim]e.g.  C:\\mc-servers\\my-real-server  (wherever server.jar lives)[/dim]\n")


def _add_server():
    console.print("\n  [bold]Add Server[/bold]\n")
    db = _db()
    if not db:
        return

    group_id = _pick_or_create_group(db)
    if not group_id:
        db.close()
        return

    name      = Prompt.ask("  Server name")
    ip        = Prompt.ask("  IP address", default="127.0.0.1")
    port      = int(Prompt.ask("  Minecraft port", default="25565"))
    rcon_port = int(Prompt.ask("  RCON port",      default="25575"))
    rcon_pw   = questionary.password("  RCON password:").ask() or "changeme123"
    dir_path  = Prompt.ask("  Directory path (optional)", default="")
    version   = Prompt.ask("  Version", default="Paper 1.20.4")

    try:
        with db.cursor() as cur:
            cur.execute(
                """INSERT INTO servers
                   (group_id, name, dir_path, ip, port, rcon_port, rcon_password, version)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                [group_id, name, dir_path or '', ip, port, rcon_port, rcon_pw, version],
            )
            sid = cur.fetchone()['id']
        db.commit()
        console.print(f"\n  [green]✓[/green] Server [bold]{name}[/bold] registered (id={str(sid)[:8]})\n")
    except Exception as e:
        db.rollback()
        console.print(f"  [red]Error: {e}[/red]\n")
    finally:
        db.close()

def _scan_directory():
    console.print("\n  [bold]Scan Directory for Servers[/bold]\n")
    base_raw = Prompt.ask("  Directory to scan")
    base = Path(base_raw)

    if not base.exists():
        console.print(f"  [red]Path not found: {base}[/red]\n")
        return

    found = list(base.rglob("server.properties"))
    if not found:
        console.print("  [yellow]No server.properties files found.[/yellow]\n")
        return

    console.print(f"  Found [bold]{len(found)}[/bold] instance(s)\n")

    db = _db()
    if not db:
        return

    gname = Prompt.ask("  Group name for these servers", default=base.name)
    with db.cursor() as cur:
        cur.execute("INSERT INTO server_groups (name) VALUES (%s) RETURNING id", [gname])
        group_id = str(cur.fetchone()['id'])
    db.commit()

    def _prop(text: str, key: str) -> str:
        m = re.search(rf'^{re.escape(key)}=(.+)$', text, re.MULTILINE)
        return m.group(1).strip() if m else ''

    added = 0
    for props_file in found:
        inst = props_file.parent
        text = props_file.read_text(errors='replace')

        port      = int(_prop(text, 'server-port') or '25565')
        rcon_port = int(_prop(text, 'rcon.port')   or '25575')
        rcon_pw   = _prop(text, 'rcon.password')   or 'changeme123'

        console.print(f"  [dim]+[/dim] [bold]{inst.name}[/bold]  {inst}  port {port}")

        try:
            with db.cursor() as cur:
                cur.execute(
                    """INSERT INTO servers
                       (group_id, name, dir_path, ip, port, rcon_port, rcon_password, version)
                       VALUES (%s, %s, %s, '127.0.0.1', %s, %s, %s, 'Paper 1.20.4')""",
                    [group_id, inst.name, str(inst), port, rcon_port, rcon_pw],
                )
            db.commit()
            added += 1
        except Exception as e:
            db.rollback()
            console.print(f"    [yellow]Skipped ({e})[/yellow]")

    db.close()
    console.print(f"\n  [green]✓[/green] {added}/{len(found)} server(s) added\n")

def _delete_server(servers):
    choices = [
        f"[{str(s['id'])[:8]}] {s['group_name']}/{s['name']} ({s['ip']}:{s['port']})"
        for s in servers
    ]
    chosen = questionary.select("Delete which server?", choices=choices + ["Cancel"]).ask()
    if not chosen or chosen == "Cancel":
        return

    for i, c in enumerate(choices):
        if c == chosen:
            sid   = servers[i]['id']
            sname = servers[i]['name']
            if Confirm.ask(f"  [red]Delete {sname}?[/red]", default=False):
                db = _db()
                with db.cursor() as cur:
                    cur.execute("DELETE FROM servers WHERE id = %s", [str(sid)])
                db.commit()
                db.close()
                console.print(f"  [green]✓[/green] Deleted {sname}\n")
            return

# ── 5. Create admin account ───────────────────────────────────────────────────

def screen_admin():
    console.print(Panel("[bold]Create Admin Account[/bold]", border_style="blue"))

    db = _db()
    if not db:
        return

    with db.cursor() as cur:
        cur.execute("SELECT username FROM users WHERE role = 'owner'")
        existing = cur.fetchall()

    if existing:
        names = ", ".join(r['username'] for r in existing)
        console.print(f"  Existing owner(s): [cyan]{names}[/cyan]")
        if not Confirm.ask("  Add another?", default=False):
            db.close()
            return

    username = Prompt.ask("  Username", default="admin")
    display  = Prompt.ask("  Display name", default="Server Owner")
    password = questionary.password("  Password:").ask() or ""

    if not password:
        console.print("  [red]Password cannot be empty.[/red]\n")
        db.close()
        return

    pw_hash = py_bcrypt.hashpw(password.encode(), py_bcrypt.gensalt(12)).decode()

    try:
        with db.cursor() as cur:
            cur.execute(
                "INSERT INTO users (username, password_hash, name, role) VALUES (%s,%s,%s,'owner') RETURNING id",
                [username, pw_hash, display],
            )
            uid = cur.fetchone()['id']
            cur.execute("SELECT id FROM server_groups")
            for row in cur.fetchall():
                cur.execute(
                    "INSERT INTO user_group_access (user_id, group_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                    [str(uid), str(row['id'])],
                )
        db.commit()
        console.print(f"\n  [green]✓[/green] Admin [bold]{username}[/bold] created\n")
    except Exception as e:
        db.rollback()
        console.print(f"  [red]Error: {e}[/red]\n")
    finally:
        db.close()

# ── Main menu ─────────────────────────────────────────────────────────────────

_MENU = [
    ("1.  Install dependencies  (npm + Docker)",     screen_install),
    ("2.  Configure .env        (API keys, DB, JWT)", screen_env),
    ("3.  Setup database schema",                     screen_setup_db),
    ("4.  Manage servers        (add / scan / delete)", screen_servers),
    ("5.  Create admin account",                      screen_admin),
    ("6.  Exit",                                      None),
]

def main():
    _header()
    while True:
        choice = questionary.select(
            "What would you like to do?",
            choices=[m[0] for m in _MENU],
        ).ask()
        console.print()

        if choice is None or choice.startswith("6"):
            console.print("[dim]Goodbye![/dim]\n")
            break

        for label, fn in _MENU:
            if choice == label and fn:
                fn()
                break

if __name__ == "__main__":
    main()
