/**
 * Integrations Repository
 * 外部サービス連携のトークン管理
 */

import { Prisma, Integration } from "@prisma/client";
import { TransactionClient } from "./types";
import prisma from "@/lib/prisma";

/**
 * Include オプション型定義
 */
export type IntegrationIncludeOptions = {
  user?: boolean;
};

/**
 * Sort オプション型定義
 */
export type IntegrationSortOptions = {
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  take?: number;
  skip?: number;
};

/**
 * integrationsRepository の実装
 */
export const integrationsRepository = {
  /**
   * ID で統合情報を取得
   */
  findById: async (
    id: string,
    include?: IntegrationIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Integration | null> => {
    return tx.integration.findUnique({
      where: { id },
      include,
    });
  },

  /**
   * ユーザーIDとプロバイダーで統合情報を取得
   */
  findByUserIdAndProvider: async (
    userId: string,
    provider: string,
    include?: IntegrationIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Integration | null> => {
    return tx.integration.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
      include,
    });
  },

  /**
   * 統合情報一覧を取得
   */
  findMany: async (
    where: Prisma.IntegrationWhereInput,
    options: IntegrationSortOptions,
    include?: IntegrationIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Integration[]> => {
    const { sortBy = "createdAt", sortOrder = "desc", take, skip } = options;

    return tx.integration.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take,
      skip,
      include,
    });
  },

  /**
   * 統合情報を作成
   */
  create: async (
    data: Prisma.IntegrationCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Integration> => {
    return tx.integration.create({ data });
  },

  /**
   * 統合情報を作成または更新（Upsert）
   */
  upsert: async (
    userId: string,
    provider: string,
    data: Prisma.IntegrationUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Integration> => {
    return tx.integration.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      update: data,
      create: {
        ...data,
        user: { connect: { id: userId } },
        provider,
      } as Prisma.IntegrationCreateInput,
    });
  },

  /**
   * ID で統合情報を更新
   */
  updateById: async (
    id: string,
    data: Prisma.IntegrationUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Integration> => {
    return tx.integration.update({
      where: { id },
      data,
    });
  },

  /**
   * ID で統合情報を削除
   */
  deleteById: async (
    id: string,
    tx: TransactionClient = prisma
  ): Promise<Integration> => {
    return tx.integration.delete({
      where: { id },
    });
  },

  /**
   * ユーザーIDとプロバイダーで統合情報を削除
   */
  deleteByUserIdAndProvider: async (
    userId: string,
    provider: string,
    tx: TransactionClient = prisma
  ): Promise<Integration> => {
    return tx.integration.delete({
      where: {
        userId_provider: { userId, provider },
      },
    });
  },

  /**
   * 統合情報数をカウント
   */
  count: async (
    where: Prisma.IntegrationWhereInput,
    tx: TransactionClient = prisma
  ): Promise<number> => {
    return tx.integration.count({ where });
  },
};
