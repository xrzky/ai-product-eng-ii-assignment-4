# Travel Agent Sandbox

An [Anvia](https://github.com/anvia-hq/anvia) agent that researches a destination, writes a
day-by-day itinerary into a Docker sandbox, and reads it back before answering. The agent is served
through Anvia Studio, so you can watch every tool call, inspect sandbox files, and browse traces in
the browser.

The repo also ships an evaluation suite (deterministic containment, abstention, and LLM-judged
faithfulness) that runs against the same agent, plus optional tracing to a self-hosted Anvia Lens
instance.

This is the teaching starter for the AI Product Engineering II sandbox lesson: it begins with a
single plain instruction and a small tool set, then grows as each failure is observed in Studio.

---

## What it does

| Piece | Purpose |
| --- | --- |
| `src/instructions.ts` | The agent's system prompt: a travel planner workflow plus a strict itinerary format. |
| `src/tools/search-web.ts` | `search-web` tool backed by [Tavily](https://tavily.com), returning an answer plus markdown content. |
| `src/sandbox.ts` | Creates a Docker sandbox from `ghcr.io/astral-sh/uv:alpine` and exposes `read_file`, `write_file`, `list_files`. |
| `src/agents.ts` | Wires the model, instructions, tools, and the Lens observer into one `Agent`. |
| `src/index.ts` | Starts Studio on port 3000 with a sandbox inspector and destroys the sandbox on shutdown. |
| `src/models.ts` | Builds the completion model from `OPENAI_*` environment variables. |
| `src/observer.ts` | `LensClient` for traces and eval reporting. |
| `src/evals/` | The eval cases and runners (`contain`, `abstention`, `geval-faithfulness`). |
| `lens/` | Optional `docker-compose.yml` that runs the full Anvia Lens stack locally. |

### Agent workflow

The instruction tells the agent to: understand destination/duration/interests → search the web →
draft a day-by-day itinerary → `write_file` it to `itinerary.md` → `read_file` it back → summarise
from the file it just read. It is explicitly told never to answer before `read_file` runs, not to
invent attractions or URLs, and to ask for missing trip details instead of guessing.

The sandbox is deliberately minimal. `uv:alpine` ships `uv`, `wget`, and `sh`, but no `curl` and no
system `python`; the container gets 512 MB memory, 1 CPU, 64 PIDs, a 20 s command timeout, and 64 KB
of output per command. It starts with a seed file at `input/ticket.txt` and an `output/` directory,
and publishes port 8000 to localhost only.

---

## Requirements

- **Node.js 20+** (developed on Node 22)
- **pnpm 12.5.1** — pinned in `package.json`; run `corepack enable` and it will be picked up
  automatically
- **Docker**, running and reachable from your shell — the agent pulls and starts a container on boot
- An **API key** for an OpenAI-compatible chat-completions endpoint
- A **Tavily API key** for `search-web`

## Setup

```sh
git clone https://github.com/Devscale-Indonesia/agent-sandbox.git
cd agent-sandbox

pnpm install
cp .env.example .env
```

Then fill in `.env`:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://your-endpoint.example/v1   # optional
OPENAI_MODEL=your-model-id                         # optional, defaults to glm-5.3-flash

TAVILY_API_KEY=your-tavily-key
```

`OPENAI_BASE_URL` lets you point at any OpenAI-compatible gateway instead of OpenAI itself. Leave
`OPENAI_MODEL` unset to use the default in `src/models.ts`.

### Tracing (optional)

`src/observer.ts` constructs a `LensClient` at import time and it **requires** a base URL, public
key, and secret key — the process throws on startup without them. To trace runs and report eval
results, add:

```dotenv
ANVIA_LENS_BASE_URL=http://localhost
ANVIA_LENS_PUBLIC_KEY=...
ANVIA_LENS_SECRET_KEY=...
```

To run Lens itself, use the bundled stack:

```sh
cd lens
# create lens/.env with the values listed under "Lens stack" below
docker compose up -d
```

`lens/.env` is gitignored and is not shipped in this repo, so you must create it yourself before
`docker compose` will start.

If you only want the agent and not tracing, keep the three `ANVIA_LENS_*` variables set to a running
instance or leave the tracing observer out of `src/agents.ts`.

---

## Run

```sh
pnpm start
```

This pulls the sandbox image, starts the container, and serves Studio on
**http://localhost:3000** (the root path redirects into the Studio UI).

Try this prompt:

> Plan a 3-day trip to Bali. I like beaches, local food, and cultural attractions.

Then in Studio:

- **Playground** — send prompts and watch the transcript stream, including each tool call.
- **Tracing** — follow the agent run span by span, with Lens attached.
- **Sandbox inspector** — browse the sandbox filesystem, open the generated `itinerary.md`, and
  check published ports and running processes.

The lesson loop: run a task, look at what the tool calls actually did, and edit
`src/instructions.ts` **only** when a run shows a specific problem. Then rerun the same task and
compare.

Stop the process with Ctrl-C; the shutdown hook destroys the sandbox.

---

## Evaluations

The suite runs the agent against fixed cases and reports results to Lens (when configured).

```sh
pnpm eval:run            # all three suites, in order
pnpm eval:contain        # deterministic: output contains expected strings
pnpm eval:abstention     # judge metric: must refuse a fictional destination
pnpm eval:geval          # LLM-judged: must ask for missing details instead of inventing a trip
```

| Suite | File | Metric | What it checks |
| --- | --- | --- | --- |
| Containment | `src/evals/contain-cases.ts` | `contains()` | A Bali request yields `Day 3`, a file request mentions `itinerary.md`, a Yogyakarta request names the city. |
| Abstention | `src/evals/abstention-cases.ts` | `abstention()` | Asked about fictional "Kamada Island", the agent abstains rather than fabricating. |
| Faithfulness | `src/evals/geval-faithfulness-cases.ts` | `gEval()` | Given only "Plan a trip for me.", the agent asks for destination and duration instead of inventing one. |

Both judge metrics call a model, so they consume tokens and need working `OPENAI_*` credentials.
`pnpm eval:abstention` sets `exitCode: true`, so it exits non-zero on a required metric failure —
useful as a CI gate.

---

## Lens stack (`lens/docker-compose.yml`)

The compose file runs the full Lens deployment: `web`, `api`, `worker`, `migrate`, plus Postgres 17,
Redis 8, ClickHouse 26.4, and a host-monitoring sidecar. Images come from
`ghcr.io/anvia-hq/lens` and are pinned by `LENS_VERSION`.

Create `lens/.env` before starting it. The compose file requires these values (`:?` means compose
refuses to start without them):

```dotenv
PUBLIC_APP_URL=http://localhost
WEB_ORIGIN=http://localhost
WEB_PORT=80

# Generate each with: openssl rand -hex 32
POSTGRES_PASSWORD=
CLICKHOUSE_PASSWORD=
REDIS_PASSWORD=
INGESTION_KEY_PEPPER=
# At least 32 random characters
BETTER_AUTH_SECRET=
```

Two settings are worth checking on a fresh machine:

- `SYSTEM_MONITOR_DATA_PATH` defaults to `/var/lib/docker`. Confirm it matches
  `docker info --format '{{.DockerRootDir}}'`, since the monitor bind-mounts that path read-only.
- The `monitor` service bind-mounts `/proc` and `/` from the host. This is intended for a Linux
  Docker host; it will not behave the same on Docker Desktop for macOS or Windows.

Everything else in `lens/.env` (OIDC, SMTP, queue and ClickHouse limits) is optional and commented
in the file. Keep `PASSWORD_LOGIN_ENABLED=true` until OIDC login has been tested, so the owner
retains a recovery sign-in.

---

## Project layout

```
src/
  index.ts            Studio server (port 3000) + sandbox inspector
  agents.ts           Agent definition: model, instructions, tools, observers
  instructions.ts     System prompt and itinerary format
  models.ts           OpenAI-compatible completion model
  sandbox.ts          Docker sandbox + file tools
  observer.ts         LensClient (tracing and eval reporting)
  tools/
    search-web.ts     Tavily-backed web search tool
  evals/
    contain.ts / contain-cases.ts
    abstention.ts / abstention-cases.ts
    geval-faithfulness.ts / geval-faithfulness-cases.ts
lens/
  docker-compose.yml  Self-hosted Anvia Lens stack
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm start` | Run the agent in Studio on port 3000 |
| `pnpm typecheck` | `tsc --noEmit` across `src/` |
| `pnpm eval:run` | Run every eval suite |
| `pnpm eval:contain` | Containment suite only |
| `pnpm eval:abstention` | Abstention suite only |
| `pnpm eval:geval` | Faithfulness (gEval) suite only |

## Troubleshooting

**`Set OPENAI_API_KEY in .env or your environment.`**
`.env` is missing or still holds the empty placeholder. The app loads it via
`tsx --env-file=.env`, so the file must sit next to `package.json`.

**`Anvia Lens baseUrl is required` / `publicKey is required`**
`src/observer.ts` builds the Lens client on import. Set the three `ANVIA_LENS_*` variables, or
remove the `observability` block from `src/agents.ts` to run without tracing.

**Docker errors on startup**
The agent pulls `ghcr.io/astral-sh/uv:alpine` before creating the sandbox. Confirm the daemon is
running (`docker info`) and that you can pull from GHCR.

**Port 3000 or 80 already in use**
Studio's port is the `serve({ port: 3000 })` call in `src/index.ts`; Lens's web port is `WEB_PORT`
in `lens/.env`.
