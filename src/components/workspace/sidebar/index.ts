/**
 * サイドバーモジュール
 * コンポーネントは適切に分割されています
 */

// メインコンポーネント
export { Sidebar } from "./sidebar";
export { SidebarHeader } from "./sidebar-header";

// 最小単位コンポーネント
export {
  NavItem,
  TreeItem,
  TaskItem,
  EventItem,
  CollapsibleSection,
  type TaskPriority,
  type EventColor,
} from "./components";

// ビューコンテンツ
export {
  ExplorerContent,
  SearchContent,
  TasksContent,
  CalendarContent,
} from "./views";
