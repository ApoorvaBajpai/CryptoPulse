import MarketRow from "./MarketRow";
import type { Coin } from "../types/coin";

type Props = {
  coins: Coin[];
};

export default function MarketTable({ coins }: Props) {
  if (!coins.length) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-400">
        Loading market data...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full bg-white dark:bg-gray-800 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 text-sm font-semibold">#</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 text-sm font-semibold">Name</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 text-sm font-semibold">Price</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 text-sm font-semibold">24h</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 text-sm font-semibold">Market Cap</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 text-sm font-semibold">Volume</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>

        <tbody>
          {coins.map((coin, index) => (
            <MarketRow
              key={coin.id}
              coin={coin}
              rank={index + 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
