import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePostAI } from "@/actions/blogActions";

export async function GET() {
  const now = new Date();
  const start = new Date(now.toDateString()); // dziś 00:00
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const toRun = await prisma.scheduledPost.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { gte: start, lt: end },
    },
  });

  for (const job of toRun) {
    try {
      await prisma.scheduledPost.update({
        where: { id: job.id },
        data: { status: "processing" },
      });

      // Najpierw stwórz FormData
      const formData = new FormData();
      formData.set("topic", job.topic);

      // Potem użyj go
      const postId = (await generatePostAI(formData)) as string;

      await prisma.scheduledPost.update({
        where: { id: job.id },
        data: { status: "done", executedAt: new Date(), postId },
      });
    } catch (e) {
      await prisma.scheduledPost.update({
        where: { id: job.id },
        data: { status: "failed" },
      });
    }
  }

  return NextResponse.json({ count: toRun.length });
}
