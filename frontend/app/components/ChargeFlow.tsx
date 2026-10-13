import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

export function ChargeFlow() {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let disposed = false;
    let animation: AnimationItem | undefined;

    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (disposed || !container.current) return;
      animation = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: '/landing/charge-flow.json',
      });
      animation.addEventListener('DOMLoaded', () => setState('playing'));
      animation.addEventListener('complete', () => setState('complete'));
      animation.addEventListener('data_failed', () => setState('unavailable'));
    }).catch(() => {
      if (!disposed) setState('unavailable');
    });

    return () => {
      disposed = true;
      animation?.destroy();
    };
  }, []);

  return (
    <div
      ref={container}
      className='ss-charge-flow'
      data-playback={state}
      aria-hidden='true'
    />
  );
}
