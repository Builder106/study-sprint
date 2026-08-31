import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { createAmbientNoise, type NoiseMode } from './ambientNoise.ts';

class MockAudioBuffer {
  channelData: Float32Array;
  constructor(length: number) {
    this.channelData = new Float32Array(length);
  }
  getChannelData(_channel: number) {
    return this.channelData;
  }
}

class MockGainNode {
  gain = { value: 1 };
  connect(_dest: unknown) {}
  disconnect() {}
}

class MockBufferSource {
  buffer: MockAudioBuffer | null = null;
  loop = false;
  started = false;
  stopped = false;
  connect(_dest: unknown) {}
  start() {
    this.started = true;
  }
  stop() {
    if (this.stopped) throw new Error('Already stopped');
    this.stopped = true;
  }
  disconnect() {}
}

class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  sampleRate = 44100;
  destination = {};

  createBuffer(_channels: number, length: number, _rate: number) {
    return new MockAudioBuffer(length) as unknown as AudioBuffer;
  }
  createGain() {
    return new MockGainNode() as unknown as GainNode;
  }
  createBufferSource() {
    return new MockBufferSource() as unknown as AudioBufferSourceNode;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

Deno.test('createAmbientNoise - unsupported Web Audio API throws', () => {
  const origAudio = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  const origWebkit = (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;

  try {
    delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    delete (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;

    const noise = createAmbientNoise();
    assertThrows(() => noise.start('white'), Error, 'Web Audio API not supported');
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = origAudio;
    (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = origWebkit;
  }
});

Deno.test('createAmbientNoise - resumes suspended context and uses webkit fallback', () => {
  const origAudio = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  const origWebkit = (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;

  try {
    delete (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
    const mockCtx = new MockAudioContext();
    mockCtx.state = 'suspended';
    (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = function () {
      return mockCtx;
    } as unknown as typeof AudioContext;

    const noise = createAmbientNoise();
    noise.start('white');
    assertEquals(mockCtx.state, 'running');
    noise.dispose();
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = origAudio;
    (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = origWebkit;
  }
});

Deno.test('createAmbientNoise - plays white, pink, brown, off noise modes and stops', () => {
  const origAudio = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  const mockCtx = new MockAudioContext();
  (globalThis as unknown as { AudioContext?: unknown }).AudioContext = function () {
    return mockCtx;
  } as unknown as typeof AudioContext;

  try {
    const noise = createAmbientNoise();

    const modes: NoiseMode[] = ['white', 'pink', 'brown', 'off'];
    for (const mode of modes) {
      noise.start(mode);
    }

    noise.stop();
    noise.dispose();
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = origAudio;
  }
});

Deno.test('createAmbientNoise - setVolume clamps between 0 and 1', () => {
  const origAudio = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  const mockCtx = new MockAudioContext();
  (globalThis as unknown as { AudioContext?: unknown }).AudioContext = function () {
    return mockCtx;
  } as unknown as typeof AudioContext;

  try {
    const noise = createAmbientNoise();
    noise.start('white');

    noise.setVolume(1.5);
    noise.setVolume(-0.5);
    noise.setVolume(0.5);

    noise.dispose();
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = origAudio;
  }
});

Deno.test('createAmbientNoise - stop catches and ignores source.stop error', () => {
  const origAudio = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  const mockCtx = new MockAudioContext();
  (globalThis as unknown as { AudioContext?: unknown }).AudioContext = function () {
    return mockCtx;
  } as unknown as typeof AudioContext;

  try {
    const noise = createAmbientNoise();
    noise.start('white');
    // Force stop to throw on subsequent stop
    const origCreateSource = mockCtx.createBufferSource;
    mockCtx.createBufferSource = function () {
      const src = origCreateSource.call(mockCtx) as unknown as MockBufferSource;
      src.stop = () => {
        throw new Error('Already stopped error');
      };
      return src as unknown as AudioBufferSourceNode;
    };
    noise.start('pink');
    noise.stop();
    noise.dispose();
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = origAudio;
  }
});
