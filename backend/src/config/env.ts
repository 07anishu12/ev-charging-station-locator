import { config as loadDotenv } from "dotenv";
import { parseEnvironment } from "./env-schema";

loadDotenv({ path: [".env.local", ".env"], quiet: true });

export const env = parseEnvironment(process.env);
