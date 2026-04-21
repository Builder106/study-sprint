import { createBrowserRouter } from "react-router";
import { Landing } from "./components/Landing";
import { Register } from "./components/Register";
import { Dashboard } from "./components/Dashboard";
import { GoalDetail } from "./components/GoalDetail";
import { GoalDetailWithPanel } from "./components/GoalDetailWithPanel";
import { NewGoal } from "./components/NewGoal";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/register", Component: Register },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/goals/new",
    element: (
      <ProtectedRoute>
        <NewGoal />
      </ProtectedRoute>
    ),
  },
  {
    path: "/goal/:id",
    element: (
      <ProtectedRoute>
        <GoalDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/goal/:id/details",
    element: (
      <ProtectedRoute>
        <GoalDetailWithPanel />
      </ProtectedRoute>
    ),
  },
]);
