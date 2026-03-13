import * as dotenv from "dotenv";
import { join } from "node:path";
import { registerAs } from "@nestjs/config";

dotenv.config({ path: join(__dirname, "../../.env") });

export default registerAs('app', () => ({
  jwtSecret: process.env.JWT_SECRET || 'super-secret-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
}));
