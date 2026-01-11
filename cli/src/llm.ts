import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const AI_SDK_LOG_WARNINGS = false;

const openrouter = createOpenRouter({
  apiKey: Bun.env.OPENROUTER_API_KEY! as string,
});

export async function genAI(error: string) {
  const result = await generateText({
    model: openrouter("z-ai/glm-4.5-air:free"),
    prompt: `
# You explain Next.js errors.

## Rules:
- Use only the error text.
- Do not guess code or files.
- If unsure, say so.
- Be concise.

## Format exactly:

- Fix:

- Cause:

## Error with Lint:
${error}
`,
  });
  return result.text;
}
