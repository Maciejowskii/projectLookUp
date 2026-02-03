export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { deleteReview } from "@/actions/adminActions";
import { Star, Trash2, MessageSquare, Bot, User, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CompanyReviewsFilter } from "@/components/admin/CompanyReviewsFilter";

const REVIEWS_PER_PAGE = 25;

// Funkcja sprawdzająca czy opinia jest od bota
function isBotReview(review: { userPhone: string }): boolean {
  // Bot używa numeru "000 000 000" (z różnymi formatami spacji/myślników)
  const normalizedPhone = review.userPhone.replace(/[\s-]/g, '')
  return normalizedPhone === '000000000' || normalizedPhone === '00000000'
}

function buildReviewsHref(base: string, tab: string, page?: number, companyId?: string) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (page && page > 1) params.set('page', String(page));
  if (companyId) params.set('company', companyId);
  return `${base}?${params.toString()}`;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; company?: string }>
}) {
  const params = await searchParams;
  const activeTab = params.tab || 'all'; // 'all' | 'bot' | 'user'
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const companyId = params.company ?? undefined;
  const skip = (currentPage - 1) * REVIEWS_PER_PAGE;

  // Filtr po firmie
  const whereClause: { companyId?: string; userPhone?: { startsWith: string }; NOT?: { userPhone: { startsWith: string } } } = {};
  if (companyId) {
    whereClause.companyId = companyId;
  }
  if (activeTab === 'bot') {
    whereClause.userPhone = { startsWith: '000' };
  } else if (activeTab === 'user') {
    whereClause.NOT = { userPhone: { startsWith: '000' } };
  }

  // Nazwa firmy przy filtrze
  const selectedCompany = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      })
    : null;

  // Pobierz opinie i całkowitą liczbę
  const [reviews, totalReviews] = await Promise.all([
    prisma.review.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: REVIEWS_PER_PAGE,
      skip: skip,
      include: { company: true },
    }),
    prisma.review.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);

  // Liczniki dla zakładek (z uwzględnieniem filtra firmy)
  const countWhereBase = companyId ? { companyId } : {};
  const [botCount, userCount, allCount] = await Promise.all([
    prisma.review.count({
      where: { ...countWhereBase, userPhone: { startsWith: '000' } },
    }),
    prisma.review.count({
      where: { ...countWhereBase, NOT: { userPhone: { startsWith: '000' } } },
    }),
    prisma.review.count({ where: countWhereBase }),
  ]);

  const basePath = '/admin/reviews';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Moderacja Opinii
          </h1>
          <p className="text-sm text-gray-500">
            Zarządzaj opiniami użytkowników i botów. Usuwaj spam i hejt.
          </p>
        </div>
      </div>

      {/* FILTR PO FIRMIE – sprawdź opinie danej firmy */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Sprawdź opinie wybranej firmy</p>
        <CompanyReviewsFilter selectedCompanyName={selectedCompany?.name ?? null} />
      </div>

      {/* ZAKŁADKI */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
        <Link
          href={buildReviewsHref(basePath, 'all', undefined, companyId)}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'all'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MessageSquare size={16} />
          Wszystkie ({allCount})
        </Link>
        <Link
          href={buildReviewsHref(basePath, 'bot', undefined, companyId)}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bot'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Bot size={16} />
          Boty ({botCount})
        </Link>
        <Link
          href={buildReviewsHref(basePath, 'user', undefined, companyId)}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'user'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User size={16} />
          Użytkownicy ({userCount})
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reviews.map((review) => {
          const isBot = isBotReview(review)
          return (
          <div
            key={review.id}
            className={`bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-6 items-start hover:shadow-md transition-shadow ${
              isBot 
                ? 'border-purple-200 bg-purple-50/30' 
                : 'border-gray-200'
            }`}
          >
            {/* OCENA */}
            <div className={`flex flex-col items-center justify-center p-4 rounded-xl min-w-[100px] text-center border ${
              isBot 
                ? 'bg-purple-100 border-purple-200' 
                : 'bg-gray-50 border-gray-100'
            }`}>
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-gray-900">
                  {review.userName}
                </span>
                {isBot && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                    <Bot size={12} />
                    BOT
                  </span>
                )}
                <span className="text-gray-400 text-xs">•</span>
                <Link 
                  href={`/firma/${review.company.slug}`}
                  className="text-blue-600 font-medium text-sm hover:underline"
                >
                  {review.company.name}
                </Link>
                <span className="text-gray-400 text-xs ml-auto">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="relative">
                <MessageSquare
                  className={`absolute top-1 left-0 -z-10 ${
                    isBot ? 'text-purple-100' : 'text-gray-100'
                  }`}
                  size={40}
                />
                <p className="text-gray-600 text-sm leading-relaxed italic">
                  "{review.comment}"
                </p>
              </div>
              
              {/* DODATKOWE INFO DLA BOTA */}
              {isBot && (
                <div className="mt-2 text-xs text-purple-600 font-medium">
                  📞 Telefon: {review.userPhone} • 📧 Email: {review.userEmail}
                </div>
              )}
            </div>

            {/* AKCJE */}
            <div className="flex items-center">
              <form 
                action={deleteReview.bind(
                  null, 
                  review.id,
                  buildReviewsHref(basePath, activeTab, currentPage === 1 ? undefined : currentPage, companyId)
                )}
              >
                <button
                  type="submit"
                  className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Usuń opinię"
                >
                  <Trash2 size={20} />
                </button>
              </form>
            </div>
          </div>
        )})}

        {reviews.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {companyId
              ? selectedCompany?.name
                ? `Brak opinii dla firmy „${selectedCompany.name}".`
                : 'Brak opinii dla wybranej firmy.'
              : activeTab === 'bot'
              ? 'Brak opinii od botów.'
              : activeTab === 'user'
              ? 'Brak opinii od użytkowników.'
              : 'Cisza i spokój. Brak opinii.'}
          </div>
        )}
      </div>

      {/* PAGINACJA */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
          {/* Info o stronie */}
          <p className="text-sm text-gray-500">
            Strona {currentPage} z {totalPages} • {totalReviews} {totalReviews === 1 ? 'opinia' : totalReviews < 5 ? 'opinie' : 'opinii'}
          </p>

          {/* Przyciski paginacji */}
          <div className="flex items-center gap-2">
            {/* Poprzednia strona */}
            {currentPage > 1 ? (
              <Link
                href={buildReviewsHref(basePath, activeTab, currentPage === 2 ? undefined : currentPage - 1, companyId)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <ChevronLeft size={16} />
                Poprzednia
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed">
                <ChevronLeft size={16} />
                Poprzednia
              </span>
            )}

            {/* Numery stron */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                const pageUrl = buildReviewsHref(basePath, activeTab, pageNum === 1 ? undefined : pageNum, companyId)

                return (
                  <Link
                    key={pageNum}
                    href={pageUrl}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      pageNum === currentPage
                        ? activeTab === 'bot'
                          ? 'bg-purple-600 text-white'
                          : activeTab === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-900 text-white'
                        : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              })}
            </div>

            {/* Następna strona */}
            {currentPage < totalPages ? (
              <Link
                href={buildReviewsHref(basePath, activeTab, currentPage + 1, companyId)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                Następna
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed">
                Następna
                <ChevronRight size={16} />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
