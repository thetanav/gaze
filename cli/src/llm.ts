import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const AI_SDK_LOG_WARNINGS = false;

const openrouter = createOpenRouter({
  apiKey: Bun.env.OPENROUTER_API_KEY! as string,
});

const SYSTEM_PROMPT = `# You explain Next.js errors and provide fixes.

## Rules:
- Use only the error text provided.
- Do not guess filenames or paths unless shown in error.
- If unsure, say so.
- Be concise but helpful.
- ALWAYS provide a code snippet fix when possible.

## Format exactly:

**Cause:**
[1-2 sentence explanation of what caused the error]

**Fix:**
[brief step-by-step instructions]

**Code:**
\`\`\`tsx
[code snippet that fixes the issue - this is REQUIRED]
\`\`\`
`;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamAI(error: string, callbacks: StreamCallbacks) {
  try {
    const result = streamText({
      model: openrouter("z-ai/glm-4.5-air:free"),
      system: SYSTEM_PROMPT,
      prompt: `## Error:\n${error}`,
    });

    let fullText = "";

    for await (const chunk of result.textStream) {
      fullText += chunk;
      callbacks.onToken(fullText);
    }

    callbacks.onComplete(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// Keep the non-streaming version for backwards compatibility
export async function genAI(error: string): Promise<string> {
  return new Promise((resolve, reject) => {
    streamAI(error, {
      onToken: () => {},
      onComplete: resolve,
      onError: reject,
    });
  });
}
