import Auth from "./pages/Auth";
import Header from "./components/Header";
import MarketTable from "./components/MarketTable";
import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import CoinDetails from "./pages/CoinDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Portfolio from "./pages/Portfolio";
import { authFetch } from "./api/base";
import NewsPage from "./pages/NewsPage";


export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coins, setCoins] = useState<any[]>([]);
  const [sort, setSort] = useState<"market_cap" | "price" | "volume_24h" | "rank">("market_cap");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (!user) return;

    const fetchCoins = async () => {
      let url = "http://localhost:5000/api/coins/listings-with-info";
      const params = new URLSearchParams();

      if (sort !== "rank") {
        params.append("sort", sort);
        params.append("order", order);
      }

      if (params.toString()) url += `?${params.toString()}`;

      const data = await authFetch(url);
      setCoins(data);
    };

    fetchCoins().catch(err => console.error("API error:", err));
  }, [sort, order, user]);


  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);


  return (
    <Routes>
      {/* PUBLIC AUTH PAGE */}
      <Route path="/auth" element={<Auth />} />

      {/* PROTECTED MARKET PAGE */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-400">
              <Header
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                sort={sort}
                order={order}
                setSort={setSort}
                setOrder={setOrder}
              />

              <div className="px-8 py-4">
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => navigate("/")}
                    className={`px-6 py-2 rounded-xl shadow-sm font-medium transition ${window.location.pathname === '/' ? 'bg-indigo-600 text-white' : 'bg-white border hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => navigate("/portfolio")}
                    className={`px-6 py-2 rounded-xl shadow-sm font-medium transition ${window.location.pathname === '/portfolio' ? 'bg-indigo-600 text-white' : 'bg-white border hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                  >
                    Portfolio
                  </button>
                  <button
                    onClick={() => navigate("/news")}
                    className={`px-6 py-2 rounded-xl shadow-sm font-medium transition ${window.location.pathname === '/news' ? 'bg-indigo-600 text-white' : 'bg-white border hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'}`}
                  >
                    News
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-8 border border-gray-100 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">Market</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Click a row for full details page.
                  </p>


                  <MarketTable coins={coins} />
                </div>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      {/* PROTECTED DETAILS PAGE */}
      <Route
        path="/coin/:id"
        element={
          <ProtectedRoute>
            <CoinDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/portfolio"
        element={
          <Portfolio />
        }
      />

      <Route
        path="/news"
        element={
          <NewsPage />
        }
      />
    </Routes>
  );
}
