# How to reproduce uncommitted artifacts

No uncommitted build artifacts are required. The project uses Vite's dev server which bundles on-the-fly.

## Prerequisites
- `bun` is installed (v1.3+)
- Dependencies are installed: `bun install`
- `.env` file exists with Supabase and Gemini API keys

## How to run the dev server

```bash
cd "E:/my projects/local-CMR-main"
bun run dev --port 3000 --host 0.0.0.0
```

The server starts on port 3000 by default (vite.config.ts). If that port is in use, Vite will automatically pick the next available port (3001, 3002, etc.) and log the actual URL.

### Detached preview server (Freebuff Preview tab)

For the in-thread live preview, run the server detached with logging and bind to loopback:

```bash
cd "E:/my projects/local-CMR-main"
nohup bun run dev --port 3000 --host 127.0.0.1 > .freebuff/preview-<thread-id>.log 2>&1 < /dev/null &
# Wait for Vite, then record the actual listening PID (not always the shell's $!).
netstat -ano | grep ':3000 ' | grep LISTENING
```

- Use port 3000 when free; otherwise pick an explicit free port (3001, 3002, etc.) and adapt the command and checks.
- Confirm the port is listening and use the PID from the `LISTENING` row when registering the preview; on Windows/Git Bash, `$!` can be the wrapper shell rather than Vite's process.
- Confirm the URL answers before registration: `curl -I http://127.0.0.1:<port>/`
- The Vite log shows the actual URL (e.g. `http://127.0.0.1:3000/`).
