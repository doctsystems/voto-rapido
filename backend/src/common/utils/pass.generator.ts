import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { logger } from "../logger/winston.logger";
import { Role } from "../enums/role.enum";

type PasswordParty = {
  acronym?: string | null;
  ballotOrder?: number | null;
} | null;

type PasswordSchool = {
  shortName?: string | null;
  code?: number | null;
} | null;

type PasswordTable = {
  number?: number | null;
  school?: PasswordSchool;
} | null;

type InitialPasswordInput = {
  role?: Role | null;
  username?: string | null;
  party?: PasswordParty;
  school?: PasswordSchool;
  table?: PasswordTable;
};

function normalizeSegment(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function generateInitialPassword(input: InitialPasswordInput): string {
  const username = normalizeSegment(input.username);
  const partyAcronym = normalizeSegment(input.party?.acronym);
  const partyOrder = input.party?.ballotOrder ?? "";
  const schoolShortName = normalizeSegment(
    input.school?.shortName ?? input.table?.school?.shortName,
  );
  const schoolCode = input.school?.code ?? input.table?.school?.code ?? "";
  const tableNumber = input.table?.number ?? "";

  switch (input.role) {
    case Role.ADMIN:
      return `admin.${username || "user"}`;
    case Role.JEFE_CAMPANA:
      if (partyAcronym && partyOrder !== "") {
        return `jc.${partyAcronym}.${partyOrder}`;
      }
      break;
    case Role.JEFE_RECINTO:
      if (schoolShortName && schoolCode !== "") {
        return `jr.${schoolShortName}.${schoolCode}`;
      }
      break;
    case Role.DELEGADO:
      if (schoolShortName && tableNumber !== "") {
        return `del.${schoolShortName}.${tableNumber}`;
      }
      break;
  }

  return `user.${username || "temporal"}`;
}

export async function generateHashedPassword(length: number = 4, saltRounds: number = 10): Promise<string> {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  const plain = Array.from(crypto.randomFillSync(new Uint8Array(length)))
    .map(x => charset[x % charset.length])
    .join("");
  logger.info(`Contraseña generada: ${plain}`);
  return await bcrypt.hash(plain, saltRounds);
}
