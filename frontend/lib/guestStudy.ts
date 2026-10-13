export const GUEST_STUDY_KEY = 'studysprint:guest-study:v1';

export interface GuestGoal {
  id: string;
  title: string;
}

export interface GuestSession {
  id: string;
  goalId: string;
  minutes: number;
  endedAt: string;
}

export interface GuestStudyData {
  goals: GuestGoal[];
  sessions: GuestSession[];
  activeGoalId: string | null;
}

export const EMPTY_GUEST_STUDY: GuestStudyData = {
  goals: [],
  sessions: [],
  activeGoalId: null,
};

export function readGuestStudy(): GuestStudyData {
  const raw = localStorage.getItem(GUEST_STUDY_KEY);
  if (!raw) return EMPTY_GUEST_STUDY;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Saved guest data has an invalid format.');
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.goals) || !Array.isArray(record.sessions)) {
    throw new Error('Saved guest data has an invalid format.');
  }
  const goals: GuestGoal[] = record.goals.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('Saved guest goals have an invalid format.');
    }
    const goal = item as Record<string, unknown>;
    if (typeof goal.id !== 'string' || typeof goal.title !== 'string') {
      throw new Error('Saved guest goals have an invalid format.');
    }
    return { id: goal.id, title: goal.title };
  });
  const sessions: GuestSession[] = record.sessions.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('Saved guest sessions have an invalid format.');
    }
    const session = item as Record<string, unknown>;
    if (
      typeof session.id !== 'string' || typeof session.goalId !== 'string' ||
      typeof session.minutes !== 'number' || !Number.isInteger(session.minutes) ||
      session.minutes < 1 || typeof session.endedAt !== 'string' ||
      !Number.isFinite(Date.parse(session.endedAt))
    ) {
      throw new Error('Saved guest sessions have an invalid format.');
    }
    return {
      id: session.id,
      goalId: session.goalId,
      minutes: session.minutes,
      endedAt: session.endedAt,
    };
  });
  const activeGoalId = typeof record.activeGoalId === 'string' ? record.activeGoalId : null;
  return { goals, sessions, activeGoalId };
}
