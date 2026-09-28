import type { LandingEasterEggEffect } from '@/lib/landingEasterEggs';
import { shouldShowLandingEasterEggPreview } from '@/lib/landingEasterEggs';
import '../../styles/landing-easter-eggs.css';

type LandingEasterEggPreviewProps = {
  still: boolean;
  onPlay: (effects: LandingEasterEggEffect[]) => void;
};

const PREVIEW_EFFECTS: readonly LandingEasterEggEffect[] = [
  { type: 'week-circuit' },
  { type: 'full-charge' },
  { type: 'duration-sequence' },
  { type: 'overcharge' },
  { type: 'week-and-charge' },
];

const EFFECT_LABELS: Record<LandingEasterEggEffect['type'], string> = {
  'week-circuit': 'Complete the week',
  'full-charge': 'Full charge',
  'duration-sequence': '30–60–90 sequence',
  overcharge: 'Overcharge',
  'week-and-charge': 'Week + charge flourish',
};

export function LandingEasterEggPreview({ still, onPlay }: LandingEasterEggPreviewProps) {
  const enabled = typeof window !== 'undefined' && shouldShowLandingEasterEggPreview(
    window.location.search,
    import.meta.env.DEV,
    import.meta.env.VITE_LANDING_EASTER_EGG_PREVIEW,
  );

  if (!enabled) return null;

  return (
    <details className='ss-egg-preview' data-testid='egg-preview-panel'>
      <summary>Egg preview</summary>
      <div className='ss-egg-preview__content'>
        <p>Play the landing-page electrical effects.</p>
        {PREVIEW_EFFECTS.map((effect) => (
          <button
            key={effect.type}
            type='button'
            data-testid={`preview-${effect.type}`}
            disabled={still}
            onClick={() => onPlay([effect])}
          >
            {EFFECT_LABELS[effect.type]}
          </button>
        ))}
        <button
          type='button'
          className='ss-egg-preview__play-all'
          data-testid='preview-play-all'
          disabled={still}
          onClick={() => onPlay([...PREVIEW_EFFECTS])}
        >
          Play all
        </button>
        {still && (
          <p className='ss-egg-preview__motion-note' role='status'>
            Resume animations or disable reduced motion to preview.
          </p>
        )}
      </div>
    </details>
  );
}
