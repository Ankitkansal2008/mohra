// Pure formatting utilities for chess clock and time representations.

export function formatClock(ms: number): string {
  if (ms <= 0) {
    return '00:00';
  }
  // PRD FR-18 / UI/UX Section 6: seconds only when remaining time is under 60s
  if (ms < 60_000) {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const padMinutes = String(minutes).padStart(2, '0');
  const padSeconds = String(seconds).padStart(2, '0');
  return `${padMinutes}:${padSeconds}`;
}
