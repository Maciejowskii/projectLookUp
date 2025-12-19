"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addReview(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const rating = parseInt(formData.get("rating") as string);
  const comment = formData.get("comment") as string;
  const userName = formData.get("userName") as string;

  if (!companyId || !rating || !userName) {
    return { error: "Wypełnij wszystkie pola" };
  }

  await prisma.review.create({
    data: {
      companyId,
      rating,
      comment,
      userName,
    },
  });

  // Odśwież stronę, żeby nowa opinia się pojawiła
  revalidatePath(`/firma/${companyId}`); // Tutaj uwaga: revalidate po slugu jest trudniejszy, bo mamy ID. 
  // Ale Next.js jest sprytny. Zrobimy inaczej - revalidatePath na sciezce.
}
