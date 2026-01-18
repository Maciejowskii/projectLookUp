import fs from "fs";
import path from "path";
import { Terminal, RefreshCw } from "lucide-react";

export default async function AdminLogsPage() {
  const logPath = path.join(process.cwd(), "scraper.log");
  let logs = "";

  try {
    // Czytamy ostatnie 10000 znaków, żeby nie zamulić
    if (fs.existsSync(logPath)) {
      logs = fs.readFileSync(logPath, "utf-8");
      // Opcjonalnie: przytnij do ostatnich linii
      const lines = logs.split("\n").slice(-50);
      logs = lines.join("\n");
    } else {
      logs =
        "Plik scraper.log nie istnieje. Uruchom scraper, aby wygenerować logi.";
    }
  } catch (error) {
    logs = "Błąd odczytu logów.";
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Terminal className="text-gray-500" /> Logi Systemowe
          </h1>
          <p className="text-sm text-gray-500">
            Podgląd działania botów w czasie rzeczywistym.
          </p>
        </div>
        <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex-1 bg-gray-900 rounded-2xl p-6 overflow-hidden shadow-2xl flex flex-col border border-gray-700">
        <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-xs text-gray-500 font-mono">
            root@server:~/project/scraper.log
          </span>
        </div>
        <pre className="flex-1 overflow-auto font-mono text-xs md:text-sm text-green-400 leading-relaxed scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {logs}
        </pre>
      </div>
    </div>
  );
}
