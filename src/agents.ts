import { Agent } from "@anvia/core";
import { BASE_INSTRUCTIONS } from "./instructions.js";
import { getModel } from "./models.js";
import { tools } from "./sandbox.js";
import { searchWeb } from "./tools/search-web.js";
import { lens } from "./observer.js";

export function createAgent() {
  return new Agent({
    id: "assistant",
    model: getModel(),
    instructions: BASE_INSTRUCTIONS,
    tools: [searchWeb, ...tools],
    observability: {
      observers: {
        tracing: lens.observer({ captureMode: "full" }),
      },
    },
  });
}
