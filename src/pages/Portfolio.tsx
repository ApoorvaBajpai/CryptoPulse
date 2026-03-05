import { useEffect, useState } from "react";
import { getPortfolio, buyCoin, sellCoin } from "../api/portfolio";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useCurrency } from "../context/CurrencyContext";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header"; // I noticed Header was missing in Portfolio but maybe it should be there?


import { getMarketPrices } from "../api/market";

type Holding = {
  coinId: string;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
};

type PortfolioData = {
  holdings: Holding[];
};

export default function Portfolio() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { format } = useCurrency();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(false);

  // For interaction
  const [activeAction, setActiveAction] = useState<{ id: string, type: 'buy' | 'sell' } | null>(null);
  const [actionQty, setActionQty] = useState("1");
  const [actionLoading, setActionLoading] = useState(false);

  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const loadPortfolio = async () => {
      try {
        setIsStale(false);
        const data = await getPortfolio();
        setPortfolio(data);
      } catch (err: any) {
        setError(err.message || "Failed to load portfolio");
        console.error("Portfolio fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [authLoading, user, reload]);

  useEffect(() => {
    if (!user) return;
    const loadPrices = async () => {
      try {
        const data = await getMarketPrices();
        const map: Record<string, number> = {};
        data.forEach((c: any) => { map[c.symbol] = c.price; });
        setPriceMap(map);
      } catch (err) {
        setIsStale(true);
        console.error("Price fetch failed:", err);
      }
    };
    loadPrices();
  }, [user, reload]); // Added reload here to refresh prices when buy/sell happens since it clears cache

  const handleAction = async (coin: Holding) => {
    if (!activeAction || actionLoading) return;
    setActionLoading(true);
    try {
      if (activeAction.type === 'buy') {
        const currentPrice = priceMap[coin.symbol] || coin.avgBuyPrice;
        await buyCoin(coin.coinId, coin.symbol, Number(actionQty), currentPrice);
        showToast(`Bought ${actionQty} ${coin.symbol} successfully`);
      } else {
        await sellCoin(coin.coinId, Number(actionQty));
        showToast(`Sold ${actionQty} ${coin.symbol} successfully`);
      }
      setReload(!reload);
      setActiveAction(null);
      setActionQty("1");
    } catch (err: any) {
      showToast(err.message || "Transaction failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-indigo-600 font-medium">Loading assets...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Login Required</h2>
        <p className="text-gray-500 mb-8 max-w-xs text-center">Please sign in to view your portfolio and start tracking your assets.</p>
        <button
          onClick={() => navigate("/auth")}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (error && !portfolio) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 mb-6">
          <p className="font-bold">Connection Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={() => setReload(!reload)} className="text-indigo-600 font-bold underline">Retry</button>
      </div>
    );
  }

  if (!portfolio || portfolio.holdings.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">💰</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Empty Portfolio</h2>
        <p className="text-gray-500 mb-8 max-w-xs text-center">Build your wealth by adding some assets from the crypto market.</p>
        <button onClick={() => navigate("/")} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">
          Explore Market
        </button>
      </div>
    );
  }

  const totalInvested = portfolio.holdings.reduce(
    (sum, coin) => sum + coin.quantity * coin.avgBuyPrice,
    0
  );

  const totalCurrentValue = portfolio.holdings.reduce((sum, coin) => {
    const currentPrice = priceMap[coin.symbol] || 0;
    return sum + coin.quantity * currentPrice;
  }, 0);

  const profitLoss = totalCurrentValue - totalInvested;
  const plPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 text-gray-900 dark:text-white">
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sort="market_cap"
        order="desc"
        setSort={() => { }}
        setOrder={() => { }}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-0">
        <div className="flex gap-4 mb-8 mt-4">
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

        <div className="flex justify-end items-center mb-6">
          {isStale && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-100 dark:border-amber-800 animate-pulse">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              API OFFLINE - VIEWING CACHED DATA
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">My Portfolio</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and track your crypto investments in one place.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-8 items-center">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Invested</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{format(totalInvested)}</p>
            </div>

            <div className="w-px h-10 bg-gray-100 dark:bg-gray-700 hidden sm:block"></div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Net Worth</p>
              <p className="text-xl font-bold text-indigo-600">{format(totalCurrentValue)}</p>
            </div>

            <div className="w-px h-10 bg-gray-100 dark:bg-gray-700 hidden sm:block"></div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">P/L Overview</p>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${profitLoss >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {profitLoss >= 0 ? "+" : "-"}{format(Math.abs(profitLoss))}
                </span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${profitLoss >= 0 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"}`}>
                  {plPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4 text-left text-gray-600 dark:text-gray-400 font-semibold tracking-wide">Asset</th>
                  <th className="p-4 text-center text-gray-600 dark:text-gray-400 font-semibold tracking-wide">Quantity</th>
                  <th className="p-4 text-center text-gray-600 dark:text-gray-400 font-semibold tracking-wide">Avg Price</th>
                  <th className="p-4 text-center text-gray-600 dark:text-gray-400 font-semibold tracking-wide">Current Price</th>
                  <th className="p-4 text-center text-gray-600 dark:text-gray-400 font-semibold tracking-wide">P/L</th>
                  <th className="p-4 text-right text-gray-600 dark:text-gray-400 font-semibold tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {portfolio.holdings.map((coin) => {
                  const currentPrice = priceMap[coin.symbol] || 0;
                  const invested = coin.quantity * coin.avgBuyPrice;
                  const currentValue = coin.quantity * currentPrice;
                  const coinPL = currentValue - invested;
                  const coinPLPercent = invested > 0 ? (coinPL / invested) * 100 : 0;

                  return (
                    <tr key={coin.coinId} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center font-bold text-indigo-600 text-sm">
                            {coin.symbol}
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white uppercase">{coin.symbol}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium text-gray-700 dark:text-gray-300">{coin.quantity}</td>
                      <td className="p-4 text-center font-medium text-gray-700 dark:text-gray-300">
                        {format(coin.avgBuyPrice)}
                      </td>
                      <td className="p-4 text-center font-medium text-indigo-600">
                        {format(currentPrice)}
                      </td>
                      <td className="p-4 text-center">
                        <div className={`font-bold ${coinPL >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {coinPL >= 0 ? "+" : "-"}{format(Math.abs(coinPL))}
                        </div>
                        <div className={`text-xs ${coinPL >= 0 ? "text-green-500" : "text-red-400"}`}>
                          {coinPLPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-end gap-2">
                          {activeAction?.id === coin.coinId ? (
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                              <input
                                type="number"
                                value={actionQty}
                                onChange={(e) => setActionQty(e.target.value)}
                                className="w-20 px-2 py-1 bg-white dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAction(coin)}
                                disabled={actionLoading}
                                className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {actionLoading ? '...' : activeAction.type === 'buy' ? 'Buy' : 'Sell'}
                              </button>
                              <button
                                onClick={() => setActiveAction(null)}
                                className="text-gray-400 px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setActiveAction({ id: coin.coinId, type: 'buy' }); setActionQty("1"); }}
                                className="px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                              >
                                Buy More
                              </button>
                              <button
                                onClick={() => { setActiveAction({ id: coin.coinId, type: 'sell' }); setActionQty(coin.quantity.toString()); }}
                                className="px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-800 text-red-500 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                              >
                                Sell
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
