import { HF_TIMELINE, LIME } from "./timeline.js";
import { LIT_ORDER, buildGridSvg } from "./grid-data.js";
import { buildBatterySvg, chargeToFillColor } from "./battery-svg.js";
import { mountBeatText } from "./beat-text.js";

const T = HF_TIMELINE;
const TOTAL_LIT = LIT_ORDER.length;

function interpolateClamped(time, points) {
  if (time <= points[0][0]) return points[0][1];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [start, startValue] = points[index];
    const [end, endValue] = points[index + 1];
    if (time <= end) return startValue + ((time - start) / (end - start)) * (endValue - startValue);
  }
  return points.at(-1)[1];
}

function litCountAt(time) {
  return Math.round(interpolateClamped(time, [
    [0, 0],
    [T.B1.from + T.B1.duration, 1],
    [T.B2.from + T.B2.duration, 8],
    [T.B3.from + T.B3.duration, 32],
    [T.B4.from + T.B4.duration, TOTAL_LIT],
  ]));
}

// Follows the app's charge model: one full session from empty is +20 - 8 = 12%,
// a couple of missed days drain that back to empty, and steady study refills it.
function chargeAt(time) {
  return Math.round(interpolateClamped(time, [
    [0, 0],
    [T.B1.from + T.B1.duration * 0.5, 0],
    [T.B1.from + T.B1.duration, 12],
    [T.B2.from + T.B2.duration * 0.55, 0],
    [T.B3.from, 0],
    [T.B3.from + T.B3.duration, 44],
    [T.B4.from + T.B4.duration, 100],
  ]));
}

function stat(value, label) {
  return `<div style="text-align:center"><div style="font-family:Inter,sans-serif;font-weight:800;font-size:64px;color:${LIME}">${value}</div><div style="font-family:Inter,sans-serif;font-weight:500;font-size:22px;color:rgba(255,255,255,.55);letter-spacing:1px;text-transform:uppercase">${label}</div></div>`;
}

function subjectDonutSvg() {
  const radius = 210;
  const circumference = 2 * Math.PI * radius;
  const shares = [0.35, 0.25, 0.18, 0.12, 0.1];
  const colors = ["#ccff00", "#8fd6ff", "#ff9ecb", "#ffd166", "#9d8dff"];
  let offset = 0;
  const arcs = shares.map((share, index) => {
    const length = share * circumference;
    const arc = `<circle r="${radius}" fill="none" stroke="${colors[index]}" stroke-width="18" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset * circumference}" stroke-linecap="round" opacity=".9"/>`;
    offset += share;
    return arc;
  }).join("");
  return `<svg width="520" height="520" style="position:absolute"><g transform="translate(260 260) rotate(-90)">${arcs}</g></svg>`;
}

export function buildComposition(layer, audio, timeline) {
  const stage = layer.parentElement;
  layer.innerHTML = "";
  stage.style.backgroundImage = "linear-gradient(112deg, #0a0a0a 0%, #0a0a0a 35%, #1a240d 50%, #0a0a0a 65%, #0a0a0a 100%)";
  stage.style.backgroundSize = "240% 100%";
  stage.style.backgroundPosition = "0% 0%";

  const phosphorTexture = document.createElement("div");
  phosphorTexture.style.cssText = "position:absolute;inset:-80px;z-index:0;pointer-events:none;opacity:.1;mix-blend-mode:screen;background-image:repeating-linear-gradient(118deg,transparent 0 8px,rgba(204,255,0,.8) 8px 11px,transparent 11px 22px);will-change:transform";
  layer.appendChild(phosphorTexture);

  const grid = document.createElement("div");
  grid.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center";
  const gridContent = document.createElement("div");
  grid.appendChild(gridContent);
  layer.appendChild(grid);

  const status = document.createElement("div");
  status.style.cssText = "position:absolute;top:230px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:0;font-family:Inter,sans-serif;font-weight:800;font-size:96px";
  const statusBolt = document.createElement("div");
  const statusText = document.createElement("div");
  status.append(statusBolt, statusText);
  layer.appendChild(status);

  const meter = document.createElement("div");
  meter.style.cssText = "position:absolute;bottom:20px;left:0;right:0;display:none;justify-content:center";
  layer.appendChild(meter);

  const state = { time: 0 };
  const fourthEnd = T.B4.from + T.B4.duration;
  timeline.to(state, {
    time: T.TOTAL_SECONDS,
    duration: T.TOTAL_SECONDS,
    ease: "none",
    onUpdate: () => {
      const time = state.time;
      stage.style.backgroundPosition = `${(time / T.TOTAL_SECONDS) * 100}% 0%`;
      phosphorTexture.style.transform = `translateX(${time * 96}px)`;
      const inGarden = time >= T.B5.from;
      grid.style.display = time < T.B6.from ? "flex" : "none";
      gridContent.innerHTML = buildGridSvg(litCountAt(time));
      gridContent.style.opacity = inGarden ? interpolateClamped(time, [[fourthEnd, 1], [T.B5.from + T.B5.duration * 0.4, 0.22]]) : 1;
      const creep = 1 + Math.min(time, T.B5.from) * 0.0015;
      gridContent.style.transform = `scale(${interpolateClamped(time, [[T.B4.from, 1], [fourthEnd, 0.72]]) * creep}) translateY(${interpolateClamped(time, [[T.B4.from, 0], [fourthEnd, -260]])}px)`;

      const charge = chargeAt(time);
      status.style.display = time < T.B4.from ? "flex" : "none";
      statusBolt.innerHTML = buildBatterySvg(charge, { size: 200, time, id: "status" });
      statusText.textContent = `${charge}% charged`;
      statusText.style.color = charge === 0 ? "rgba(255,255,255,.35)" : chargeToFillColor(charge);

      const inMeter = time >= T.B4.from && time < T.B5.from;
      meter.style.display = inMeter ? "flex" : "none";
      if (inMeter) meter.innerHTML = buildBatterySvg(charge, { size: 340, time, id: "meter" });
      if (time >= T.B5.from && time < T.B6.from) gardenBolt.innerHTML = buildBatterySvg(100, { size: 260, time, id: "garden" });
      if (time >= T.B6.from) endBolt.innerHTML = buildBatterySvg(100, { size: 260, time, id: "end" });
    },
  }, 0);

  const textLayer = document.createElement("div");
  textLayer.style.cssText = "position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:120px";
  layer.appendChild(textLayer);
  timeline.add(mountBeatText(textLayer, "One session.", { startOffset: T.B1.from, beatDuration: T.B1.duration }), 0);
  timeline.add(mountBeatText(textLayer, "Most people stop here.", { startOffset: T.B2.from + 40 / 30, beatDuration: T.B2.duration - 40 / 30 }), 0);
  timeline.add(mountBeatText(textLayer, "The only job is making day two easier.", { startOffset: T.B3.from + 1, beatDuration: T.B3.duration - 1 }), 0);

  const counter = document.createElement("div");
  counter.style.cssText = "position:absolute;top:560px;left:0;right:0;display:none;justify-content:center;gap:72px";
  layer.appendChild(counter);
  const counterState = { progress: 0 };
  timeline.to(counterState, { progress: 1, duration: T.B4.duration - 80 / 30, ease: "none", onUpdate: () => {
    counter.innerHTML = [stat(`${Math.round(T.REAL_STATS.totalHours * counterState.progress)}h`, "studied"), stat(`${Math.round(T.REAL_STATS.totalSessions * counterState.progress)}`, "sessions"), stat(`${T.REAL_STATS.daysSinceEmpty}d`, "since empty")].join("");
  } }, T.B4.from + 40 / 30);
  timeline.set(counter, { display: "flex" }, T.B4.from).set(counter, { display: "none" }, T.B5.from);

  const garden = document.createElement("div");
  garden.style.cssText = "position:absolute;inset:0;display:none;align-items:center;justify-content:center";
  garden.innerHTML = `${subjectDonutSvg()}<div></div><div style="position:absolute;bottom:140px"></div>`;
  const gardenBolt = garden.children[1];
  layer.appendChild(garden);
  timeline.set(garden, { display: "flex" }, T.B5.from).set(garden, { display: "none" }, T.B6.from);
  timeline.add(mountBeatText(garden.lastElementChild, "Every subject. Every hour you actually studied.", { size: 38, startOffset: T.B5.from, beatDuration: T.B5.duration }), 0);

  const invitation = document.createElement("div");
  invitation.style.cssText = "position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;opacity:0";
  invitation.innerHTML = `<div><div></div><div style="margin-top:24px;font-family:Inter,sans-serif;font-weight:800;font-size:76px;color:white;letter-spacing:-1px">Focus in. <span style="color:${LIME}">Charge up.</span></div><div style="margin-top:18px;font-family:Inter,sans-serif;font-weight:500;font-size:26px;color:rgba(255,255,255,.7)">getstudysprint.vercel.app</div></div>`;
  const endBolt = invitation.firstElementChild.firstElementChild;
  layer.appendChild(invitation);
  timeline.set(invitation, { display: "flex" }, T.B6.from).to(invitation, { opacity: 1, duration: 1 }, T.B6.from).to(invitation, { scale: 1.012, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut" }, T.B6.from);

  audio.volume = 0;
  const volume = { value: 0 };
  const setVolume = () => { audio.volume = volume.value; };
  timeline.to(volume, { value: 0.5, duration: 1, ease: "none", onUpdate: setVolume }, 0)
    .to(volume, { value: 0.62, duration: 40 / 30, ease: "none", onUpdate: setVolume }, T.B4.from - 1)
    .to(volume, { value: 0, duration: 2, ease: "none", onUpdate: setVolume }, T.TOTAL_SECONDS - 2);

  return timeline;
}
