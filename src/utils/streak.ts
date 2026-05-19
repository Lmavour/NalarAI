/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Daily streak logic with localStorage persistence.
 * Tracks consecutive days of learning activity.
 */

const STREAK_KEY = 'nalar_daily_streak';
const STREAK_DATE_KEY = 'nalar_daily_streak_date';
const BEST_STREAK_KEY = 'nalar_best_streak';

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get the current daily streak count from localStorage */
export function getDailyStreak(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(STREAK_KEY);
  return stored !== null ? parseInt(stored, 10) : 0;
}

/** Get the last active date from localStorage */
export function getStreakLastDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STREAK_DATE_KEY);
}

/** Get the best (longest) streak ever achieved */
export function getBestStreak(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(BEST_STREAK_KEY);
  return stored !== null ? parseInt(stored, 10) : 0;
}

/**
 * Update the daily streak based on today's activity.
 * - If already active today: no change, return current streak
 * - If last active yesterday: increment streak
 * - If streak broken or first time: start at 1
 * Also updates best streak if current exceeds it.
 */
export function updateDailyStreak(): number {
  if (typeof window === 'undefined') return 0;

  const today = getTodayString();
  const lastDate = getStreakLastDate();
  const currentStreak = getDailyStreak();

  if (lastDate === today) {
    // Already active today, no change
    return currentStreak;
  }

  let newStreak: number;

  if (lastDate === getYesterdayString()) {
    // Active yesterday → increment streak
    newStreak = currentStreak + 1;
  } else {
    // Streak broken or first time → start at 1
    newStreak = 1;
  }

  localStorage.setItem(STREAK_KEY, newStreak.toString());
  localStorage.setItem(STREAK_DATE_KEY, today);

  // Update best streak
  const bestStreak = getBestStreak();
  if (newStreak > bestStreak) {
    localStorage.setItem(BEST_STREAK_KEY, newStreak.toString());
  }

  return newStreak;
}

/**
 * Check if the streak is still alive (last active today or yesterday).
 * Returns true if the streak hasn't been broken yet.
 */
export function isStreakAlive(): boolean {
  const lastDate = getStreakLastDate();
  const today = getTodayString();
  const yesterday = getYesterdayString();
  return lastDate === today || lastDate === yesterday;
}

/** Reset daily streak (used when user wants to fully reset) */
export function resetDailyStreak(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STREAK_KEY, '0');
  localStorage.removeItem(STREAK_DATE_KEY);
}

/** Reset best streak (used when user wants to fully reset) */
export function resetBestStreak(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BEST_STREAK_KEY);
}

/**
 * Reset all session-related data for a fresh start.
 * Keeps daily streak intact (it's about consecutive days, not session).
 * Resets: hearts, session streak, XP, messages.
 */
export function resetSessionData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nalar_hearts');
  localStorage.removeItem('nalar_streak');
  localStorage.removeItem('nalar_xp');
}