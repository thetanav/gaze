import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: Bun.env.GEMINI_API_KEY! as string,
});

export async function genAI(error: string) {
  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
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
