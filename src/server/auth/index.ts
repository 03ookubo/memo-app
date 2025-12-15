/**
 * 認証モジュールの統一エクスポート
 */

// NextAuth 設定とハンドラ
export { auth, signIn, signOut, handlers } from "./auth.config";

// セッションヘルパー
export {
  getSession,
  getCurrentUser,
  requireAuth,
  getSessionUserId,
  requireAuthUserId,
  isResourceOwner,
  requireResourceOwner,
} from "./session";

// WebAuthn ヘルパー
export {
  generateWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
  generateWebAuthnAuthenticationOptions,
  verifyWebAuthnAuthentication,
  hasRegisteredUser,
  hasRegisteredCredential,
  getFirstUser,
  getUserCredentials,
  deleteCredential,
} from "./webauthn";
export type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "./webauthn";

// リンクコードヘルパー
export {
  generateLinkCode,
  verifyLinkCode,
  markLinkCodeAsUsed,
  cleanupExpiredLinkCodes,
  deleteUserLinkCodes,
} from "./link-code";

// 型
export type {
  SessionUser,
  AuthenticatedUser,
  GenerateRegistrationOptionsInput,
  GenerateAuthenticationOptionsInput,
  VerifyRegistrationInput,
  VerifyAuthenticationInput,
  LinkCodeResult,
  LinkCodeVerifyResult,
} from "./types";
