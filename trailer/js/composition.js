import { SCENE } from "./scene-data.js";
import { mulberry32, hash } from "./arcs.js";
import { drawArcBetween, drawElectrics, drawScreenSparks, powerOn, tipOnScreen } from "./fx.js";
import { frameAt } from "./project.js";

const T = SCENE.times;
const WIPE = { arc: [T.end + 0.85, T.end + 1.05], start: T.end + 1.0, end: T.end + 1.9 };
const clamp01 = (u) => Math.max(0, Math.min(1, u));

function element(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  parent.appendChild(node);
  return node;
}

// Offset of a node inside the stage, unaffected by preview scaling.
function offsetIn(node, stage) {
  let x = 0;
  let y = 0;
  for (let current = node; current && current !== stage; current = current.offsetParent) {
    x += current.offsetLeft;
    y += current.offsetTop;
  }
  return { x, y, width: node.offsetWidth, height: node.offsetHeight };
}

function spike(time, at, peak, decay) {
  return time >= at ? peak * Math.exp(-(time - at) / decay) : 0;
}

function flashAt(time) {
  let value = spike(time, T.reconnect, 0.5, 0.22) + spike(time, T.crash, 0.95, 0.5);
  for (const day of T.days) value += spike(time, day, 0.07, 0.12);
  return Math.min(1, value);
}

// The picture browns out while the charge drains.
function brownoutAt(time) {
  if (time < T.switchOpen || time >= T.stall) return 0;
  const u = (time - T.switchOpen) / (T.stall - T.switchOpen);
  const flick = mulberry32(hash(frameAt(time), 77))();
  return Math.min(0.85, u * 0.35 + (flick > 0.7 ? 0.35 : 0));
}

function captionOpacity(caption, time) {
  const on = powerOn(time - caption.start, caption.start * 10);
  const off = clamp01((caption.end - time) / 0.35);
  return time > caption.end ? 0 : on * off;
}

function makeGrain() {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 256;
  const context = tile.getContext("2d");
  const image = context.createImageData(256, 256);
  const random = mulberry32(4242);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.floor(random() * 255);
    image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return tile;
}

export function buildComposition(stage, timeline) {
  const overlay = stage.querySelector("#overlay");
  const fx = element("canvas", "layer fx", overlay);
  fx.width = SCENE.width;
  fx.height = SCENE.height;
  const fxContext = fx.getContext("2d");
  const bloom = document.createElement("canvas");
  bloom.width = SCENE.width / 2;
  bloom.height = SCENE.height / 2;
  const bloomContext = bloom.getContext("2d");
  // Two blurred copies of the electrical layer, added back on top: the glow.
  const applyBloom = () => {
    for (const [radius, gain] of [[4, 0.8], [16, 0.6]]) {
      bloomContext.globalCompositeOperation = "source-over";
      bloomContext.filter = "none";
      bloomContext.clearRect(0, 0, bloom.width, bloom.height);
      bloomContext.filter = `blur(${radius}px)`;
      bloomContext.drawImage(fx, 0, 0, bloom.width, bloom.height);
      fxContext.setTransform(1, 0, 0, 1, 0, 0);
      fxContext.globalCompositeOperation = "lighter";
      fxContext.globalAlpha = gain;
      fxContext.drawImage(bloom, 0, 0, SCENE.width, SCENE.height);
      fxContext.globalAlpha = 1;
    }
  };
  const brownout = element("div", "layer brownout", overlay);
  const flash = element("div", "layer flash", overlay);
  element("div", "layer vignette", overlay);
  const grain = element("canvas", "layer grain", overlay);
  grain.width = SCENE.width;
  grain.height = SCENE.height;
  const grainContext = grain.getContext("2d");
  const grainPattern = grainContext.createPattern(makeGrain(), "repeat");

  const captions = element("div", "captions", overlay);
  const captionNodes = SCENE.captions.map((caption) => element("p", "caption", captions, caption.text));

  const end = element("div", "endcard", overlay);
  const wordmark = element("div", "wordmark", end, "StudySprint");
  const tagline = element("div", "tagline", end);
  element("span", "focus", tagline, "Focus in. ");
  const charge = element("span", "charge", tagline);
  element("span", "charge-off", charge, "Charge up.");
  const chargeOn = element("span", "charge-on", charge, "Charge up.");
  const head = element("i", "wipe-head", charge);
  const url = element("div", "url", end, "getstudysprint.vercel.app");

  const render = (time) => {
    drawElectrics(fxContext, time);
    brownout.style.opacity = brownoutAt(time).toFixed(3);
    flash.style.opacity = flashAt(time).toFixed(3);

    const frame = frameAt(time);
    grainContext.setTransform(1, 0, 0, 1, 0, 0);
    grainContext.clearRect(0, 0, grain.width, grain.height);
    const shift = mulberry32(hash(frame, 5));
    grainContext.translate(-Math.floor(shift() * 256), -Math.floor(shift() * 256));
    grainContext.fillStyle = grainPattern;
    grainContext.fillRect(0, 0, grain.width + 256, grain.height + 256);

    SCENE.captions.forEach((caption, index) => {
      const opacity = captionOpacity(caption, time);
      captionNodes[index].style.opacity = opacity.toFixed(3);
      captionNodes[index].style.visibility = opacity > 0 ? "visible" : "hidden";
    });

    const inEnd = time >= T.end;
    end.style.visibility = inEnd ? "visible" : "hidden";
    if (!inEnd) return;
    wordmark.style.opacity = powerOn(time - (T.end + 0.3), 11).toFixed(3);
    tagline.style.opacity = powerOn(time - (T.end + 0.6), 12).toFixed(3);
    url.style.opacity = powerOn(time - (WIPE.end + 0.35), 13).toFixed(3);
    const progress = clamp01((time - WIPE.start) / (WIPE.end - WIPE.start));
    const eased = 1 - (1 - progress) ** 2;
    chargeOn.style.clipPath = `inset(0 ${((1 - eased) * 100).toFixed(2)}% 0 0)`;
    head.style.left = `${(eased * 100).toFixed(2)}%`;
    head.style.opacity = progress > 0 && progress < 1 ? "1" : "0";
    chargeOn.classList.toggle("lit", progress >= 1);

    // The bolt powers the tagline: an arc from its tip, a wipe, then sparks.
    const box = offsetIn(charge, stage);
    fxContext.setTransform(1, 0, 0, 1, 0, 0);
    fxContext.globalCompositeOperation = "lighter";
    if (time >= WIPE.arc[0] && time <= WIPE.end) {
      const tip = tipOnScreen(time);
      const target = { x: box.x + box.width * eased, y: box.y + box.height * 0.45 };
      const fade = time < WIPE.arc[1] ? 1 : 0.55;
      drawArcBetween(fxContext, { x: tip.x, y: tip.y }, target, hash(Math.floor(frame / 2), 31), fade);
    }
    drawScreenSparks(fxContext, { x: box.x + box.width, y: box.y + box.height * 0.5 }, time - WIPE.end, 909);
  };
  const renderWithBloom = (time) => {
    render(time);
    applyBloom();
  };

  const state = { time: 0 };
  timeline.to(state, {
    time: SCENE.duration,
    duration: SCENE.duration,
    ease: "none",
    onUpdate: () => renderWithBloom(state.time),
  }, 0);
  renderWithBloom(0);
  return timeline;
}
