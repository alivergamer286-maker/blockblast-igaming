/**
 * Promote a user to admin by email.
 * Usage (local): DATABASE_URL=... npx tsx scripts/make-admin.ts admin@example.com
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin", status: "active" },
  });
  console.log("Promoted to admin:", user.email, user.username, user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
