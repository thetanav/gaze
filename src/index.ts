#!/usr/bin/env bun

globalThis.AI_SDK_LOG_WARNINGS = false;

import blessed from "blessed";
import { genAI } from "./llm";

const ws = new WebSocket("ws://localhost:3000/_next/webpack-hmr");

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
let isGenerating = false;
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0;

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
  status.setContent(
    ` ${connIcon} PORT:3000 | AI:${aiStatus} | {cyan-fg}h{/cyan-fg}← {cyan-fg}j{/cyan-fg}↓ {cyan-fg}k{/cyan-fg}↑ {cyan-fg}l{/cyan-fg}→  {cyan-fg}a{/cyan-fg}:ai  {cyan-fg}c{/cyan-fg}:clear  {cyan-fg}q{/cyan-fg}:quit `
  );
  screen.render();
}

function renderCurrentError() {
  updateLabel();
  updateLayout();

  if (errors.length === 0) {
    left.setContent("{gray-fg}No errors yet...{/gray-fg}");
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
    } else {
      getAIForCurrent();
    }
  }

  screen.render();
}

async function getAIForCurrent() {
  if (errors.length === 0 || isGenerating || !aiEnabled) return;

  const err = errors[currentIndex];
  if (!err) return;

  if (err.aiResponse) {
    right.setContent(err.aiResponse);
    screen.render();
    return;
  }

  startSpinner();
  try {
    const aiResult = await genAI(err.message);
    err.aiResponse = aiResult;
    // Only update if still on same error
    if (errors[currentIndex] === err) {
      right.setContent(aiResult);
    }
  } catch (e) {
    right.setContent(`{red-fg}AI Error: ${String(e)}{/red-fg}`);
  }
  stopSpinner();
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
    right.scroll(1);
  } else {
    left.scroll(1);
  }
  screen.render();
});

screen.key(["k"], () => {
  if (aiEnabled && focusedPane === "right") {
    right.scroll(-1);
  } else {
    left.scroll(-1);
  }
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

let spinnerInterval: ReturnType<typeof setInterval> | null = null;

function startSpinner() {
  isGenerating = true;
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    right.setContent(
      `{yellow-fg} ${spinnerFrames[spinnerIndex]} Thinking...{/yellow-fg}`
    );
    screen.render();
  }, 80);
}

function stopSpinner() {
  isGenerating = false;
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  screen.render();
}

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
  stopSpinner();
  screen.render();
});

process.on("unhandledRejection", (err) => {
  right.setContent(`{red-fg}Error: ${String(err)}{/red-fg}`);
  stopSpinner();
  screen.render();
});
