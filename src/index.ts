import blessed from "blessed";

const ws = new WebSocket("ws://localhost:3000/_next/webpack-hmr");

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
let logs = "";
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
  height: "100%",
  label: " Logs j - up k - down ",
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  border: "line",
});

const right = blessed.box({
  parent: screen,
  left: "50%",
  top: 0,
  width: "50%",
  height: "100%",
  label: " Intelligence j - up k - down ",
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  tags: true,
  border: "line",
});

const status = blessed.box({
  parent: screen,
  bottom: 0,
  height: 1,
  width: "100%",
  content: " PORT:3000 - (p) previous - (n) next - (a) Intelligence: ON ",
});

screen.key(["q", "C-c"], () => process.exit(0));

screen.render();

ws.onopen = () => {};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.errors != undefined && data.errors.length > 0) {
    data.errors.forEach((err: Error) => {
      logs = "\n" + stripAnsi(err.message) + logs;
    });
    left.setContent(logs);
    screen.render();
  }

  if (data.warnings != undefined && data.warnings.length > 0) {
    data.warnings.forEach((err: Error) => {
      logs = "\n" + stripAnsi(err.message) + logs;
    });
    left.setContent(logs);
    screen.render();
  }
};

ws.onerror = (err) => {
  console.error("WS error", err);
};

ws.onclose = () => {
  console.log("WS closed");
};
