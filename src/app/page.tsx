import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

/**
 * ルートページ
 * 認証状態に応じてリダイレクト
 */
export default async function RootPage() {
  const session = await getSession();

  if (session) {
    // 認証済み → ワークスペース
    redirect("/workspace");
  } else {
    // 未認証 → サインイン
    redirect("/sign-in");
  }
}
