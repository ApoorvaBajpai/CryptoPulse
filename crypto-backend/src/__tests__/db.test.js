const mongoose = require("mongoose");
const connectDB = require("../../config/db");

jest.mock("mongoose");

describe("DB Connection Tests", () => {
    test("should connect to MongoDB successfully", async () => {
        process.env.MONGO_URI = "mongodb://localhost:27017/test";
        mongoose.connect.mockResolvedValue(true);
        console.log = jest.fn();

        await connectDB();

        expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
        expect(console.log).toHaveBeenCalledWith("✅ MongoDB connected");
    });

    test("should fail to connect and exit process", async () => {
        mongoose.connect.mockRejectedValue(new Error("Connection failed"));
        console.error = jest.fn();
        const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => { });

        await connectDB();

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("❌ MongoDB connection failed"), "Connection failed");
        expect(exitSpy).toHaveBeenCalledWith(1);
        exitSpy.mockRestore();
    });
});
