import { assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  type AudioBufferLike,
  type AudioContextLike,
  type AudioNodeLike,
  type BufferSourceLike,
  createAmbientNoise,
  type GainNodeLike,
  type NoiseMode,
} from './ambientNoise.ts';

class MockAudioBuffer implements AudioBufferLike {
  channelData: Float32Array;
  constructor(length: number) {
    this.channelData = new Float32Array(length);
  }
  getChannelData(_channel: number): Float32Array {
    return this.channelData;
  }
}

class MockGainNode implements GainNodeLike {
  gain = { value: 1 };
  connect(_dest: AudioNodeLike): void {}
  disconnect() {}
}

class MockBufferSource implements BufferSourceLike {
  buffer: AudioBufferLike | null = null;
  loop = false;
  started = false;
  stopped = false;
  connect(_dest: GainNodeLike) {}
  start() {
    this.started = true;
  }
  stop() {
    if (this.stopped) throw new Error('Already stopped');
    this.stopped = true;
  }
  disconnect() {}
}

class MockAudioContext implements AudioContextLike {
  state: 'running' | 'suspended' | 'closed' = 'running';
  sampleRate = 44100;
  destination: AudioNodeLike = {
    connect: () => {},
    disconnect: () => {},
  };

  createBuffer(_channels: number, length: number, _rate: number): AudioBufferLike {
    return new MockAudioBuffer(length);
  }
  createGain(): GainNodeLike {
    return new MockGainNode();
  }
  createBufferSource(): BufferSourceLike {
    return new MockBufferSource();
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

type AudioContextConstructor = new () => AudioContextLike;

function installAudioContext(
  key: 'AudioContext' | 'webkitAudioContext',
  value: AudioContextConstructor | undefined,
): void {
  if (value) Object.defineProperty(globalThis, key, { configurable: true, value });
  else delete (globalThis as Record<string, unknown>)[key];
}

function captureAudioContexts(): {
  audio: unknown;
  webkit: unknown;
  restore: () => void;
} {
  const globals = globalThis as Record<string, unknown>;
  const audio = globals.AudioContext;
  const webkit = globals.webkitAudioContext;
  const asConstructor = (value: unknown): AudioContextConstructor | undefined =>
    typeof value === 'function' ? (value as AudioContextConstructor) : undefined;
  return {
    audio,
    webkit,
    restore: () => {
      installAudioContext('AudioContext', asConstructor(audio));
      installAudioContext('webkitAudioContext', asConstructor(webkit));
    },
  };
}

Deno.test('createAmbientNoise - unsupported Web Audio API throws', () => {
  const original = captureAudioContexts();

  try {
    installAudioContext('AudioContext', undefined);
    installAudioContext('webkitAudioContext', undefined);

    const noise = createAmbientNoise();
    assertThrows(() => noise.start('white'), Error, 'Web Audio API not supported');
  } finally {
    original.restore();
  }
});

Deno.test('createAmbientNoise - resumes suspended context and uses webkit fallback', () => {
  const original = captureAudioContexts();

  try {
    installAudioContext('AudioContext', undefined);
    const mockCtx = new MockAudioContext();
    mockCtx.state = 'suspended';
    let createdCtx: MockAudioContext | undefined;
    installAudioContext(
      'webkitAudioContext',
      class extends MockAudioContext {
        constructor() {
          super();
          Object.assign(this, mockCtx);
          createdCtx = this;
        }
      },
    );

    const noise = createAmbientNoise();
    noise.start('white');
    assertEquals(createdCtx?.state, 'running');
    noise.dispose();
  } finally {
    original.restore();
  }
});

Deno.test('createAmbientNoise - plays white, pink, brown, off noise modes and stops', () => {
  const original = captureAudioContexts();
  const mockCtx = new MockAudioContext();
  installAudioContext(
    'AudioContext',
    class extends MockAudioContext {
      constructor() {
        super();
        Object.assign(this, mockCtx);
      }
    },
  );

  try {
    const noise = createAmbientNoise();

    const modes: NoiseMode[] = ['white', 'pink', 'brown', 'off'];
    for (const mode of modes) {
      noise.start(mode);
    }

    noise.stop();
    noise.dispose();
  } finally {
    original.restore();
  }
});

Deno.test('createAmbientNoise - setVolume clamps between 0 and 1', () => {
  const original = captureAudioContexts();
  const mockCtx = new MockAudioContext();
  installAudioContext(
    'AudioContext',
    class extends MockAudioContext {
      constructor() {
        super();
        Object.assign(this, mockCtx);
      }
    },
  );

  try {
    const noise = createAmbientNoise();
    noise.start('white');

    noise.setVolume(1.5);
    noise.setVolume(-0.5);
    noise.setVolume(0.5);

    noise.dispose();
  } finally {
    original.restore();
  }
});

Deno.test('createAmbientNoise - stop catches and ignores source.stop error', () => {
  const original = captureAudioContexts();
  const mockCtx = new MockAudioContext();
  installAudioContext(
    'AudioContext',
    class extends MockAudioContext {
      constructor() {
        super();
        Object.assign(this, mockCtx);
      }
    },
  );

  try {
    const noise = createAmbientNoise();
    noise.start('white');
    // Force stop to throw on subsequent stop
    const origCreateSource = mockCtx.createBufferSource;
    mockCtx.createBufferSource = function () {
      const src = origCreateSource.call(mockCtx) as MockBufferSource;
      src.stop = () => {
        throw new Error('Already stopped error');
      };
      return src;
    };
    noise.start('pink');
    noise.stop();
    noise.dispose();
  } finally {
    original.restore();
  }
});
