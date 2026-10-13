import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { BatteryBolt } from './BatteryBolt';

const CHARGE_STEP = 5;
const CHARGE_INTERVAL_MS = 90;
const FULL_HOLD_MS = 420;
const START_PCT = 6;

export function LoadingScreen() {
  const reducedMotion = useReducedMotion();
  const [chargePct, setChargePct] = useState(() => (reducedMotion ? 100 : START_PCT));

  useEffect(() => {
    if (reducedMotion) return;

    let intervalId: ReturnType<typeof setInterval>;
    let holdId: ReturnType<typeof setTimeout>;

    function chargeUp() {
      intervalId = setInterval(() => {
        setChargePct((prev) => {
          const next = prev + CHARGE_STEP;
          if (next < 100) return next;
          clearInterval(intervalId);
          holdId = setTimeout(() => {
            setChargePct(START_PCT);
            chargeUp();
          }, FULL_HOLD_MS);
          return 100;
        });
      }, CHARGE_INTERVAL_MS);
    }

    chargeUp();
    return () => {
      clearInterval(intervalId);
      clearTimeout(holdId);
    };
  }, [reducedMotion]);

  return (
    <main className='ss-loading-screen' role='status' aria-live='polite'>
      <div className='ss-loading-content'>
        <span className='ss-loading-bolt' aria-hidden='true'>
          <BatteryBolt chargePct={chargePct} size={84} />
        </span>
        <span className='ss-loading-name'>StudySprint</span>
        <span className='ss-loading-label'>Loading your study space…</span>
      </div>
    </main>
  );
}
