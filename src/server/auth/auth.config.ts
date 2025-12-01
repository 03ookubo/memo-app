/**
 * NextAuth.js 設定
 * WebAuthn（パスキー）認証 + JWT セッション
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth 設定
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // WebAuthn 認証は独自 API で処理し、検証成功後に Credentials Provider でセッション発行
    Credentials({
      id: "webauthn",
      name: "WebAuthn",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || typeof credentials.userId !== "string") {
          return null;
        }

        // WebAuthn 検証は別途 API で行い、ここでは userId でユーザーを取得
        const user = await prisma.user.findUnique({
          where: { id: credentials.userId },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
    error: "/auth/error",
  },
  trustHost: true,
};

/**
 * NextAuth ハンドラとヘルパー関数
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
