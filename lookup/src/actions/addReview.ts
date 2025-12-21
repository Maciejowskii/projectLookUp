"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addReview(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const rating = parseInt(formData.get("rating") as string);
  const comment = formData.get("comment") as string;
  const userName = formData.get("userName") as string;

  // Nowe pola
  const userEmail = formData.get("userEmail") as string;
  const userPhone = formData.get("userPhone") as string;

  if (!companyId || !rating || !userName || !userEmail || !userPhone) {
    throw new Error("Wypełnij wszystkie pola");
  }

  await prisma.review.create({
    data: {
      companyId,
      rating,
      comment,
      userName,
      userEmail, // Zapisz do bazy
      userPhone, // Zapisz do bazy
    },
  });

  // Odświeżamy stronę firmy (ponieważ nie mamy tu sluga, używamy ogólnej ścieżki lub najlepiej ścieżki z referera jeśli byśmy mogli, ale revalidatePath('/') też zadziała dla testu)
  // W idealnym świecie powinieneś przekazać 'slug' w formData, żeby zrobić revalidatePath(`/firma/${slug}`)
  revalidatePath("/firma/[slug]", "page");
}
