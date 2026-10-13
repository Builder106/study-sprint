export type LandingEasterEggEffect =
  | { type: 'week-circuit' }
  | { type: 'full-charge' }
  | { type: 'duration-sequence' }
  | { type: 'overcharge' }
  | { type: 'week-and-charge' };

export interface LandingEasterEggSnapshot {
  weekMinutes: readonly number[];
  charge: number;
}

export function shouldShowLandingEasterEggPreview(
  search: string,
  isDevelopment: boolean,
  previewEnabled: string | undefined,
): boolean {
  return new URLSearchParams(search).get('easter-eggs') === '1' &&
    (isDevelopment || previewEnabled === 'true');
}

const DURATION_SEQUENCE: readonly (30 | 60 | 90)[] = [30, 60, 90];
const DURATION_SEQUENCE_WINDOW_MS = 5_000;
const OVERCHARGE_ACTIVATION_COUNT = 10;

function hasFullWeek(minutes: readonly number[]): boolean {
  return minutes.length === 7 && minutes.every((dayMinutes) => dayMinutes > 0);
}

function hasFullCharge(charge: number): boolean {
  return Number.isFinite(charge) && charge >= 100;
}

export class LandingEasterEggTriggers {
  #snapshot: LandingEasterEggSnapshot | null = null;
  #weekCircuitEarned = false;
  #fullChargeEarned = false;
  #durationSequenceEarned = false;
  #overchargeEarned = false;
  #activationCount = 0;
  #durationSequenceIndex = 0;
  #durationSequenceStartedAt: number | null = null;
  #lastDurationEventKey: string | undefined;

  initialize(snapshot: LandingEasterEggSnapshot): void {
    this.#snapshot = this.#copySnapshot(snapshot);
    if (hasFullWeek(snapshot.weekMinutes)) this.#weekCircuitEarned = true;
    if (hasFullCharge(snapshot.charge)) this.#fullChargeEarned = true;
  }

  successfulSave(snapshot: LandingEasterEggSnapshot): LandingEasterEggEffect[] {
    return this.save(snapshot, true);
  }

  save(snapshot: LandingEasterEggSnapshot, succeeded: boolean): LandingEasterEggEffect[] {
    if (!succeeded) return [];

    const nextSnapshot = this.#copySnapshot(snapshot);
    if (!this.#snapshot) {
      this.initialize(nextSnapshot);
      return [];
    }

    const weekCompleted = !this.#weekCircuitEarned &&
      !hasFullWeek(this.#snapshot.weekMinutes) && hasFullWeek(nextSnapshot.weekMinutes);
    const chargeCompleted = !this.#fullChargeEarned &&
      !hasFullCharge(this.#snapshot.charge) && hasFullCharge(nextSnapshot.charge);

    this.#snapshot = nextSnapshot;

    if (weekCompleted) this.#weekCircuitEarned = true;
    if (chargeCompleted) this.#fullChargeEarned = true;

    if (weekCompleted && chargeCompleted) return [{ type: 'week-and-charge' }];
    if (weekCompleted) return [{ type: 'week-circuit' }];
    if (chargeCompleted) return [{ type: 'full-charge' }];
    return [];
  }

  activate(): LandingEasterEggEffect[] {
    if (this.#overchargeEarned) return [];

    this.#activationCount++;
    if (this.#activationCount !== OVERCHARGE_ACTIVATION_COUNT) return [];

    this.#overchargeEarned = true;
    return [{ type: 'overcharge' }];
  }

  selectDuration(
    minutes: 30 | 60 | 90,
    nowMs: number,
    eventKey?: string,
  ): LandingEasterEggEffect[] {
    if (eventKey !== undefined && eventKey === this.#lastDurationEventKey) return [];
    this.#lastDurationEventKey = eventKey;

    if (this.#durationSequenceEarned || !Number.isFinite(nowMs)) return [];

    if (
      this.#durationSequenceStartedAt !== null &&
      nowMs - this.#durationSequenceStartedAt > DURATION_SEQUENCE_WINDOW_MS
    ) {
      this.#resetDurationSequence();
    }

    if (minutes === 30) {
      this.#durationSequenceIndex = 1;
      this.#durationSequenceStartedAt = nowMs;
      return [];
    }

    if (minutes !== DURATION_SEQUENCE[this.#durationSequenceIndex]) {
      this.#resetDurationSequence();
      return [];
    }

    this.#durationSequenceIndex++;
    if (this.#durationSequenceIndex < DURATION_SEQUENCE.length) return [];

    this.#durationSequenceEarned = true;
    this.#resetDurationSequence();
    return [{ type: 'duration-sequence' }];
  }

  #resetDurationSequence(): void {
    this.#durationSequenceIndex = 0;
    this.#durationSequenceStartedAt = null;
  }

  #copySnapshot(snapshot: LandingEasterEggSnapshot): LandingEasterEggSnapshot {
    return { weekMinutes: [...snapshot.weekMinutes], charge: snapshot.charge };
  }
}
