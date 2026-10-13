await external_set_scene_settings({
  size: { width: 400, height: 400 },
  framerate: 30,
  duration: 2.4,
});
await external_rename_node({ node_id: 'ANnlW_WpZH', name: 'StudySprint · Charge flow' });
const lime = { r: 204, g: 255, b: 0 };
const ink = { r: 106, g: 133, b: 0 };
const layers = [];
for (let i = 0; i < 2; i++) {
  const r = await external_create_shape({
    shape: 'ellipse',
    name: 'charge-ring-' + i,
    size: { width: 170 + i * 30, height: 170 + i * 30 },
    position: { x: 200, y: 200 },
    fill_color: 'none',
    stroke: { color: i === 0 ? lime : ink, width: i === 0 ? 3 : 1.5 },
    opacity: 0,
  });
  layers.push({ name: 'charge-ring-' + i, result: r });
}
for (let i = 0; i < 8; i++) {
  const angle = i * Math.PI / 4;
  const r = await external_create_shape({
    shape: 'rectangle',
    name: 'charge-packet-' + i,
    size: { width: i % 2 ? 15 : 24, height: 4 },
    roundness: 2,
    position: { x: 200 + 160 * Math.cos(angle), y: 200 + 160 * Math.sin(angle) },
    rotation: i * 45,
    fill_color: lime,
    stroke: { color: ink, width: 1 },
    opacity: 0,
  });
  layers.push({ name: 'charge-packet-' + i, result: r });
}
return layers;
