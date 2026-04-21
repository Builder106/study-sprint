export type GoalStatus = "Active" | "Paused" | "Completed";

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  target_hours: number | string;
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  logged_minutes: number;
  subjects: string[];
}

export interface StudySession {
  id: number;
  goal_id: number;
  duration_minutes: number;
  notes: string | null;
  logged_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
