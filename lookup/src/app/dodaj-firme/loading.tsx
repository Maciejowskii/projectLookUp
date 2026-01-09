export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      <div className="pt-32 pb-20 px-6 container mx-auto">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="animate-pulse bg-gray-200 rounded-xl h-8 w-48 rounded-full mb-8"></div>
          <div className="animate-pulse bg-gray-200 rounded-xl h-16 md:h-24 w-3/4 mb-8"></div>
          <div className="animate-pulse bg-gray-200 rounded-xl h-16 md:h-24 w-1/2 mb-10"></div>
          <div className="animate-pulse bg-gray-200 rounded-xl h-16 w-full max-w-3xl rounded-2xl"></div>
        </div>
      </div>
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="animate-pulse bg-gray-200 rounded-xl h-10 w-64 mb-12 mx-auto"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-200 rounded-xl h-40 rounded-2xl bg-white"
                ></div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
