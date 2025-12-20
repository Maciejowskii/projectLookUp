import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

// Funkcja pomocnicza do autoryzacji
const auth = async (req: Request) => {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  return userId ? { userId } : null;
};

export const ourFileRouter = {
  // Endpoint do wgrywania logo firmy
  companyLogo: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      // 1. Sprawdzamy czy user jest zalogowany
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized");

      // 2. Pobieramy firmę użytkownika
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { companyId: true },
      });

      if (!dbUser?.companyId) throw new UploadThingError("No company found");

      // 3. Zwracamy ID firmy do metadata, żeby wiedzieć czyje to logo
      return { companyId: dbUser.companyId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // 4. Po wgraniu pliku na serwer UploadThing, zapisujemy URL w naszej bazie
      console.log("Upload complete for company:", metadata.companyId);
      console.log("File url:", file.url);

      await prisma.company.update({
        where: { id: metadata.companyId },
        data: { logo: file.url }, // <--- Tutaj był błąd (brakowało klucza 'data')
      });

      return { uploadedBy: metadata.companyId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
