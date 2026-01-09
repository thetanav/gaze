import blessed from "blessed";
import { genAI } from "./llm";

const ws = new WebSocket("ws://localhost:3000/_next/webpack-hmr");

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
let logs = "";
let inteli = "";
let ai = true;
let isGenerating = false;
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0;

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
  width: ai ? "50%" : "100%",
  height: "100%-2",
  label: " {bold}Logs{/bold} (j↑ k↓ c-clear) ",
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
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
  label: " {bold}Intelligence{/bold} (j↑ k↓) ",
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
  content: ` {green-fg}●{/green-fg} PORT:3000 - (a) AI: ${
    ai ? "ON" : "OFF"
  } - (c) Clear - (q) Quit `,
  tags: true,
});

screen.key(["q", "C-c"], () => {
  screen.destroy();
  process.exit(0);
});
screen.key(["a"], () => {
  ai = !ai;
  if (ai) {
    right.show();
    left.width = "50%";
  } else {
    right.hide();
    left.width = "100%";
  }
  screen.render();
});
screen.key(["c"], () => {
  logs = "";
  left.setContent(logs);
  screen.render();
});

screen.render();

let spinnerInterval: ReturnType<typeof setInterval> | null = null;

function startSpinner() {
  isGenerating = true;
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    right.setContent(
      `{yellow-fg} ${spinnerFrames[spinnerIndex]} Thinking{/yellow-fg}`
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

ws.onopen = () => {
  screen.render();
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.errors != undefined && data.errors.length > 0) {
    for (const err of data.errors) {
      const timestamp = new Date().toLocaleTimeString();
      logs += `[${timestamp}]\n ERROR: ${stripAnsi(err.message)}\n`;
      left.setContent(logs);
      screen.render();

      if (ai) {
        startSpinner();

        try {
          const aiResult = await genAI(stripAnsi(err.message));
          inteli = aiResult;
          right.setContent(aiResult);
        } catch (e) {
          right.setContent(`{red-fg}AI Error: ${String(e)}{/red-fg}`);
        }

        stopSpinner();
      }
    }
  }

  if (data.warnings != undefined && data.warnings.length > 0) {
    for (const err of data.warnings) {
      const timestamp = new Date().toLocaleTimeString();
      logs += `{yellow-fg}[${timestamp}] WARN: ${stripAnsi(
        err.message
      )}{/yellow-fg}\n`;
    }
    left.setContent(logs);
    screen.render();
  }
};

ws.onerror = () => {
  status.content = ` {red-fg}●{/red-fg} PORT:3000 - Connection Error - (a) AI: ${
    ai ? "ON" : "OFF"
  } - (c) Clear - (q) Quit `;
  screen.render();
};

ws.onclose = () => {
  status.content = ` {red-fg}●{/red-fg} PORT:3000 - Disconnected - (a) AI: ${
    ai ? "ON" : "OFF"
  } - (c) Clear - (q) Quit `;
  screen.render();
};

process.on("uncaughtException", (err) => {
  // Handle errors gracefully without crashing
  right.setContent(`{red-fg}Error: ${err.message}{/red-fg}`);
  stopSpinner();
  screen.render();
});

process.on("unhandledRejection", (err) => {
  // Handle promise rejections gracefully
  right.setContent(`{red-fg}Error: ${String(err)}{/red-fg}`);
  stopSpinner();
  screen.render();
});
