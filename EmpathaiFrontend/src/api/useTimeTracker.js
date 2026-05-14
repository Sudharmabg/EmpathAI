// useTimeTracker.js
// Time tracking is handled per-activity in Activities.jsx
// This hook is intentionally disabled to prevent background API calls

export default function useTimeTracker(userId) {
    // No interval, no background calls
    // updateTimeSpent is called only on activity completion
}