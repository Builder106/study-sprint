const layers = [{
  'name': 'charge-ring-0',
  'result': {
    'layer_id': 'J8BblA9B-e',
    'name': 'charge-ring-0',
    'type': 'Layer',
    'shape': 'ellipse',
  },
}, {
  'name': 'charge-ring-1',
  'result': {
    'layer_id': 'dHwzHqvHER',
    'name': 'charge-ring-1',
    'type': 'Layer',
    'shape': 'ellipse',
  },
}, {
  'name': 'charge-packet-0',
  'result': {
    'layer_id': '2uk3qs4U0Q',
    'name': 'charge-packet-0',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-1',
  'result': {
    'layer_id': 'iZr2WWcd-W',
    'name': 'charge-packet-1',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-2',
  'result': {
    'layer_id': 'Zsmrl7Snqf',
    'name': 'charge-packet-2',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-3',
  'result': {
    'layer_id': 'eGvreOvtuW',
    'name': 'charge-packet-3',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-4',
  'result': {
    'layer_id': 'ixqHD2kier',
    'name': 'charge-packet-4',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-5',
  'result': {
    'layer_id': 'bAy3Pl1t1H',
    'name': 'charge-packet-5',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-6',
  'result': {
    'layer_id': 'KZOh0ecAAT',
    'name': 'charge-packet-6',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}, {
  'name': 'charge-packet-7',
  'result': {
    'layer_id': 'e3AqlsZrRC',
    'name': 'charge-packet-7',
    'type': 'Layer',
    'shape': 'rectangle',
  },
}];
const ease = { type: 'PRESET', name: 'gentle-out' };
for (let i = 0; i < layers.length; i++) {
  const id = layers[i].result.layer_id;
  if (i < 2) {
    const s = 18 + i * 5;
    await external_apply_keyframes({
      layer_id: id,
      property: 'opacity',
      keyframes: [{ frame: 0, value: 0 }, { frame: s, value: 0 }, { frame: s + 5, value: 85 }, {
        frame: 48 + i * 6,
        value: 45,
      }, { frame: 66, value: 0 }],
    });
    await external_apply_keyframes({
      layer_id: id,
      property: 'scale',
      keyframes: [{ frame: s, value: { x: 64, y: 64 }, easing: ease }, {
        frame: 60,
        value: { x: 145, y: 145 },
      }],
    });
  } else {
    const n = i - 2, a = n * Math.PI / 4, s = (n % 4) * 3;
    await external_apply_keyframes({
      layer_id: id,
      property: 'position',
      keyframes: [{
        frame: s,
        value: { x: 200 + 160 * Math.cos(a), y: 200 + 160 * Math.sin(a) },
        easing: { type: 'PRESET', name: 'ease-in' },
      }, { frame: s + 24, value: { x: 200 + 55 * Math.cos(a), y: 200 + 55 * Math.sin(a) } }],
    });
    await external_apply_keyframes({
      layer_id: id,
      property: 'opacity',
      keyframes: [{ frame: 0, value: 0 }, { frame: s + 4, value: 100 }, {
        frame: s + 18,
        value: 100,
      }, { frame: s + 25, value: 0 }],
    });
  }
}
await external_set_current_frame({ frame: 24 });
return { animated: layers.length, representative_frame: 24 };
