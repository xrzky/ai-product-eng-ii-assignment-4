import { abstention, runEvalCli } from "@anvia/core/evals";
import { createAgent } from "../agents.js";
import { lens } from "../observer.js";
import { getModel } from "../models.js";
import { abstentionCases } from "./abstention-cases.js";

const agent = createAgent();

const evalResult = await runEvalCli({
  name: "travel-abstention-check",
  cases: abstentionCases,
  target: (input: string) => agent.generate({ prompt: input }),
  metrics: [
    abstention({
      model: getModel(),
      shouldAbstain: ({ case: testCase }) => testCase.expected === true,
    }),
  ],
  format: "pretty",
  exitCode: true,
  reporters: [lens.evalReporter({ includePayloads: true })],
});

console.log(evalResult.results);

await lens.flush();
