import type { Slang } from './supabase';

export interface CurrentSlangState {
  slang: Slang;
  currentRepeat: number;
  secondsRemaining: number;
  totalDuration: number;
  elapsedInSlang: number;
}

export interface ServerSlangResponse {
  slang: Slang;
  currentRepeat: number;
  secondsRemaining: number;
  totalDuration: number;
  elapsedInSlang: number;
  startedAt: string;
  receivedAt?: number; // Local timestamp when response was received
}

/**
 * Calculate the local state based on server response and current time
 * Uses server's elapsed time as baseline to avoid clock sync issues
 */
export function calculateLocalState(
  serverResponse: ServerSlangResponse,
  now: number = Date.now()
): CurrentSlangState | null {
  const { slang, totalDuration, elapsedInSlang, receivedAt } = serverResponse;

  if (!slang) {
    return null;
  }

  // Calculate elapsed time using server's elapsed as baseline
  // This avoids clock sync issues between devices
  let elapsed: number;
  if (receivedAt) {
    // Time since we received the response + server's elapsed at that time
    const timeSinceReceived = now - receivedAt;
    elapsed = elapsedInSlang + timeSinceReceived;
  } else {
    // Fallback to timestamp-based calculation
    let normalizedTimestamp = serverResponse.startedAt.replace(' ', 'T');
    if (normalizedTimestamp.endsWith('+00')) {
      normalizedTimestamp = normalizedTimestamp + ':00';
    }
    const startTime = new Date(normalizedTimestamp).getTime();
    elapsed = now - startTime;
  }

  // If slang has expired, return null to trigger a server refresh
  if (elapsed >= totalDuration) {
    return null;
  }

  const secondsPerMs = slang.seconds_per * 1000;

  // Calculate current repeat (counting down from repeat_count to 1)
  const repeatIndex = Math.floor(elapsed / secondsPerMs);
  const currentRepeat = slang.repeat_count - repeatIndex;

  // Calculate seconds remaining in current repeat interval
  const positionInRepeat = elapsed % secondsPerMs;
  const msRemaining = secondsPerMs - positionInRepeat;
  // Use ceil so transitions happen exactly at second boundaries
  const secondsRemaining = Math.ceil(msRemaining / 1000);

  return {
    slang,
    currentRepeat: Math.max(1, currentRepeat),
    secondsRemaining: Math.min(secondsRemaining, slang.seconds_per),
    totalDuration,
    elapsedInSlang: elapsed,
  };
}

/**
 * Check if the current slang has expired and needs a refresh from server
 */
export function isSlangExpired(
  serverResponse: ServerSlangResponse,
  now: number = Date.now()
): boolean {
  const { elapsedInSlang, receivedAt, totalDuration } = serverResponse;

  let elapsed: number;
  if (receivedAt) {
    const timeSinceReceived = now - receivedAt;
    elapsed = elapsedInSlang + timeSinceReceived;
  } else {
    // Fallback to timestamp-based calculation
    let normalizedTimestamp = serverResponse.startedAt.replace(' ', 'T');
    if (normalizedTimestamp.endsWith('+00')) {
      normalizedTimestamp = normalizedTimestamp + ':00';
    }
    const startTime = new Date(normalizedTimestamp).getTime();
    elapsed = now - startTime;
  }

  return elapsed >= totalDuration;
}
