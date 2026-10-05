import { prisma } from './prisma'

export type IntegrationProvider = 'GMAIL' | 'TELEGRAM'
export type IntegrationEventType = 'CONNECT' | 'DISCONNECT'

/** Records a connect/disconnect event for the integrations audit trail
 * (Settings → Integrations, issue #7). Best-effort — a logging failure
 * should never break the connect/disconnect flow itself. */
export async function logIntegrationEvent(
  userId: string,
  provider: IntegrationProvider,
  event: IntegrationEventType,
  detail?: string,
): Promise<void> {
  try {
    await prisma.integrationEvent.create({
      data: { userId, provider, event, detail: detail ?? null },
    })
  } catch (e) {
    console.error('[integration-events] failed to log event:', e)
  }
}
