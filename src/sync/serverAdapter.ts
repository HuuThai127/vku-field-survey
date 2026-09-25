import type { Inspection } from '../types/inspection';
import { APP_CONFIG } from '../constants/config';

export interface ServerDispatchResponse {
  success: boolean;
  remoteId: string;
  syncedAt: number;
  message?: string;
}

/**
 * Server boundary adapter for VKU Field Survey.
 *
 * NOTE: Offline synchronization is implemented against a mock server adapter
 * because no backend service is specified by the university assignment.
 * If a central REST/GraphQL API endpoint is provided, only this function needs
 * to be updated without changing the offline queue architecture.
 */
export async function dispatchInspection(
  inspection: Inspection,
  options?: { forceFail?: boolean; latencyMs?: number }
): Promise<ServerDispatchResponse> {
  const latency = options?.latencyMs ?? APP_CONFIG.MOCK_SERVER_DELAY_MS;

  // Simulate network flight time
  await new Promise((resolve) => setTimeout(resolve, latency));

  if (options?.forceFail) {
    throw new Error('Simulated upstream server error: 503 Service Unavailable');
  }

  // Basic validation check at server boundary
  if (!inspection.building || !inspection.room || !inspection.category) {
    throw new Error('Server payload validation error: Missing required inspection fields');
  }

  console.log(`[ServerAdapter] Successfully received and saved inspection #${inspection.id} for ${inspection.room}`);

  return {
    success: true,
    remoteId: `vku-srv-${inspection.id.slice(0, 8)}`,
    syncedAt: Date.now(),
    message: 'Inspection successfully recorded on VKU central inspection database'
  };
}
