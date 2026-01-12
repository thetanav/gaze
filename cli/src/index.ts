#!/usr/bin/env bun

globalThis.AI_SDK_LOG_WARNINGS = false;

import blessed from "blessed";
import { streamAI } from "./llm";

const port = Bun.argv[2] || "3000";

const ws = new WebSocket(`ws://localhost:${port}/_next/webpack-hmr`);

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
let isGenerating = false;
let copyNotificationTimeout: ReturnType<typeof setTimeout> | null = null;

// Store errors
interface ErrorItem {
  timestamp: string;
  message: string;
  aiResponse?: string;
}
const errors: ErrorItem[] = [];
let currentIndex = 0;

export function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, "");
}

// Extract code snippets from markdown code blocks
function extractCodeSnippet(text: string): string | null {
  // Match ```lang\ncode\n``` or ```\ncode\n```
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches: string[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match[1]) {
      matches.push(match[1].trim());
    }
  }
  
  // Return all code blocks joined, or null if none found
  return matches.length > 0 ? matches.join("\n\n") : null;
}

// Copy text to clipboard using different methods
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try using Bun's shell to access system clipboard
    const proc = Bun.spawn(["sh", "-c", `printf '%s' "$1" | ${getClipboardCommand()}`, "_", text], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

function getClipboardCommand(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return "pbcopy";
  } else if (platform === "linux") {
    // Try xclip first, then xsel, then wl-copy (Wayland)
    return "xclip -selection clipboard 2>/dev/null || xsel --clipboard --input 2>/dev/null || wl-copy 2>/dev/null";
  } else if (platform === "win32") {
    return "clip";
  }
  return "xclip -selection clipboard";
}

function showCopyNotification(message: string) {
  // Clear any existing notification
  if (copyNotificationTimeout) {
    clearTimeout(copyNotificationTimeout);
  }
  
  // Update header with notification
  header.setContent(
    ` {bold}{cyan-fg}GAZE{/cyan-fg}{/bold} - {green-fg}${message}{/green-fg}`
  );
  screen.render();
  
  // Reset after 2 seconds
  copyNotificationTimeout = setTimeout(() => {
    header.setContent(
      " {bold}{cyan-fg}GAZE{/cyan-fg}{/bold} - Next.js Development Monitor"
    );
    screen.render();
  }, 2000);
}

const screen = blessed.screen({
  smartCSR: true,
  fastCSR: true,
  title: "gaze",
  fullUnicode: true,
  autoPadding: true,
  warnings: false,
});

const header = blessed.box({
  parent: screen,
  top: 0,
  height: 1,
  width: "100%",
  content:
    " {bold}{cyan-fg}GAZE{/cyan-fg}{/bold} - Next.js Development Monitor",
  tags: true,
  style: {
    fg: "white",
    bg: "black",
  },
});

const left = blessed.box({
  parent: screen,
  left: 0,
  top: 1,
  width: "100%",
  height: "100%-2",
  label: " {bold}Error{/bold} ",
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: "│",
    track: {
      bg: "black",
    },
    style: {
      fg: "cyan",
      bg: "black",
    },
  },
  mouse: true,
  keys: true,
  tags: true,
  border: "line",
  style: {
    border: {
      fg: "cyan",
    },
  },
});

const right = blessed.box({
  parent: screen,
  left: "50%",
  top: 1,
  width: "50%",
  height: "100%-2",
  label: " {bold}AI Insight{/bold} ",
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: "│",
    track: {
      bg: "black",
    },
    style: {
      fg: "green",
      bg: "black",
    },
  },
  mouse: true,
  keys: true,
  tags: true,
  border: "line",
  style: {
    border: {
      fg: "green",
    },
  },
});

const status = blessed.box({
  parent: screen,
  bottom: 0,
  height: 1,
  width: "100%",
  tags: true,
});

// Focus tracking
let focusedPane: "left" | "right" = "left";
let aiEnabled = false;

// Scroll amount per keypress
const SCROLL_AMOUNT = 3;

// Hide right pane initially (AI off by default)
right.hide();

function updateLayout() {
  if (aiEnabled) {
    left.width = "50%";
    right.show();
  } else {
    left.width = "100%";
    right.hide();
    focusedPane = "left";
  }
}

function updateLabel() {
  const errCount = errors.length;
  const pos = errCount > 0 ? `${currentIndex + 1}/${errCount}` : "0/0";
  left.setLabel(` {bold}Error [${pos}]{/bold} `);
}

function updateStatus(connected = true) {
  const connIcon = connected ? "{green-fg}●{/green-fg}" : "{red-fg}●{/red-fg}";
  const aiStatus = aiEnabled
    ? "{green-fg}ON{/green-fg}"
    : "{red-fg}OFF{/red-fg}";
  const streamingStatus = isGenerating ? " {yellow-fg}⟳{/yellow-fg}" : "";
  status.setContent(
    ` ${connIcon} PORT:${port} | AI:${aiStatus}${streamingStatus} | {cyan-fg}hjkl{/cyan-fg}:nav  {cyan-fg}a{/cyan-fg}:ai  {cyan-fg}e{/cyan-fg}:copy err  {cyan-fg}v{/cyan-fg}:copy fix  {cyan-fg}c{/cyan-fg}:clear  {cyan-fg}q{/cyan-fg}:quit `
  );
  screen.render();
}

function renderCurrentError() {
  updateLabel();
  updateLayout();

  if (errors.length === 0) {
    left.setContent("{gray-fg}No errors yet...{/gray-fg}");
    if (aiEnabled) {
      right.setContent("{gray-fg}Waiting for errors...{/gray-fg}");
    }
    screen.render();
    return;
  }

  const err = errors[currentIndex];
  if (!err) return;

  left.setContent(
    `{yellow-fg}[${err.timestamp}]{/yellow-fg}\n\n${err.message}`
  );
  left.scrollTo(0);

  // Show cached AI response or generate new one (only if AI enabled)
  if (aiEnabled) {
    if (err.aiResponse) {
      right.setContent(err.aiResponse);
      right.scrollTo(0);
    } else {
      streamAIForCurrent();
    }
  }

  screen.render();
}

async function streamAIForCurrent() {
  if (errors.length === 0 || isGenerating || !aiEnabled) return;

  const err = errors[currentIndex];
  if (!err) return;

  if (err.aiResponse) {
    right.setContent(err.aiResponse);
    right.scrollTo(0);
    screen.render();
    return;
  }

  isGenerating = true;
  updateStatus();

  // Store reference to track if user navigated away
  const errorBeingProcessed = err;

  streamAI(err.message, {
    onToken: (fullText) => {
      // Only update if still viewing the same error
      if (errors[currentIndex] === errorBeingProcessed && aiEnabled) {
        right.setContent(fullText);
        screen.render();
      }
    },
    onComplete: (fullText) => {
      errorBeingProcessed.aiResponse = fullText;
      isGenerating = false;
      updateStatus();

      if (errors[currentIndex] === errorBeingProcessed && aiEnabled) {
        right.setContent(fullText);
        screen.render();
      }
    },
    onError: (error) => {
      isGenerating = false;
      updateStatus();

      if (errors[currentIndex] === errorBeingProcessed && aiEnabled) {
        right.setContent(`{red-fg}AI Error: ${error.message}{/red-fg}`);
        screen.render();
      }
    },
  });
}

// Navigation: h/l for prev/next error
screen.key(["h"], () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentError();
  }
});

screen.key(["l"], () => {
  if (currentIndex < errors.length - 1) {
    currentIndex++;
    renderCurrentError();
  }
});

// Scroll: j/k for vertical scroll in focused pane
screen.key(["j"], () => {
  if (aiEnabled && focusedPane === "right") {
    right.scroll(SCROLL_AMOUNT);
  } else {
    left.scroll(SCROLL_AMOUNT);
  }
  screen.render();
});

screen.key(["k"], () => {
  if (aiEnabled && focusedPane === "right") {
    right.scroll(-SCROLL_AMOUNT);
  } else {
    left.scroll(-SCROLL_AMOUNT);
  }
  screen.render();
});

// Page up/down for faster scrolling
screen.key(["pagedown", "C-d"], () => {
  const pane = aiEnabled && focusedPane === "right" ? right : left;
  pane.scroll(10);
  screen.render();
});

screen.key(["pageup", "C-u"], () => {
  const pane = aiEnabled && focusedPane === "right" ? right : left;
  pane.scroll(-10);
  screen.render();
});

// Home/End to jump to top/bottom
screen.key(["home", "g"], () => {
  const pane = aiEnabled && focusedPane === "right" ? right : left;
  pane.scrollTo(0);
  screen.render();
});

screen.key(["end", "G"], () => {
  const pane = aiEnabled && focusedPane === "right" ? right : left;
  // @ts-ignore - getScrollHeight exists on scrollable boxes
  const scrollHeight = pane.getScrollHeight?.() || 1000;
  pane.scrollTo(scrollHeight);
  screen.render();
});

// Tab to switch focus between panes (only when AI is on)
screen.key(["tab"], () => {
  if (!aiEnabled) return;
  focusedPane = focusedPane === "left" ? "right" : "left";
  if (focusedPane === "left") {
    left.style.border.fg = "cyan";
    right.style.border.fg = "gray";
  } else {
    left.style.border.fg = "gray";
    right.style.border.fg = "green";
  }
  screen.render();
});

screen.key(["q", "C-c"], () => {
  ws.close();
  screen.destroy();
  process.exit(0);
});

screen.key(["c"], () => {
  errors.length = 0;
  currentIndex = 0;
  renderCurrentError();
});

// Toggle AI
screen.key(["a"], () => {
  aiEnabled = !aiEnabled;
  updateStatus();
  renderCurrentError();
});

// Copy error to clipboard (e key)
screen.key(["e"], async () => {
  if (errors.length === 0) {
    showCopyNotification("No error to copy");
    return;
  }
  
  const err = errors[currentIndex];
  if (!err) return;
  
  const success = await copyToClipboard(err.message);
  if (success) {
    showCopyNotification("Error copied to clipboard!");
  } else {
    showCopyNotification("Failed to copy (no clipboard tool)");
  }
});

// Copy code snippet from AI response (v key)
screen.key(["v"], async () => {
  if (errors.length === 0) {
    showCopyNotification("No error selected");
    return;
  }
  
  const err = errors[currentIndex];
  if (!err?.aiResponse) {
    showCopyNotification("No AI response yet (press 'a' to enable AI)");
    return;
  }
  
  const codeSnippet = extractCodeSnippet(err.aiResponse);
  if (!codeSnippet) {
    showCopyNotification("No code snippet found in AI response");
    return;
  }
  
  const success = await copyToClipboard(codeSnippet);
  if (success) {
    showCopyNotification("Code snippet copied to clipboard!");
  } else {
    showCopyNotification("Failed to copy (no clipboard tool)");
  }
});

// Initial render
updateStatus();
renderCurrentError();

ws.onopen = () => {
  updateStatus(true);
};

ws.onmessage = async (event) => {
  try {
    const data = JSON.parse(event.data);

    if (data.errors && data.errors.length > 0) {
      // Replace errors list (not append)
      errors.length = 0;
      const timestamp = new Date().toLocaleTimeString();

      for (const err of data.errors) {
        errors.push({
          timestamp,
          message: stripAnsi(err.message),
        });
      }

      currentIndex = 0;
      renderCurrentError();
    }
  } catch {
    // Ignore non-JSON or malformed messages
  }
};

ws.onerror = () => {
  updateStatus(false);
};

ws.onclose = () => {
  updateStatus(false);
};

process.on("uncaughtException", (err) => {
  right.setContent(`{red-fg}Error: ${err.message}{/red-fg}`);
  isGenerating = false;
  updateStatus();
  screen.render();
});

process.on("unhandledRejection", (err) => {
  right.setContent(`{red-fg}Error: ${String(err)}{/red-fg}`);
  isGenerating = false;
  updateStatus();
  screen.render();
});
