import React from 'react'

export function CompanyListSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 10 }).map((_, i) => (
				<div
					key={i}
					className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse"
				>
					<div className="flex justify-between items-start gap-3">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-2">
								<div className="h-4 w-20 bg-gray-200 rounded"></div>
								<div className="h-4 w-16 bg-gray-200 rounded"></div>
							</div>
							<div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
							<div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
							<div className="h-4 w-2/3 bg-gray-200 rounded"></div>
						</div>
					</div>
					<div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
						<div className="h-4 w-24 bg-gray-200 rounded"></div>
						<div className="h-4 w-20 bg-gray-200 rounded"></div>
					</div>
				</div>
			))}
		</div>
	)
}

export function CompanyCardSkeleton() {
	return (
		<div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 animate-pulse">
			<div className="flex flex-col md:flex-row gap-6 items-start">
				<div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-xl flex-shrink-0"></div>
				<div className="flex-grow">
					<div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
					<div className="h-4 w-1/2 bg-gray-200 rounded mb-4"></div>
					<div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
					<div className="h-4 w-2/3 bg-gray-200 rounded"></div>
				</div>
			</div>
		</div>
	)
}

export function CompanyGridSkeleton() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse"
				>
					<div className="h-4 w-20 bg-gray-200 rounded mb-4"></div>
					<div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
					<div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
					<div className="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
					<div className="h-4 w-1/2 bg-gray-200 rounded"></div>
				</div>
			))}
		</div>
	)
}
