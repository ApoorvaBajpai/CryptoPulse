import Header from "../components/Header";
import NewsList from "../components/NewsList";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

export default function NewsPage() {
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

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-400">
                <Header
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    // These are not strictly needed for the news page but Header expects them
                    sort="market_cap"
                    order="desc"
                    setSort={() => { }}
                    setOrder={() => { }}
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

                    <div className="space-y-8">
                        <NewsList title="Global Crypto News" limit={12} />

                        <NewsList
                            title="Market Analysis & Regulatory"
                            search="regulation"
                            limit={6}
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            }
                        />

                        <NewsList
                            title="DeFi & Web3 Updates"
                            search="defi"
                            limit={6}
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            }
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
