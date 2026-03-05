// Mock firebaseAdmin BEFORE importing authMiddleware
// authMiddleware.js requires ../config/firebaseAdmin which tries to load
// firebase-service-account.json (gitignored, absent in CI).
// Jest hoists jest.mock() calls, so the mock intercepts the require chain.
jest.mock("../../config/firebaseAdmin", () => ({
    auth: jest.fn()
}));
jest.mock("../models/Portfolio");

const authMiddleware = require("../../middleware/authMiddleware");
const Portfolio = require("../models/Portfolio");
const admin = require("../../config/firebaseAdmin");

describe("Auth Middleware Tests", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test("should fail if no authorization header", async () => {
        await authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    test("should fail if authorization header is not Bearer", async () => {
        req.headers.authorization = "Basic token";
        await authMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should pass and create portfolio if token is valid and portfolio doesn't exist", async () => {
        req.headers.authorization = "Bearer valid-token";
        const decodedToken = { uid: "user-123" };
        admin.auth = jest.fn().mockReturnValue({
            verifyIdToken: jest.fn().mockResolvedValue(decodedToken)
        });
        Portfolio.findOne.mockResolvedValue(null);
        Portfolio.create.mockResolvedValue({});

        await authMiddleware(req, res, next);

        expect(req.user).toBe(decodedToken);
        expect(Portfolio.create).toHaveBeenCalledWith({ uid: "user-123", holdings: [] });
        expect(next).toHaveBeenCalled();
    });

    test("should pass and not create portfolio if it already exists", async () => {
        req.headers.authorization = "Bearer valid-token";
        const decodedToken = { uid: "user-123" };
        admin.auth = jest.fn().mockReturnValue({
            verifyIdToken: jest.fn().mockResolvedValue(decodedToken)
        });
        Portfolio.findOne.mockResolvedValue({ uid: "user-123" });

        await authMiddleware(req, res, next);

        expect(Portfolio.create).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    test("should fail if token is invalid", async () => {
        req.headers.authorization = "Bearer invalid-token";
        admin.auth = jest.fn().mockReturnValue({
            verifyIdToken: jest.fn().mockRejectedValue(new Error("Invalid token"))
        });

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    });
});
