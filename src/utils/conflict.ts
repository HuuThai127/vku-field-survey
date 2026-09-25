import type { Inspection } from '../types/inspection';

/**
 * Resolves potential conflicts between local and remote inspection records.
 * Uses deterministic Last-Write-Wins (LWW) based on updatedAt timestamp,
 * while prioritizing PENDING_SYNC status over stale remote states.
 */
export function resolveInspectionConflict(
  local: Inspection,
  incoming: Inspection
): { resolved: Inspection; conflictDetected: boolean } {
  // If local is currently pending synchronization, local modifications take precedence
  if (local.syncStatus === 'PENDING_SYNC' || local.syncStatus === 'SYNCING') {
    return {
      resolved: local,
      conflictDetected: local.updatedAt !== incoming.updatedAt
    };
  }

  // If incoming has a newer timestamp, incoming wins
  if (incoming.updatedAt > local.updatedAt) {
    return {
      resolved: incoming,
      conflictDetected: true
    };
  }

  return {
    resolved: local,
    conflictDetected: false
  };
}
