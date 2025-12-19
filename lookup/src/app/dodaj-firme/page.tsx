import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default async function AddCompanyPage() {
  async function createCompany(formData: FormData) {
    "use server";
    
    // Twoja logika tworzenia (bez zmian)
    const rawData = {
      name: formData.get("name") as string,
      nip: formData.get("nip") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      city: formData.get("city") as string,
    };

    const defaultTenant = await prisma.tenant.findFirst();
    const defaultCategory = await prisma.category.findFirst({
      where: { tenantId: defaultTenant?.id },
    });

    if (!defaultTenant || !defaultCategory) return;

    await prisma.company.create({
      data: {
        name: rawData.name,
        slug: rawData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        nip: rawData.nip,
        email: rawData.email,
        phone: rawData.phone,
        city: rawData.city,
        address: "Do uzupełnienia",
        zip: "00-000",
        tenantId: defaultTenant.id,
        categoryId: defaultCategory.id,
        isVerified: false,
      },
    });

    redirect("/dziekujemy"); // Upewnij się, że masz stronę /dziekujemy
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex-grow flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px] relative z-10 border border-white/50">
          
          {/* Kolumna Lewa - Formularz */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
              Darmowa wizytówka
            </h1>
            <p className="text-gray-500 mb-8">
              Wypełnij dane, aby dołączyć do bazy LookUp w 30 sekund.
            </p>

            <form action={createCompany} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Nazwa firmy</label>
                <input name="name" type="text" required placeholder="np. Auto-Naprawa Nowak" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">NIP</label>
                  <input name="nip" type="text" required placeholder="000-000-00-00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Miasto</label>
                  <input name="city" type="text" required placeholder="np. Kraków" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900" />
                </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Telefon</label>
                  <input name="phone" type="text" placeholder="+48 000 000 000" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900" />
               </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Email kontaktowy</label>
                <input name="email" type="email" required placeholder="biuro@firma.pl" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900" />
              </div>

              <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group mt-4 shadow-xl shadow-gray-900/10">
                Dodaj firmę <ArrowRight size={18} className="text-gray-400 group-hover:text-white transition-colors" />
              </button>
              
              <p className="text-xs text-center text-gray-400 mt-4 font-medium">
                Klikając, akceptujesz <Link href="/legal/regulamin" className="underline hover:text-gray-600">Regulamin</Link>.
              </p>
            </form>
          </div>

          {/* Kolumna Prawa */}
          <div className="hidden md:flex flex-col justify-center h-full bg-blue-600 text-white p-12 lg:p-16 relative overflow-hidden">
             {/* Tu bez zmian, tylko tło i layout */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 opacity-20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
             
             <div className="relative z-10">
               <h2 className="text-3xl font-bold mb-8">Dlaczego warto?</h2>
               <ul className="space-y-6">
                 {/* List items same as before */}
                 <li className="flex items-start gap-4"><div className="bg-white/20 p-2 rounded-lg mt-1"><CheckCircle2 className="text-white" size={20} /></div><div><h3 className="font-bold text-lg">Więcej klientów</h3><p className="text-blue-100 text-sm leading-relaxed mt-1">Twoja wizytówka wyświetla się osobom szukającym usług w Twojej okolicy.</p></div></li>
                 <li className="flex items-start gap-4"><div className="bg-white/20 p-2 rounded-lg mt-1"><CheckCircle2 className="text-white" size={20} /></div><div><h3 className="font-bold text-lg">Pozycjonowanie SEO</h3><p className="text-blue-100 text-sm leading-relaxed mt-1">Wysoka pozycja w Google dzięki autorytetowi domeny LookUp.</p></div></li>
                 <li className="flex items-start gap-4"><div className="bg-white/20 p-2 rounded-lg mt-1"><CheckCircle2 className="text-white" size={20} /></div><div><h3 className="font-bold text-lg">Opinie i Zaufanie</h3><p className="text-blue-100 text-sm leading-relaxed mt-1">Zbieraj gwiazdki i buduj wizerunek profesjonalisty.</p></div></li>
               </ul>
             </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
