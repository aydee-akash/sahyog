import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { installDnsOverride } from "./dnsOverride";

// The pg driver adapter does its networking in Node, so the optional DNS
// override applies to it (Prisma's built-in engine would ignore it).
export function createPrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  installDnsOverride();
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: strictTls(connectionString) }) });
}

// Always verify the server certificate and hostname, whatever sslmode the
// provider's URL uses ("require" alone would not check the certificate in pg v9).
function strictTls(url: string): string {
  const u = new URL(url);
  if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return url;
  u.searchParams.set("sslmode", "verify-full");
  return u.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
