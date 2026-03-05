const request = require("supertest");
const app = require("../app");

// Mock authMiddleware and Portfolio model for the root test
jest.mock("../models/Portfolio");
jest.mock("../../middleware/authMiddleware", () => (req, res, next) => next());

describe("App Root Tests", () => {
    test("GET / - should return success message", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe("Crypto Backend Running");
    });
});
