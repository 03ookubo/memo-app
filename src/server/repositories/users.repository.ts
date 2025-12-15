/**
 * User Repository
 * ユーザーのCRUD操作を提供
 */

import { Prisma, User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient, FindOptions } from "./types";

export const usersRepository = {
  /**
   * IDでユーザーを取得
   */
  async findById(
    id: string,
    tx: TransactionClient = prisma
  ): Promise<User | null> {
    return tx.user.findUnique({
      where: { id },
    });
  },

  /**
   * emailでユーザーを取得
   */
  async findByEmail(
    email: string,
    tx: TransactionClient = prisma
  ): Promise<User | null> {
    return tx.user.findUnique({
      where: { email },
    });
  },

  /**
   * 複数ユーザーを取得
   */
  async findMany(
    where: Prisma.UserWhereInput = {},
    options: FindOptions = {},
    tx: TransactionClient = prisma
  ): Promise<User[]> {
    return tx.user.findMany({
      where,
      take: options.take,
      skip: options.skip,
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * ユーザーを作成
   */
  async create(
    data: Prisma.UserCreateInput,
    tx: TransactionClient = prisma
  ): Promise<User> {
    return tx.user.create({
      data,
    });
  },

  /**
   * ユーザーを更新
   */
  async updateById(
    id: string,
    data: Prisma.UserUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<User> {
    return tx.user.update({
      where: { id },
      data,
    });
  },

  /**
   * ユーザーを削除
   */
  async deleteById(id: string, tx: TransactionClient = prisma): Promise<User> {
    return tx.user.delete({
      where: { id },
    });
  },

  /**
   * ユーザー数をカウント
   */
  async count(
    where: Prisma.UserWhereInput = {},
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.user.count({ where });
  },
};
