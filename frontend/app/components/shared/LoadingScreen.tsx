import { LogoMark } from './Logo';

export function LoadingScreen() {
  return (
    <main className='ss-loading-screen' role='status' aria-live='polite'>
      <div className='ss-loading-content'>
        <LogoMark size={48} />
        <span className='ss-loading-name'>StudySprint</span>
        <span className='ss-loading-track' aria-hidden='true'>
          <span className='ss-loading-charge' />
        </span>
        <span className='ss-loading-label'>Loading your study space…</span>
      </div>
    </main>
  );
}
