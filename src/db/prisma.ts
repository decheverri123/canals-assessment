import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Graceful shutdown handling
const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
    console.log("Prisma client disconnected gracefully");
    process.exit(0);
  } catch (error) {
    console.error("Error during Prisma client shutdown:", error);
    process.exit(1);
  }
};

// Handle process termination signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception:", error);
  await gracefulShutdown();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason) => {
  console.error("Unhandled rejection:", reason);
  await gracefulShutdown();
});

export default prisma;
