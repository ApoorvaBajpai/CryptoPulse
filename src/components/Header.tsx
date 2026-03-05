type Props = {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  sort: string;
  order: string;
  setSort: (value: "market_cap" | "price" | "volume_24h" | "rank") => void;
  setOrder: (value: "asc" | "desc") => void;
};



import { useCurrency } from "../context/CurrencyContext";

export default function Header({
  darkMode,
  setDarkMode,
  sort,
  order,
  setSort,
  setOrder,
}: Props) {
  const { currency, setCurrency } = useCurrency();

  return (
    <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-6 px-8 pt-6 pb-3">
        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
          B
        </div>

        <div className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Markets · Portfolio · News
        </div>
      </div>

      <div className="flex items-center justify-between px-8 pb-6">
        <input
          type="text"
          placeholder="Search coin or symbol"
          className="px-4 py-2 rounded-xl border w-80 shadow-sm outline-none
                     bg-white dark:bg-gray-800
                     border-gray-300 dark:border-gray-700
                     text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex items-center gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            className="px-3 py-2 rounded-xl border shadow-sm
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="USD">USD ($)</option>
            <option value="INR">INR (₹)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-");
              setSort(field as any);
              setOrder(dir as any);
            }}
            className="px-3 py-2 rounded-xl border shadow-sm
             bg-white dark:bg-gray-800
             border-gray-300 dark:border-gray-700
             text-gray-900 dark:text-white"
          >
            <option value="market_cap-desc">Market Cap ↓</option>
            <option value="market_cap-asc">Market Cap ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="price-asc">Price ↑</option>
            <option value="volume_24h-desc">Volume ↓</option>
            <option value="volume_24h-asc">Volume ↑</option>
          </select>


          {/* Refresh */}
          <button
            className="px-4 py-2 rounded-xl border shadow-sm
                       bg-gray-100 hover:bg-gray-200
                       dark:bg-gray-700 dark:hover:bg-gray-600
                       border-gray-300 dark:border-gray-600
                       text-gray-900 dark:text-white"
          >
            ↻ Refresh
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-2 rounded-xl border shadow-sm
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       text-gray-900 dark:text-white
                       hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? "🌙 Dark" : "☀️ Light"}
          </button>

        </div>
      </div>
    </header>
  );
}
