// scripts/_prisma.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// This file is for scripts ONLY.
// Do not import this in Next.js app code.
// Next.js uses src/lib/db/prisma.ts which handles hot-reloading.

const prisma = new PrismaClient({
    log: ["query"],
});

// Ensure disconnection on exit to avoid hanging processes
process.on("beforeExit", async () => {
    await prisma.$disconnect();
});

export { prisma };
