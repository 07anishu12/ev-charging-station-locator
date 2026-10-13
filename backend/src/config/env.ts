import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvironment } from "./env-schema";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
loadDotenv({ path: [resolve(projectRoot, ".env.local"), resolve(projectRoot, ".env")], quiet: true });

export const env = parseEnvironment(process.env);
