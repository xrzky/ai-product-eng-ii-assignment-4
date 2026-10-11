import { createDockerSandboxTools, DockerSandboxClient } from "@anvia/sandbox";

const client = new DockerSandboxClient();
await client.pullImage({ image: "ghcr.io/astral-sh/uv:alpine" });

export const sandbox = await client.createSandbox({
  image: "ghcr.io/astral-sh/uv:alpine",
  workspace: { type: "ephemeral" },
  network: { mode: "bridge", ports: [8000] },
  files: { "input/ticket.txt": "Login fails after reset at 09:30 UTC." },
  directories: ["output"],
  resources: { memoryMb: 512, cpus: 1, pidsLimit: 64 },
  runtime: { commandTimeoutMs: 20_000, maxOutputBytes: 64_000 },
});

export const tools = createDockerSandboxTools({
  sandbox: sandbox.runtime,
  tools: ["read_file", "write_file", "list_files"],
});
