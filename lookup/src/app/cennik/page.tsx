export const dynamic = 'force-dynamic'
import Link from 'next/link'
import {
	Check,
	Star,
	Link2,
	TrendingUp,
	FileText,
	Phone,
	Mail,
	Edit,
	BarChart3,
	BookOpen,
	Crown,
	ArrowRight,
	Zap,
	Target,
	Users,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata = {
	title: 'Cennik i Pakiety | Katalogo.pl',
	description: 'Porównaj pakiety i wybierz najlepszy dla swojej firmy. Od darmowego Start do pełnego pakietu Pro.',
}

export default function PricingPage() {
	return (
		<div className='min-h-screen bg-gray-50 font-sans'>
			<Navbar />

			{/* Hero */}
			<section className='pt-32 pb-16 px-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white'>
				<div className='container mx-auto max-w-6xl text-center'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-bold uppercase tracking-wide mb-6'>
						<Crown size={14} /> Wybierz Pakiet
					</div>
					<h1 className='text-4xl md:text-6xl font-extrabold mb-6 leading-tight'>
						Wznieś swoją firmę na wyższy poziom
					</h1>
					<p className='text-xl text-blue-100 max-w-2xl mx-auto'>
						Od darmowej wizytówki po pełny pakiet marketingowy. Wybierz to, czego potrzebujesz.
					</p>
				</div>
			</section>

			{/* Pricing Cards */}
			<section className='py-20 px-4'>
				<div className='container mx-auto max-w-7xl'>
					<div className='grid md:grid-cols-2 gap-8 lg:gap-12'>
						{/* Free Plan */}
						<div className='bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-200'>
							<div className='text-center mb-8'>
								<h2 className='text-2xl font-bold text-gray-900 mb-2'>Pakiet Start</h2>
								<div className='flex items-baseline justify-center gap-2 mb-4'>
									<span className='text-5xl font-extrabold text-gray-900'>0 zł</span>
									<span className='text-gray-500'>/rok</span>
								</div>
								<p className='text-sm text-gray-500'>Idealny na start</p>
							</div>

							<ul className='space-y-4 mb-8'>
								<li className='flex items-start gap-3'>
									<Check size={20} className='text-green-600 flex-shrink-0 mt-0.5' />
									<span className='text-gray-700'>Podstawowa wizytówka firmowa</span>
								</li>
								<li className='flex items-start gap-3'>
									<Check size={20} className='text-green-600 flex-shrink-0 mt-0.5' />
									<span className='text-gray-700'>Pozycjonowanie w 1 kategorii</span>
								</li>
								<li className='flex items-start gap-3'>
									<Check size={20} className='text-green-600 flex-shrink-0 mt-0.5' />
									<span className='text-gray-700'>Odbieranie opinii od klientów</span>
								</li>
								<li className='flex items-start gap-3'>
									<Check size={20} className='text-green-600 flex-shrink-0 mt-0.5' />
									<span className='text-gray-700'>Podstawowy opis (do 500 znaków)</span>
								</li>
							</ul>

							<Link
								href='/dodaj-firme'
								className='block w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors text-center'
							>
								Załóż za darmo
							</Link>
						</div>

						{/* Pro Plan - Featured */}
						<div className='bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-3xl p-8 shadow-2xl border-4 border-amber-400 relative overflow-hidden'>
							{/* Badge */}
							<div className='absolute top-6 right-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg'>
								Najpopularniejszy
							</div>

							{/* Crown Icon */}
							<div className='absolute -top-4 -right-4 w-24 h-24 bg-amber-400 rounded-full flex items-center justify-center opacity-20'>
								<Crown size={48} className='text-amber-900' />
							</div>

							<div className='text-center mb-8 relative z-10'>
								<h2 className='text-3xl font-black text-gray-900 mb-2 flex items-center justify-center gap-2'>
									<Crown size={28} className='text-amber-600' />
									Pakiet Pro
								</h2>
								<div className='flex items-baseline justify-center gap-2 mb-4'>
									<span className='text-6xl font-extrabold text-gray-900'>99 zł</span>
									<span className='text-gray-600 font-semibold'>/rok</span>
								</div>
								<p className='text-sm font-semibold text-gray-700 bg-white/60 px-3 py-1 rounded-full inline-block'>
									Wszystko, czego potrzebujesz do sukcesu
								</p>
							</div>

							<ul className='space-y-4 mb-8 relative z-10'>
								{/* All Free features */}
								<li className='flex items-start gap-3 opacity-60'>
									<Check size={20} className='text-green-600 flex-shrink-0 mt-0.5' />
									<span className='text-gray-700 text-sm'>Wszystko z pakietu Start</span>
								</li>

								<div className='border-t border-amber-300 my-4'></div>

								{/* Pro Features */}
								<ProFeature
									icon={<Link2 />}
									title='2-4 dodatkowe podstrony'
									desc='Oferta, Kontakt + 2 usługi - rozbuduj swój profil'
								/>
								<ProFeature
									icon={<Star />}
									title='Wyróżnienie w kategorii'
									desc='Odznaka "Rekomendowana firma" + wyższa pozycja w liście'
								/>
								<ProFeature
									icon={<FileText />}
									title='Rozszerzony opis'
									desc='Do 2000-3000 znaków - opowiedz pełną historię swojej firmy'
								/>
								<ProFeature
									icon={<Phone />}
									title='Lead Box Premium'
									desc='Klikalny telefon, email + przycisk "Wycenę usługi" (formularz)'
								/>
								<ProFeature
									icon={<Edit />}
									title='Edycja przez cały okres'
									desc='Pełna kontrola - edytuj samodzielnie lub przez panel'
								/>
								<ProFeature
									icon={<BarChart3 />}
									title='Raport roczny'
									desc='Link do wpisu + data odnowienia + liczba wyświetleń profilu'
								/>
								<ProFeature icon={<BookOpen />} title='2 artykuły blogowe' desc='30-dniowa promocja w blogu katalogo' />
								<ProFeature
									icon={<TrendingUp />}
									title='"Top kategorii" na 30 dni'
									desc='Bądź na szczycie listy w swojej kategorii'
								/>
							</ul>

							<Link
								href='/checkout'
								className='block w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all text-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1 relative z-10'
							>
								Wybierz Pro <ArrowRight size={18} className='inline ml-2' />
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Feature Details Section */}
			<section className='py-20 px-4 bg-white'>
				<div className='container mx-auto max-w-6xl'>
					<div className='text-center mb-16'>
						<h2 className='text-3xl md:text-4xl font-bold text-gray-900 mb-4'>
							Co dokładnie otrzymujesz w Pakiecie Pro?
						</h2>
						<p className='text-xl text-gray-600'>Szczegółowy przegląd wszystkich funkcji Premium</p>
					</div>

					<div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6'>
						<FeatureDetail
							icon={<Link2 className='text-blue-600' />}
							title='Dodatkowe podstrony'
							desc='2-4 dodatkowe linki do podstron: Oferta, Kontakt i 2 usługi. Rozbuduj swój profil i pokaż pełną ofertę.'
						/>
						<FeatureDetail
							icon={<Star className='text-amber-600' />}
							title='Wyróżnienie profilu'
							desc='Odznaka "Rekomendowana firma" + wyższa pozycja w wynikach wyszukiwania. Bądź widoczny jako pierwszy.'
						/>
						<FeatureDetail
							icon={<FileText className='text-green-600' />}
							title='Rozszerzony opis'
							desc='Do 2000-3000 znaków zamiast 500. Opowiedz pełną historię, pokaż doświadczenie i zbuduj zaufanie.'
						/>
						<FeatureDetail
							icon={<Target className='text-purple-600' />}
							title='Lead Box Premium'
							desc='Klikalny telefon, email + przycisk "Wycenę usługi". Formularz kontaktowy trafia bezpośrednio do Ciebie.'
						/>
						<FeatureDetail
							icon={<Edit className='text-indigo-600' />}
							title='Pełna edycja'
							desc='Edycja przez cały okres subskrypcji. Samodzielnie lub przez panel - pełna kontrola nad profilem.'
						/>
						<FeatureDetail
							icon={<BarChart3 className='text-red-600' />}
							title='Raport roczny'
							desc='Link do wpisu, data odnowienia i liczba wyświetleń profilu. Wiedza o skuteczności działań.'
						/>
						<FeatureDetail
							icon={<BookOpen className='text-teal-600' />}
							title='Promocja w blogu'
							desc='2 artykuły blogowe z 30-dniową promocją. Zwiększ swoją widoczność i pozycjonowanie SEO.'
						/>
						<FeatureDetail
							icon={<TrendingUp className='text-orange-600' />}
							title='Top kategorii'
							desc='Pozycja "Top kategorii" przez 30 dni. Bądź na szczycie listy w swojej branży.'
						/>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className='py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800 text-white'>
				<div className='container mx-auto max-w-4xl text-center'>
					<h2 className='text-3xl md:text-4xl font-bold mb-6'>Gotowy na więcej klientów?</h2>
					<p className='text-xl text-gray-300 mb-8'>Dołącz do setek firm, które już korzystają z Pakietu Pro</p>
					<div className='flex flex-col sm:flex-row gap-4 justify-center'>
						<Link
							href='/checkout'
							className='px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2'
						>
							<Crown size={20} />
							Wybierz Pakiet Pro
							<ArrowRight size={18} />
						</Link>
						<Link
							href='/dla-firm'
							className='px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/20'
						>
							Dowiedz się więcej
						</Link>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	)
}

function ProFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
	return (
		<li className='flex items-start gap-3 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-200'>
			<div className='text-amber-600 flex-shrink-0 mt-0.5'>{icon}</div>
			<div>
				<div className='font-bold text-gray-900 text-sm mb-1'>{title}</div>
				<div className='text-xs text-gray-600'>{desc}</div>
			</div>
		</li>
	)
}

function FeatureDetail({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
	return (
		<div className='bg-gray-50 p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all'>
			<div className='w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm'>{icon}</div>
			<h3 className='font-bold text-gray-900 mb-2'>{title}</h3>
			<p className='text-sm text-gray-600 leading-relaxed'>{desc}</p>
		</div>
	)
}
