import { db } from "@workspace/db";
import {
  tournamentsTable,
  prizeTiersTable,
  announcementsTable,
  matchesTable,
  matchResultsTable,
  registrationsTable,
  usersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Clearing all demo/seed data from database...");

  await db.delete(matchResultsTable);
  await db.delete(matchesTable);
  await db.delete(registrationsTable);
  await db.delete(prizeTiersTable);
  await db.delete(tournamentsTable);
  await db.delete(announcementsTable);

  const nonAdminUsers = await db.select().from(usersTable);
  const demoUsers = nonAdminUsers.filter((u) => !u.isAdmin);
  for (const user of demoUsers) {
    const userId = user.clerkId;
    if (userId.startsWith("demo_") || userId.startsWith("seed_")) {
      await db.delete(usersTable).where(eq(usersTable.clerkId, userId));
    }
  }

  console.log("Database cleared. Only real admin-created content will remain.");
  console.log("Admin can now add tournaments, matches, and announcements through the admin panel.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
