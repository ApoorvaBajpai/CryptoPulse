const request = require("supertest");
const express = require("express");
const axios = require("axios");
const newsRoutes = require("../routes/news");
const { newsCache } = require("../services/cacheService");

jest.mock("axios");

const app = express();
app.use(express.json());
app.use("/api/news", newsRoutes);

describe("News API Unit Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        newsCache.clear();
    });

    test("GET /api/news - should fetch news successfully", async () => {
        const mockNewsResponse = {
            data: {
                data: [
                    {
                        title: "Crypto News 1",
                        source: "Source 1",
                        image_url: "http://image1.com",
                        url: "http://news1.com",
                        published_at: "2023-01-01T00:00:00Z",
                        entities: [{ sentiment_score: 0.5 }]
                    }
                ]
            }
        };
        axios.get.mockResolvedValue(mockNewsResponse);

        const res = await request(app).get("/api/news");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe("Crypto News 1");
        expect(res.body[0].sentiment).toBe(0.5);
    });

    test("GET /api/news - should fetch news with symbols successfully", async () => {
        const mockNewsResponse = {
            data: {
                data: []
            }
        };
        axios.get.mockResolvedValue(mockNewsResponse);

        const res = await request(app).get("/api/news").query({ symbols: "BTC,ETH" });

        expect(res.statusCode).toBe(200);
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining("marketaux.com"),
            expect.objectContaining({
                params: expect.objectContaining({
                    symbols: "CC:BTC,CC:ETH"
                })
            })
        );
    });

    test("GET /api/news - should return empty array if no data", async () => {
        axios.get.mockResolvedValue({ data: {} });

        const res = await request(app).get("/api/news");

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    test("GET /api/news - should return 500 on API failure", async () => {
        axios.get.mockRejectedValue(new Error("API failure"));

        const res = await request(app).get("/api/news");

        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe("Failed to fetch news");
    });
});
