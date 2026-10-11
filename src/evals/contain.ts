import { contains, runEvalCli } from "@anvia/core/evals";
import { createAgent } from "../agents.js";
import { lens } from "../observer.js";
import { containCases } from "./contain-cases.js";

const agent = createAgent();

const evalResult = await runEvalCli({
  name: "travel-contain-check",
  cases: containCases,
  target: (input: string) => agent.generate({ prompt: input }),
  metrics: [contains()],
  reporters: [lens.evalReporter({ includePayloads: true })],
});

console.log(evalResult.results);

await lens.flush();
