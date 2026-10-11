import { createAgent } from "./agents.js";
import { Studio } from "@anvia/studio";
import { sandbox, tools } from "./sandbox.js";
import { lens } from "./observer.js";

const agent = createAgent();

export const studio = new Studio([agent], {
  sandboxes: [
    {
      inspector: sandbox.inspector({
        files: true,
        ports: true,
        processes: true,
      }),
      agentIds: [agent.id],
      toolNames: tools.map((tool) => tool.name),
    },
  ],
}).serve({
  port: 3000,
  onShutdown: async () => sandbox.destroy(),
});