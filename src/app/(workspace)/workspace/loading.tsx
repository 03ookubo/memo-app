import { Skeleton } from "@/components/ui/skeleton";

/**
 * ワークスペースローディング画面
 */
export default function WorkspaceLoading() {
  return (
    <div className="flex h-screen w-screen">
      {/* Activity Bar */}
      <div className="w-12 bg-muted/50 border-r">
        <div className="p-2 space-y-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-muted/30 border-r">
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-10 border-b bg-muted/30 flex items-center px-4">
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
