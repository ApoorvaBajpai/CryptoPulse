import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type CoinDetailsData = {
    id: string;
    name: string;
    symbol: string;
    logo: string;
    description: string;
    website: string;
    price: number;
    percent_change_1h: number;
    percent_change_24h: number;
    percent_change_7d: number;
    market_cap: number;
    volume_24h: number;
};

type ChartDataPoint = {
    time: number;
    price: number;
};

import { getCoinDetails, getCoinChart } from "../api/market";

export default function CoinDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [coin, setCoin] = useState<CoinDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const { format } = useCurrency();

    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [chartDays, setChartDays] = useState("7");
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState("");

    useEffect(() => {
        if (!id) return;
        getCoinDetails(id)
            .then(data => { setCoin(data); setLoading(false); })
            .catch(err => { console.error("Failed to fetch coin details", err); setLoading(false); });
    }, [id]);

    useEffect(() => {
        if (!id) return;
        setChartLoading(true);
        setChartError("");
        getCoinChart(id, chartDays)
            .then(data => { setChartData(data.prices || []); })
            .catch(err => { console.error("Chart fetch failed:", err); setChartError("Chart data unavailable"); setChartData([]); })
            .finally(() => setChartLoading(false));
    }, [id, chartDays]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading coin details...</p>
                </div>
            </div>
        );
    }

    if (!coin) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">😞</span>
                    </div>
                    <p className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Failed to load coin details</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Please check the connection and try again.</p>
                    <button
                        onClick={() => navigate("/")}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                    >
                        Back to Market
                    </button>
                </div>
            </div>
        );
    }

    const isPositive24h = coin.percent_change_24h >= 0;
    const isChartUp = chartData.length > 1 && chartData[chartData.length - 1]?.price >= chartData[0]?.price;
    const chartColor = isChartUp ? "#10b981" : "#ef4444";

    const getChangeColor = (change: number) =>
        change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400";

    const getChangeBadgeBg = (change: number) =>
        change >= 0
            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 text-gray-900 dark:text-gray-100 pb-12">
            {/* Top bar */}
            <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-6xl mx-auto px-8 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition group text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Market
                    </button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <img src={coin.logo} alt={coin.name} className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{coin.name}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{coin.symbol}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 py-8">
                {/* Coin Header Card */}
                <div className="bg-gradient-to-r from-white via-indigo-50/40 to-white dark:from-gray-800 dark:via-indigo-950/20 dark:to-gray-800 rounded-3xl shadow-sm p-8 border border-indigo-100/60 dark:border-gray-700 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-900/30 dark:to-sky-900/20 flex items-center justify-center p-2 ring-1 ring-indigo-100/50 dark:ring-indigo-800/30">
                                <img src={coin.logo} alt={coin.name} className="w-12 h-12" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{coin.name}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{coin.symbol}</p>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                {format(coin.price)}
                            </span>
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getChangeBadgeBg(coin.percent_change_24h)}`}>
                                {isPositive24h ? '↑' : '↓'} {Math.abs(coin.percent_change_24h).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Market Cap */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 border-l-4 border-l-indigo-400/60 dark:border-l-indigo-500/40 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Market Cap</p>
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{format(coin.market_cap)}</p>
                    </div>

                    {/* 24h Volume */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 border-l-4 border-l-sky-400/60 dark:border-l-sky-500/40 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">24h Volume</p>
                            <div className="w-8 h-8 bg-sky-50 dark:bg-sky-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-sky-500 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{format(coin.volume_24h)}</p>
                    </div>

                    {/* 24h Change */}
                    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 border-l-4 hover:shadow-md transition-shadow duration-200 ${coin.percent_change_24h >= 0 ? 'border-l-emerald-400/60 dark:border-l-emerald-500/40' : 'border-l-rose-400/60 dark:border-l-rose-500/40'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">24h Change</p>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${coin.percent_change_24h >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                                <svg className={`w-4 h-4 ${getChangeColor(coin.percent_change_24h)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={coin.percent_change_24h >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                                </svg>
                            </div>
                        </div>
                        <p className={`text-xl font-bold ${getChangeColor(coin.percent_change_24h)}`}>
                            {coin.percent_change_24h >= 0 ? '+' : ''}{coin.percent_change_24h.toFixed(2)}%
                        </p>
                    </div>
                </div>

                {/* Price Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                            Price Chart
                        </h3>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-0.5">
                            {["1", "7", "30", "90"].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setChartDays(d)}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${chartDays === d
                                        ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                        }`}
                                >
                                    {d === "1" ? "24H" : d === "7" ? "7D" : d === "30" ? "30D" : "90D"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {chartLoading ? (
                        <div className="h-72 flex items-center justify-center">
                            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                Loading chart...
                            </div>
                        </div>
                    ) : chartError || chartData.length === 0 ? (
                        <div className="h-72 flex items-center justify-center">
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                {chartError || "No chart data available for this coin"}
                            </p>
                        </div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                                            <stop offset="100%" stopColor={chartColor} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        tickFormatter={(t) => {
                                            const d = new Date(t);
                                            if (chartDays === "1") return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                        }}
                                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                        minTickGap={40}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        tickFormatter={(v) => {
                                            if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
                                            if (v >= 1) return `$${v.toFixed(0)}`;
                                            return `$${v.toFixed(4)}`;
                                        }}
                                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={60}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255,255,255,0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '8px 12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            fontSize: '12px',
                                        }}
                                        labelFormatter={(t) => new Date(t).toLocaleString()}
                                        formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke={chartColor}
                                        strokeWidth={2}
                                        fill="url(#priceGradient)"
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Performance & Website Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Short-term Performance */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                            Short-term Performance
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400">1 Hour</span>
                                <span className={`text-sm font-bold ${getChangeColor(coin.percent_change_1h)}`}>
                                    {coin.percent_change_1h >= 0 ? '+' : ''}{coin.percent_change_1h.toFixed(2)}%
                                </span>
                            </div>
                            <div className="w-full h-px bg-gray-100 dark:bg-gray-700"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400">24 Hours</span>
                                <span className={`text-sm font-bold ${getChangeColor(coin.percent_change_24h)}`}>
                                    {coin.percent_change_24h >= 0 ? '+' : ''}{coin.percent_change_24h.toFixed(2)}%
                                </span>
                            </div>
                            <div className="w-full h-px bg-gray-100 dark:bg-gray-700"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400">7 Days</span>
                                <span className={`text-sm font-bold ${getChangeColor(coin.percent_change_7d)}`}>
                                    {coin.percent_change_7d >= 0 ? '+' : ''}{coin.percent_change_7d.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Website */}
                    {coin.website ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                                Official Resources
                            </h3>
                            <a
                                href={coin.website}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group border border-indigo-100/60 dark:border-indigo-800/30"
                            >
                                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    Visit Official Website
                                </span>
                                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                            <p className="text-sm text-gray-400 dark:text-gray-500">No official website available</p>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-8 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                        About {coin.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {coin.description}
                    </p>
                </div>
            </div>
        </div>
    );
}
