/**
 * Idempotency service for updating idempotency state
 *
 * Simple service to update idempotency records after request processing.
 * Separates state management from the middleware to keep concerns clear.
 */

import { PrismaClient, IdempotencyStatus, Prisma } from "@prisma/client";

export class IdempotencyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Mark an idempotency request as completed (success or deterministic client error)
   *
   * Called after a successful order creation (201) or deterministic failure (400/422)
   *
   * @param id - The idempotency record ID
   * @param responseStatus - HTTP status code of the response
   * @param responseBody - Response body to cache (must not contain sensitive data)
   */
  async completeRequest(
    id: string,
    responseStatus: number,
    responseBody: unknown
  ): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseStatus,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Mark an idempotency request as failed (deterministic client error)
   *
   * Called for deterministic failures that should be cached (400/422).
   * Do NOT call for 5xx errors - those should allow retry via stale-lock.
   *
   * @param id - The idempotency record ID
   * @param responseStatus - HTTP status code of the response
   * @param responseBody - Error response body to cache
   */
  async failRequest(
    id: string,
    responseStatus: number,
    responseBody: unknown
  ): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: IdempotencyStatus.FAILED,
        responseStatus,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  }
}
