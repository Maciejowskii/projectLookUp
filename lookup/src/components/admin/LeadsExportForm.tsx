"use client";

import { useState } from "react";
import { FileSpreadsheet, Download, Calendar } from "lucide-react";

export function LeadsExportForm() {
  const [dateRange, setDateRange] = useState<"day" | "week" | "month" | "all">("all");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateRange !== "all") {
        params.append("range", dateRange);
      }
      
      const url = `/admin/leads/export?${params.toString()}`;
      window.location.href = url;
      
      // Reset po krótkim czasie
      setTimeout(() => setIsExporting(false), 2000);
    } catch (error) {
      console.error("Błąd eksportu:", error);
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <FileSpreadsheet className="text-green-600" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Eksport do Excel/CSV</h3>
          <p className="text-sm text-gray-500">Wybierz zakres dat do eksportu</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setDateRange("day")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              dateRange === "day"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Dzisiaj
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              dateRange === "week"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ostatni tydzień
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              dateRange === "month"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ostatni miesiąc
          </button>
          <button
            onClick={() => setDateRange("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              dateRange === "all"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Wszystkie
          </button>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Eksportowanie...
            </>
          ) : (
            <>
              <Download size={18} />
              Pobierz Excel/CSV
            </>
          )}
        </button>

        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Calendar size={14} />
          {dateRange === "day" && "Eksportuj leady z dzisiaj"}
          {dateRange === "week" && "Eksportuj leady z ostatnich 7 dni"}
          {dateRange === "month" && "Eksportuj leady z ostatnich 30 dni"}
          {dateRange === "all" && "Eksportuj wszystkie leady"}
        </div>
      </div>
    </div>
  );
}
