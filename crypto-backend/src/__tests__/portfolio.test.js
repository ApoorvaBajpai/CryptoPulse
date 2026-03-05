const request = require("supertest");
const express = require("express");
const portfolioRoutes = require("../routes/portfolio");
const Portfolio = require("../models/Portfolio");

// Mock the model
jest.mock("../models/Portfolio");

// Mock authMiddleware to skip actual Firebase token verification
jest.mock("../../middleware/authMiddleware", () => (req, res, next) => {
    req.user = { uid: "test-user-123" };
    next();
});

const app = express();
app.use(express.json());
app.use("/api/portfolio", portfolioRoutes);

describe("Portfolio Unit Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. Buy a new coin
    test("POST /api/portfolio/buy - should add a new coin to portfolio", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app)
            .post("/api/portfolio/buy")
            .send({ coinId: "bitcoin", symbol: "BTC", quantity: 1, price: 60000 });

        expect(res.statusCode).toBe(200);
        expect(mockPortfolio.holdings).toHaveLength(1);
        expect(mockPortfolio.holdings[0].symbol).toBe("BTC");
        expect(mockPortfolio.save).toHaveBeenCalled();
    });

    // 2. Buy more of an existing coin (Weighted Average)
    test("POST /api/portfolio/buy - should update quantity and avg price for existing coin", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [
                { coinId: "bitcoin", symbol: "BTC", quantity: 1, avgBuyPrice: 40000 }
            ],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app)
            .post("/api/portfolio/buy")
            .send({ coinId: "bitcoin", symbol: "BTC", quantity: 1, price: 60000 });

        expect(res.statusCode).toBe(200);
        expect(mockPortfolio.holdings[0].quantity).toBe(2);
        // Weighted Average Calculation: (1 * 40000 + 1 * 60000) / 2 = 50000
        expect(mockPortfolio.holdings[0].avgBuyPrice).toBe(50000);
        expect(mockPortfolio.save).toHaveBeenCalled();
    });

    // 3. Sell a portion of a coin
    test("POST /api/portfolio/sell - should decrease quantity of an existing coin", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [
                { coinId: "bitcoin", symbol: "BTC", quantity: 2, avgBuyPrice: 50000 }
            ],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app)
            .post("/api/portfolio/sell")
            .send({ coinId: "bitcoin", quantity: 0.5 });

        expect(res.statusCode).toBe(200);
        expect(mockPortfolio.holdings[0].quantity).toBe(1.5);
        expect(mockPortfolio.save).toHaveBeenCalled();
    });

    // 4. Sell all of a coin (removes from holdings)
    test("POST /api/portfolio/sell - should remove coin if quantity reaching zero", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [
                { coinId: "bitcoin", symbol: "BTC", quantity: 1, avgBuyPrice: 50000 }
            ],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app)
            .post("/api/portfolio/sell")
            .send({ coinId: "bitcoin", quantity: 1 });

        expect(res.statusCode).toBe(200);
        expect(mockPortfolio.holdings).toHaveLength(0);
        expect(mockPortfolio.save).toHaveBeenCalled();
    });

    // 5. GET user portfolio
    test("GET /api/portfolio - should return user portfolio", async () => {
        const mockPortfolio = { uid: "test-user-123", holdings: [] };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app).get("/api/portfolio");

        expect(res.statusCode).toBe(200);
        expect(res.body.uid).toBe("test-user-123");
    });

    test("GET /api/portfolio - should return 404 if portfolio not found", async () => {
        Portfolio.findOne.mockResolvedValue(null);

        const res = await request(app).get("/api/portfolio");

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Portfolio not found");
    });

    // 6. BUY coins error cases
    test("POST /api/portfolio/buy - should return 400 if missing fields", async () => {
        const res = await request(app)
            .post("/api/portfolio/buy")
            .send({ coinId: "bitcoin" });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Missing required fields");
    });

    test("POST /api/portfolio/buy - should return 404 if portfolio not found", async () => {
        Portfolio.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post("/api/portfolio/buy")
            .send({ coinId: "bitcoin", symbol: "BTC", quantity: 1, price: 60000 });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Portfolio not found");
    });

    // 7. SELL coins error cases
    test("POST /api/portfolio/sell - should return 400 if missing fields", async () => {
        const res = await request(app)
            .post("/api/portfolio/sell")
            .send({ coinId: "bitcoin" });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Missing required fields");
    });

    test("POST /api/portfolio/sell - should return 404 if portfolio not found", async () => {
        Portfolio.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post("/api/portfolio/sell")
            .send({ coinId: "bitcoin", quantity: 1 });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Portfolio not found");
    });

    test("POST /api/portfolio/sell - should return 400 if coin not found in portfolio", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app)
            .post("/api/portfolio/sell")
            .send({ coinId: "bitcoin", quantity: 1 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Coin not found in portfolio");
    });

    test("POST /api/portfolio/sell - should return 400 if insufficient quantity", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [{ coinId: "bitcoin", quantity: 0.5 }],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app)
            .post("/api/portfolio/sell")
            .send({ coinId: "bitcoin", quantity: 1 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Insufficient quantity");
    });

    // 8. REMOVE coin
    test("DELETE /api/portfolio/remove/:coinId - should remove coin from holdings", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [{ coinId: "bitcoin", quantity: 2 }],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app).delete("/api/portfolio/remove/bitcoin");

        expect(res.statusCode).toBe(200);
        expect(mockPortfolio.holdings).toHaveLength(0);
        expect(mockPortfolio.save).toHaveBeenCalled();
    });

    test("DELETE /api/portfolio/remove/:coinId - should return 404 if portfolio not found", async () => {
        Portfolio.findOne.mockResolvedValue(null);

        const res = await request(app).delete("/api/portfolio/remove/bitcoin");

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Portfolio not found");
    });

    // 9. CLEAR portfolio
    test("DELETE /api/portfolio/clear - should clear all holdings", async () => {
        const mockPortfolio = {
            uid: "test-user-123",
            holdings: [{ coinId: "bitcoin", quantity: 2 }],
            save: jest.fn().mockResolvedValue(true),
        };
        Portfolio.findOne.mockResolvedValue(mockPortfolio);

        const res = await request(app).delete("/api/portfolio/clear");

        expect(res.statusCode).toBe(200);
        expect(mockPortfolio.holdings).toHaveLength(0);
    });

    test("DELETE /api/portfolio/clear - should return 404 if portfolio not found", async () => {
        Portfolio.findOne.mockResolvedValue(null);

        const res = await request(app).delete("/api/portfolio/clear");

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Portfolio not found");
    });

    // 10. Exception handling
    test("GET /api/portfolio - should return 500 on fetch failure", async () => {
        Portfolio.findOne.mockRejectedValue(new Error("Database error"));

        const res = await request(app).get("/api/portfolio");

        expect(res.statusCode).toBe(500);
        expect(res.body.message).toBe("Failed to fetch portfolio");
    });
});
