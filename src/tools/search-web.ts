import { createTool } from "@anvia/core";
import { tavily } from "@tavily/core";
import z from "zod";

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY!,
});

export const searchWeb = createTool({
  name: "search-web",
  description: "use this tool when user asking for realtime web search results",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async (args) => {
    const results = await tavilyClient.search(args.query, {
      includeAnswer: true,
      includeRawContent: "markdown",
    });
    return JSON.stringify(results);
  },
});
