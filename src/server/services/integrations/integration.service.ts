/**
 * Integration Service
 * 外部連携の管理
 */

import { Integration } from "@prisma/client";
import { integrationsRepository } from "@/server/repositories";
import { ServiceError } from "../types";

/**
 * 連携登録・更新の入力
 */
export interface UpsertIntegrationInput {
  userId: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: any;
}

/**
 * 連携情報を登録または更新
 */
export async function upsertIntegration(
  input: UpsertIntegrationInput
): Promise<Integration> {
  const { userId, provider, ...data } = input;

  // TODO: accessToken, refreshToken の暗号化処理をここに実装
  // const encryptedAccessToken = encrypt(data.accessToken);

  const existing = await integrationsRepository.findByUserIdAndProvider(
    userId,
    provider
  );

  if (existing) {
    return integrationsRepository.updateById(existing.id, data);
  } else {
    return integrationsRepository.create({
      user: { connect: { id: userId } },
      provider,
      ...data,
    });
  }
}

/**
 * 連携情報を取得
 */
export async function getIntegration(
  userId: string,
  provider: string
): Promise<Integration | null> {
  const integration = await integrationsRepository.findByUserIdAndProvider(
    userId,
    provider
  );

  if (!integration) return null;

  // TODO: accessToken, refreshToken の復号処理をここに実装
  // integration.accessToken = decrypt(integration.accessToken);

  return integration;
}

/**
 * 連携を解除
 */
export async function removeIntegration(
  userId: string,
  provider: string
): Promise<void> {
  await integrationsRepository.deleteByUserIdAndProvider(userId, provider);
}

/**
 * ユーザーの全連携一覧を取得
 */
export async function listIntegrations(
  userId: string
): Promise<Integration[]> {
  return integrationsRepository.findMany(
    { userId },
    { sortBy: "createdAt", sortOrder: "desc" }
  );
}
