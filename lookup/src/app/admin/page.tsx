"use client"; // Wykresy wymagają "use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  MapPin,
  Activity,
} from "lucide-react";

// Przykładowe dane (w przyszłości podepniemy API)
const growthData = [
  { name: "Sty", firmy: 120, leady: 5 },
  { name: "Lut", firmy: 350, leady: 12 },
  { name: "Mar", firmy: 890, leady: 45 },
  { name: "Kwi", firmy: 1400, leady: 89 },
  { name: "Maj", firmy: 2100, leady: 156 },
  { name: "Cze", firmy: 3400, leady: 310 },
];

const planData = [
  { name: "Darmowy", value: 3100 },
  { name: "Premium (Płatny)", value: 300 },
];

const COLORS = ["#E5E7EB", "#2563EB"]; // Szary dla Free, Niebieski dla Premium

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Przegląd statystyk Twojego imperium biznesowego.
          </p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none">
            <option>Ostatnie 30 dni</option>
            <option>Ten rok</option>
            <option>Cały okres</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Wszystkie Firmy"
          value="3,450"
          change="+12%"
          icon={<Building2 size={24} />}
          color="bg-blue-500"
        />
        <KPICard
          title="Leady B2B"
          value="310"
          change="+24%"
          icon={<Users size={24} />}
          color="bg-purple-500"
        />
        <KPICard
          title="Przychód MRR"
          value="14,900 zł"
          change="+8%"
          icon={<DollarSign size={24} />}
          color="bg-green-500"
        />
        <KPICard
          title="Wskaźnik weryfikacji"
          value="8.7%"
          change="+1.2%"
          icon={<Activity size={24} />}
          color="bg-orange-500"
        />
      </div>

      {/* WYKRESY - GŁÓWNA SEKCJA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DUŻY WYKRES LINIOWY (2/3 szerokości) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Wzrost bazy firm i leadów
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F3F4F6"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="firmy"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#2563EB",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 8 }}
                  name="Liczba Firm"
                />
                <Line
                  type="monotone"
                  dataKey="leady"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#8B5CF6",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  name="Leady"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MAŁY WYKRES KOŁOWY (1/3 szerokości) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-2">
            Monetyzacja (Free vs Premium)
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Jaki procent firm płaci za pakiet?
          </p>

          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* Tekst w środku pączka */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="block text-3xl font-bold text-gray-900">
                8.7%
              </span>
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Konwersja
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-gray-600">Premium</span>
              </div>
              <span className="font-bold">300 firm</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <span className="text-gray-600">Darmowe</span>
              </div>
              <span className="font-bold">3,100 firm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponent pomocniczy dla kart KPI
function KPICard({ title, value, change, icon, color }: any) {
  const isPositive = change.startsWith("+");

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div
          className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.replace(
            "bg-",
            ""
          )}`}
        >
          {/* Hack dla Tailwind: dynamiczne kolory czasami nie działają, więc używamy text-blue-600 w className obok, ale tu upraszczam */}
          <div className="text-gray-900 opacity-80">{icon}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            isPositive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {change}
        </span>
        <span className="text-xs text-gray-400">od zeszłego miesiąca</span>
      </div>
    </div>
  );
}
