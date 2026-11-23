import "dotenv/config";

// Integration tests run against DATABASE_URL_TEST, never the development database.
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.DISABLE_RATE_LIMIT = "true";
process.env.APP_URL ??= "http://localhost:3000";
process.env.SESSION_SECRET ??= "test-session-secret-0123456789abcdefghijkl";
