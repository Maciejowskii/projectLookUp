
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { deleteReview } from "@/actions/adminActions";
import { Star, Trash2, MessageSquare } from "lucide-react";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { company: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Moderacja Opinii
          </h1>
          <p className="text-sm text-gray-500">
            Ostatnie opinie dodane w portalu. Usuwaj spam i hejt.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6 items-start hover:shadow-md transition-shadow"
          >
            {/* OCENA */}
            <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl min-w-[100px] text-center border border-gray-100">
              <span className="text-3xl font-bold text-gray-900">
                {review.rating}
              </span>
              <div className="flex text-yellow-400 text-xs mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    fill={i < review.rating ? "currentColor" : "none"}
                    strokeWidth={i < review.rating ? 0 : 2}
                    className={i >= review.rating ? "text-gray-300" : ""}
                  />
                ))}
              </div>
            </div>

            {/* TREŚĆ */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900">
                  {review.userName}
                </span>
                <span className="text-gray-400 text-xs">•</span>
                <span className="text-blue-600 font-medium text-sm">
                  {review.company.name}
                </span>
                <span className="text-gray-400 text-xs ml-auto">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="relative">
                <MessageSquare
                  className="absolute top-1 left-0 text-gray-100 -z-10"
                  size={40}
                />
                <p className="text-gray-600 text-sm leading-relaxed italic">
                  "{review.comment}"
                </p>
              </div>
            </div>

            {/* AKCJE */}
            <div className="flex items-center">
              <form action={deleteReview.bind(null, review.id)}>
                <button
                  className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Usuń opinię"
                >
                  <Trash2 size={20} />
                </button>
              </form>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Cisza i spokój. Brak nowych opinii.
          </div>
        )}
      </div>
    </div>
  );
}
