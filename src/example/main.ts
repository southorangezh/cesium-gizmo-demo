import { UniversalManipulator } from "../lib/universalManipulator";
import type { TargetLike } from "../lib/types";

document.body.style.margin = "0";
const app = document.getElementById("app");
if (!app) {
  throw new Error("missing app container");
}

const container = document.createElement("div");
container.style.display = "flex";
container.style.height = "100vh";
container.style.fontFamily = "sans-serif";
app.appendChild(container);

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.flex = "1";
canvas.style.background = "#10141a";
container.appendChild(canvas);

const inspector = document.createElement("div");
inspector.style.width = "320px";
inspector.style.padding = "16px";
inspector.style.background = "#20242c";
inspector.style.color = "#e8ecf0";
inspector.innerHTML = `<h2>Universal Manipulator</h2><p>Use the simulated controls to explore pivot and orientation changes.</p>`;
container.appendChild(inspector);

const manipulator = new UniversalManipulator({
  orientation: "global",
  pivot: "origin",
  callbacks: {
    onBegin(mode, handle) {
      inspector.appendChild(makeLog(`Begin ${mode} via ${handle.id}`));
    },
    onUpdate(delta) {
      inspector.appendChild(
        makeLog(
          `ΔT=(${delta.translation.x.toFixed(3)}, ${delta.translation.y.toFixed(3)}, ${delta.translation.z.toFixed(3)}) ΔS=(${delta.scale.x.toFixed(
            3
          )}, ${delta.scale.y.toFixed(3)}, ${delta.scale.z.toFixed(3)})`
        )
      );
    },
    onEnd(committed) {
      inspector.appendChild(makeLog(`End drag committed=${committed}`));
    }
  }
});

const targets: TargetLike[] = [
  {
    id: "box",
    position: { x: 10, y: 0, z: 0 },
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1]
  },
  {
    id: "sphere",
    position: { x: -5, y: 3, z: 0 },
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -5, 3, 0, 1]
  }
];

manipulator.setTarget(targets);

function makeLog(message: string) {
  const entry = document.createElement("div");
  entry.textContent = `${new Date().toLocaleTimeString()} → ${message}`;
  entry.style.fontSize = "12px";
  entry.style.opacity = "0.8";
  inspector.appendChild(entry);
  inspector.scrollTop = inspector.scrollHeight;
  return entry;
}

canvas.addEventListener("pointerdown", (event) => {
  const pos = getWorldFromEvent(event);
  manipulator.pointerMove(pos, { x: event.clientX, y: event.clientY });
  manipulator.pointerDown(pos, { x: event.clientX, y: event.clientY });
});

canvas.addEventListener("pointermove", (event) => {
  const pos = getWorldFromEvent(event);
  manipulator.pointerMove(pos, { x: event.clientX, y: event.clientY });
});

canvas.addEventListener("pointerup", () => {
  manipulator.pointerUp(true);
});

function getWorldFromEvent(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 20;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 20;
  return { x, y, z: 0 };
}

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
