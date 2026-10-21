export function wireDemo(id) {
  const timeline = window.__timelines[id];
  document.querySelectorAll(".shot").forEach((shot) => {
    const start = Number(shot.dataset.start);
    const duration = Number(shot.dataset.duration);
    timeline.fromTo(shot, { scale: 1 }, { scale: 1.045, duration, ease: "none", immediateRender: false }, start)
      .fromTo(shot, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none", immediateRender: false }, start)
      .to(shot, { opacity: 0, duration: 0.4, ease: "none" }, start + duration - 0.4);
  });
  document.querySelectorAll(".caption").forEach((caption) => {
    const start = Number(caption.dataset.start);
    const duration = Number(caption.dataset.duration);
    timeline.fromTo(caption, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, start)
      .to(caption, { opacity: 0, duration: 0.47, ease: "none" }, start + duration - 0.47);
  });
  const endcard = document.querySelector(".endcard");
  const endStart = Number(endcard.dataset.start);
  timeline.fromTo(endcard, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: .5, ease: "power3.out", immediateRender: false }, endStart)
    .to(endcard, { scale: 1.012, duration: 2, ease: "sine.inOut", repeat: -1, yoyo: true }, endStart + .5);
  const audio = document.querySelector("audio");
  const audioEnd = Number(audio.dataset.start) + Number(audio.dataset.duration);
  const volume = { value: 0 };
  const setVolume = () => { audio.volume = volume.value; };
  timeline.to(volume, { value: 1, duration: 1, ease: "none", onUpdate: setVolume }, 0)
    .to(volume, { value: 0, duration: 2, ease: "none", onUpdate: setVolume }, audioEnd - 2);
}
