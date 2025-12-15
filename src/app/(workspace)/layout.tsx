import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import type { ReactNode } from "react";

/**
 * ワークスペースグループレイアウト
 * 認証必須、VSCode風レイアウト
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}
