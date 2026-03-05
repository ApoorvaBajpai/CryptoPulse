import { useState } from "react";
import type { Coin } from "../types/coin";
import { useNavigate } from "react-router-dom";
import { buyCoin } from "../api/portfolio";
import { useToast } from "../context/ToastContext";
import { useCurrency } from "../context/CurrencyContext";

type Props = {
  coin: Coin;
  rank: number;
};

export default function MarketRow({ coin, rank }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { format } = useCurrency();
  const changeColor =
    coin.percent_change_24h > 0 ? "text-green-600" : "text-red-500";

  const [isBuying, setIsBuying] = useState(false);
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);

  const handleBuy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    try {
      setLoading(true);
      await buyCoin(
        String(coin.id),
        coin.symbol,
        Number(qty),
        coin.price
      );
      setIsBuying(false);
      setQty("1");
      showToast(`Successfully bought ${qty} ${coin.symbol}`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to buy coin", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr onClick={() => navigate(`/coin/${coin.id}`)}
      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer group">
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">#{rank}</td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center font-bold text-indigo-600 text-sm">
            {coin.symbol.substring(0, 2)}
          </div>

          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{coin.symbol}</div>
            <div className="text-gray-500 text-xs">{coin.name}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
        {format(coin.price)}
      </td>

      <td className={`px-4 py-3 font-medium ${changeColor}`}>
        {coin.percent_change_24h > 0 ? "+" : ""}
        {coin.percent_change_24h.toFixed(2)}%
      </td>

      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
        {format(coin.market_cap)}
      </td>

      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
        {format(coin.volume_24h)}
      </td>


      <td className="px-4 py-3">
        {isBuying ? (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-16 px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Qty"
              min="0"
              step="any"
              autoFocus
            />
            <button
              onClick={handleBuy}
              disabled={loading}
              className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsBuying(false); }}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 font-bold"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBuying(true);
            }}
            className="px-4 py-1.5 text-sm font-medium border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition opacity-0 group-hover:opacity-100"
          >
            Buy
          </button>
        )}
      </td>
    </tr>
  );
}
