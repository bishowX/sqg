import "dotenv/config";
import { defineConfig } from "drizzle-kit";

console.log(process.env.DB_FILE_NAME);

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});
