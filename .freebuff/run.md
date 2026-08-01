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
nohup bun run dev --port 3000 --host 127.0.0.1 > .freebuff/preview-<thread-id>.log 2>&1 &
echo $! > .freebuff/preview.pid
```

- Use port 3000 when free; otherwise pick an explicit free port (3001 was used previously when 3000 was occupied).
- Confirm the port is listening before registering: `netstat -ano | grep ':3000 ' | grep LISTENING`
- The Vite log shows the actual URL (e.g. `http://127.0.0.1:3000/`).
