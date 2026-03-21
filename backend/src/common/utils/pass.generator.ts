import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { logger } from "../logger/winston.logger";

export async function generateHashedPassword(length: number = 4, saltRounds: number = 10): Promise<string> {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  const plain = Array.from(crypto.randomFillSync(new Uint8Array(length)))
    .map(x => charset[x % charset.length])
    .join("");
  logger.info(`Contraseña generada: ${plain}`);
  return await bcrypt.hash(plain, saltRounds);
}
