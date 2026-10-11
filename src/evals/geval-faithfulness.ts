import { gEval, runEvalCli } from "@anvia/core/evals";
import { createAgent } from "../agents.js";
import { lens } from "../observer.js";
import { getModel } from "../models.js";
import { gEvalFaithfulnessCases } from "./geval-faithfulness-cases.js";

const agent = createAgent();

const evalResult = await runEvalCli({
  name: "travel-geval-faithfulness-check",
  cases: gEvalFaithfulnessCases,
  target: (input: string) => agent.generate({ prompt: input }),
  metrics: [
    gEval({
      name: "asks-for-missing-details",
      model: getModel(),
      threshold: 0.8,
      criteria:
        "When the request lacks a destination or trip duration, the answer must ask the user for the missing details. It must not invent a destination or produce an itinerary.",
      evaluationParams: ["input", "actualOutput", "expectedOutput"],
    }),
  ],
  reporters: [lens.evalReporter({ includePayloads: true })],
});

console.log(evalResult.results);

await lens.flush();
