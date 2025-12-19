"use client";

import { useState } from "react";
import { Star, User, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { addReview } from "@/actions/addReview";

// Typ dla opinii
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  userName: string;
  createdAt: Date;
};

export const ReviewSection = ({
  reviews,
  companyId,
  companySlug,
}: {
  reviews: Review[];
  companyId: string;
  companySlug: string;
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    formData.append("companyId", companyId);
    await addReview(formData);
    setIsFormOpen(false);
    router.refresh();
  }

  return (
    <section id="opinie" className="scroll-mt-32">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Opinie klientów
          <span className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-full">
            {reviews.length}
          </span>
        </h2>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`font-bold px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 ${
            isFormOpen
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
          }`}
        >
          {isFormOpen ? (
            "Anuluj"
          ) : (
            <>
              <MessageSquarePlus size={18} /> Dodaj opinię
            </>
          )}
        </button>
      </div>

      {/* FORMULARZ */}
      {isFormOpen && (
        <form
          action={handleSubmit}
          className="bg-white p-8 rounded-3xl mb-10 border border-gray-200 shadow-lg animate-in fade-in slide-in-from-top-4 relative overflow-hidden"
        >
          {/* Dekoracyjny pasek na górze */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Podziel się swoją opinią
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">
                Twoje imię
              </label>
              <input
                name="userName"
                required
                placeholder="np. Jan Kowalski"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">
                Ocena
              </label>
              <div className="relative">
                <select
                  name="rating"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50 focus:bg-white text-gray-900 font-medium appearance-none cursor-pointer"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5/5) - Rewelacja</option>
                  <option value="4">⭐⭐⭐⭐ (4/5) - Dobrze</option>
                  <option value="3">⭐⭐⭐ (3/5) - Przeciętnie</option>
                  <option value="2">⭐⭐ (2/5) - Słabo</option>
                  <option value="1">⭐ (1/5) - Tragicznie</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ▼
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">
              Komentarz
            </label>
            <textarea
              name="comment"
              required
              rows={4}
              placeholder="Opisz, co Ci się podobało, a co wymaga poprawy..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900 resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 transform active:scale-[0.98]"
            >
              Opublikuj opinię
            </button>
          </div>
        </form>
      )}

      {/* LISTA OPINII */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquarePlus size={32} />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">
              Brak opinii
            </h4>
            <p className="text-gray-500">
              Bądź pierwszą osobą, która oceni tę firmę.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg shadow-inner">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">
                      {review.userName}
                    </div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {new Date(review.createdAt).toLocaleDateString("pl-PL", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 self-start">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={
                        i < review.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200"
                      }
                    />
                  ))}
                  <span className="ml-2 font-bold text-yellow-700 text-sm">
                    {review.rating}.0
                  </span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed pl-0 sm:pl-16 text-lg">
                {review.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
