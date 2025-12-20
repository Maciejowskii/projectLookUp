import { cookies } from "next/headers";

export async function checkAdminAuth() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("is_admin_authenticated")?.value === "true";

  if (!isAdmin) {
    throw new Error("UNAUTHORIZED: Brak uprawnień administratora.");
  }
}
