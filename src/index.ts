import blessed from "blessed";
import { genAI } from "./llm";

const ws = new WebSocket("ws://localhost:3000/_next/webpack-hmr");

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
let logs = "";
let inteli = "";
let ai = true;

export function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, "");
}

const screen = blessed.screen({
  smartCSR: true,
  title: "gaze",
});

const left = blessed.box({
  parent: screen,
  left: 0,
  top: 0,
  width: ai ? "50%" : "100%",
  height: "100%-1",
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
  top: 0,
  width: "50%",
  height: "100%-1",
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
  content: ` {green-fg}●{/green-fg} PORT:3000 - (a) Toggle Intelligence: ${
    ai ? "ON" : "OFF"
  } - (c) Clear Logs `,
  tags: true,
});

screen.key(["q", "C-c"], () => process.exit(0));
screen.key(["a"], () => {
  ai = !ai;
  if (ai) {
    right.show();
    left.width = "50%";
  } else {
    right.hide();
    left.width = "100%";
  }
  status.content = ` {green-fg}●{/green-fg} PORT:3000 - (a) Toggle Intelligence: ${
    ai ? "ON" : "OFF"
  } - (c) Clear Logs `;
  screen.render();
});
screen.key(["c"], () => {
  logs = "";
  left.setContent(logs);
  screen.render();
});

screen.render();

ws.onopen = () => {
  status.content = ` {green-fg}●{/green-fg} PORT:3000 - Connected - (a) Toggle Intelligence: ${
    ai ? "ON" : "OFF"
  } - (c) Clear Logs `;
  screen.render();
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.errors != undefined && data.errors.length > 0) {
    for (const err of data.errors) {
      const timestamp = new Date().toLocaleTimeString();
      logs =
        `{red-fg}[${timestamp}] ERROR: ${stripAnsi(err.message)}{/red-fg}\n\n` +
        logs;
      if (ai) {
        try {
          const aiResult = await genAI(stripAnsi(err.message));
          inteli = "\n" + aiResult;
          right.setContent(inteli);
        } catch (e) {
          inteli += "AI Error: " + String(e) + "\n";
          right.setContent(inteli);
        }
      }
    }
    left.setContent(logs);
    screen.render();
  }

  if (data.warnings != undefined && data.warnings.length > 0) {
    data.warnings.forEach((err: Error) => {
      const timestamp = new Date().toLocaleTimeString();
      logs += `{yellow-fg}[${timestamp}] WARN: ${stripAnsi(
        err.message
      )}{/yellow-fg}\n`;
    });
    left.setContent(logs);
    screen.render();
  }
};

ws.onerror = (err) => {
  status.content = ` {red-fg}●{/red-fg} PORT:3000 - Connection Error - (a) Toggle Intelligence: ${
    ai ? "ON" : "OFF"
  } - (c) Clear Logs `;
  screen.render();
};

ws.onclose = () => {
  status.content = ` {red-fg}●{/red-fg} PORT:3000 - Disconnected - (a) Toggle Intelligence: ${
    ai ? "ON" : "OFF"
  } - (c) Clear Logs `;
  screen.render();
};
