/**
 * Service Layer - メインエクスポート
 *
 * 各ドメインのサービスをまとめてエクスポート
 */

// Note Services
export * from "./notes";

// Project Services
export * from "./projects";

// Tag Services
export * from "./tags";

// Task Services
export * from "./tasks";

// Attachment Services
export * from "./attachments";

// User Services
export * from "./users";

// Event Services
export * from "./events";

// Integration Services
export * from "./integrations";

// Common Types
export {
  ServiceError,
  type PaginationInput,
  type PaginatedResult,
} from "./types";
