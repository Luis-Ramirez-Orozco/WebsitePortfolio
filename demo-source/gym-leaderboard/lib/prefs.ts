/* Cookie names for remembering where someone was in the app, so a refresh reopens the same tab and exercise.
   Kept in a plain shared file: the server page reads them, the browser writes them. */
export const TAB_COOKIE = "gym_tab";
export const EXERCISE_COOKIE = "gym_exercise";
export const TABS = ["leaderboard", "log", "chat", "account"] as const;
