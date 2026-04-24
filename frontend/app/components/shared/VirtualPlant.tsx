export type PlantStage =
  | "seed"
  | "sprout"
  | "sapling"
  | "young_tree"
  | "mature_tree"
  | "blooming";

interface Props {
  stage: PlantStage;
  size?: number;
  className?: string;
}

const GROUND = (
  <ellipse cx="60" cy="102" rx="52" ry="6" fill="currentColor" opacity="0.15" />
);

export function VirtualPlant({ stage, size = 120, className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Your study plant, ${stage.replace("_", " ")}`}
    >
      {GROUND}
      {stage === "seed" && <Seed />}
      {stage === "sprout" && <Sprout />}
      {stage === "sapling" && <Sapling />}
      {stage === "young_tree" && <YoungTree />}
      {stage === "mature_tree" && <MatureTree />}
      {stage === "blooming" && <BloomingTree />}
    </svg>
  );
}

function Seed() {
  return (
    <>
      <path
        d="M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z"
        fill="#8b5a3c"
      />
      <ellipse cx="60" cy="98" rx="6" ry="4" fill="#5a3a26" />
    </>
  );
}

function Sprout() {
  return (
    <>
      <path
        d="M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z"
        fill="#8b5a3c"
      />
      <line x1="60" y1="94" x2="60" y2="80" stroke="#87a635" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 82 Q52 78 50 70 Q58 72 60 82" fill="#ccff00" />
      <path d="M60 84 Q68 80 70 72 Q62 74 60 84" fill="#b3e600" />
    </>
  );
}

function Sapling() {
  return (
    <>
      <path d="M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z" fill="#8b5a3c" />
      <line x1="60" y1="94" x2="60" y2="60" stroke="#87a635" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 80 Q48 74 44 60 Q58 64 60 80" fill="#ccff00" />
      <path d="M60 70 Q72 64 76 50 Q62 54 60 70" fill="#b3e600" />
      <path d="M60 62 Q52 56 50 44 Q58 48 60 62" fill="#ccff00" opacity="0.9" />
    </>
  );
}

function YoungTree() {
  return (
    <>
      <path d="M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z" fill="#8b5a3c" />
      <path d="M57 96 L57 54 L63 54 L63 96 Z" fill="#8b5a3c" />
      <circle cx="60" cy="42" r="24" fill="#ccff00" />
      <circle cx="46" cy="50" r="12" fill="#b3e600" />
      <circle cx="74" cy="50" r="12" fill="#b3e600" />
    </>
  );
}

function MatureTree() {
  return (
    <>
      <path d="M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z" fill="#8b5a3c" />
      <path d="M55 96 L55 48 L65 48 L65 96 Z" fill="#8b5a3c" />
      <path d="M60 72 L50 80 L50 78 L58 68 Z" fill="#8b5a3c" />
      <path d="M60 72 L70 80 L70 78 L62 68 Z" fill="#8b5a3c" />
      <circle cx="60" cy="36" r="28" fill="#ccff00" />
      <circle cx="40" cy="48" r="16" fill="#b3e600" />
      <circle cx="80" cy="48" r="16" fill="#b3e600" />
      <circle cx="60" cy="20" r="14" fill="#e5ff4d" />
    </>
  );
}

function BloomingTree() {
  return (
    <>
      <path d="M44 100 Q60 94 76 100 Q76 103 60 104 Q44 103 44 100 Z" fill="#8b5a3c" />
      <path d="M55 96 L55 48 L65 48 L65 96 Z" fill="#8b5a3c" />
      <path d="M60 72 L48 80 L48 78 L58 68 Z" fill="#8b5a3c" />
      <path d="M60 72 L72 80 L72 78 L62 68 Z" fill="#8b5a3c" />
      <circle cx="60" cy="34" r="30" fill="#ccff00" />
      <circle cx="36" cy="48" r="18" fill="#b3e600" />
      <circle cx="84" cy="48" r="18" fill="#b3e600" />
      <circle cx="60" cy="16" r="16" fill="#e5ff4d" />
      {/* Blossoms */}
      <circle cx="42" cy="38" r="3" fill="#fff" />
      <circle cx="78" cy="34" r="3" fill="#fff" />
      <circle cx="60" cy="26" r="2.5" fill="#fff" />
      <circle cx="50" cy="52" r="2.5" fill="#fff" />
      <circle cx="70" cy="56" r="3" fill="#fff" />
      <circle cx="30" cy="58" r="2.5" fill="#fff" />
      <circle cx="90" cy="56" r="2.5" fill="#fff" />
    </>
  );
}
