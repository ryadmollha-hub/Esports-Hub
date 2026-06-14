import { db } from "@workspace/db";
import {
  tournamentsTable,
  prizeTiersTable,
  announcementsTable,
  matchesTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [t1] = await db
    .insert(tournamentsTable)
    .values({
      name: "FF Arena Grand Championship S1",
      description:
        "The biggest Free Fire tournament of the season. 100 squads battle it out across 4 matches for the ultimate prize pool. Only the best will survive. Register now and prove your worth.",
      mode: "squad",
      status: "upcoming",
      startDate: inFiveDays,
      endDate: inTenDays,
      maxSlots: 100,
      filledSlots: 62,
      prizePool: "15000",
      entryFee: "150",
      bannerUrl:
        "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop",
      countdownTo: inFiveDays,
    })
    .returning()
    .onConflictDoNothing();

  if (t1) {
    await db.insert(prizeTiersTable).values([
      { tournamentId: t1.id, rank: "1st Place", amount: "8000", description: "Winner takes all" },
      { tournamentId: t1.id, rank: "2nd Place", amount: "4000", description: "" },
      { tournamentId: t1.id, rank: "3rd Place", amount: "2000", description: "" },
      { tournamentId: t1.id, rank: "4th–10th Place", amount: "150", description: "Per team" },
    ]).onConflictDoNothing();
  }

  const [t2] = await db
    .insert(tournamentsTable)
    .values({
      name: "Weekly Duo Showdown #12",
      description:
        "Team up with your partner and dominate the Bermuda map. Fast-paced duo action with guaranteed prizes for top 10 teams.",
      mode: "duo",
      status: "ongoing",
      startDate: yesterday,
      endDate: inTwoDays,
      maxSlots: 50,
      filledSlots: 50,
      prizePool: "5000",
      entryFee: "80",
      bannerUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2070&auto=format&fit=crop",
      roomId: "8834521",
      roomPassword: "FIRE99",
      countdownTo: inTwoDays,
    })
    .returning()
    .onConflictDoNothing();

  if (t2) {
    await db.insert(prizeTiersTable).values([
      { tournamentId: t2.id, rank: "1st Place", amount: "2500", description: "" },
      { tournamentId: t2.id, rank: "2nd Place", amount: "1500", description: "" },
      { tournamentId: t2.id, rank: "3rd Place", amount: "700", description: "" },
      { tournamentId: t2.id, rank: "4th–10th", amount: "40", description: "Per team" },
    ]).onConflictDoNothing();
  }

  const [t3] = await db
    .insert(tournamentsTable)
    .values({
      name: "Solo Sniper League April",
      description:
        "Pure solo skill test. One man, one gun. The highest total kills across 3 matches wins. Entry is free, prize is real.",
      mode: "solo",
      status: "upcoming",
      startDate: inTenDays,
      maxSlots: 200,
      filledSlots: 88,
      prizePool: "3000",
      entryFee: "0",
      bannerUrl:
        "https://images.unsplash.com/photo-1542751110-97427bbecfd7?q=80&w=2070&auto=format&fit=crop",
      countdownTo: inTenDays,
    })
    .returning()
    .onConflictDoNothing();

  if (t3) {
    await db.insert(prizeTiersTable).values([
      { tournamentId: t3.id, rank: "1st Place", amount: "1500", description: "" },
      { tournamentId: t3.id, rank: "2nd Place", amount: "1000", description: "" },
      { tournamentId: t3.id, rank: "3rd Place", amount: "500", description: "" },
    ]).onConflictDoNothing();
  }

  const [t4] = await db
    .insert(tournamentsTable)
    .values({
      name: "Monthly Squad Cup — March",
      description: "March edition of the monthly squad cup. Completed with great matches.",
      mode: "squad",
      status: "completed",
      startDate: lastWeek,
      endDate: yesterday,
      maxSlots: 64,
      filledSlots: 64,
      prizePool: "8000",
      entryFee: "100",
      bannerUrl:
        "https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=2070&auto=format&fit=crop",
    })
    .returning()
    .onConflictDoNothing();

  if (t4) {
    const matchDate = new Date(lastWeek.getTime() + 2 * 60 * 60 * 1000);
    const [m1] = await db.insert(matchesTable).values({
      tournamentId: t4.id,
      matchNumber: 1,
      scheduledAt: matchDate,
      status: "completed",
      mapName: "Bermuda",
    }).returning().onConflictDoNothing();

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (t2) {
      await db.insert(matchesTable).values([
        { tournamentId: t2.id, matchNumber: 1, scheduledAt: yesterday, status: "completed", mapName: "Purgatory" },
        { tournamentId: t2.id, matchNumber: 2, scheduledAt: now, status: "live", mapName: "Bermuda" },
        { tournamentId: t2.id, matchNumber: 3, scheduledAt: tomorrow, status: "scheduled", mapName: "Kalahari" },
      ]).onConflictDoNothing();
    }
    if (t1) {
      await db.insert(matchesTable).values([
        { tournamentId: t1.id, matchNumber: 1, scheduledAt: inFiveDays, status: "scheduled", mapName: "Bermuda" },
        { tournamentId: t1.id, matchNumber: 2, scheduledAt: new Date(inFiveDays.getTime() + 2 * 60 * 60 * 1000), status: "scheduled", mapName: "Purgatory" },
      ]).onConflictDoNothing();
    }
  }

  await db.insert(announcementsTable).values([
    {
      title: "Season 2026 Registration Now Open!",
      content: "The grand Free Fire Arena Season 2026 Grand Championship is now open for registration. 100 squad slots available. Entry fee: ৳150. Total prize pool: ৳15,000. Don't miss your chance to compete!",
      type: "success",
    },
    {
      title: "Payment Method Update",
      content: "We now accept bKash, Nagad, and Rocket for entry fee payments. Please include your FF UID in the payment reference. Screenshots must be submitted within 24 hours of registration.",
      type: "info",
    },
    {
      title: "Weekly Duo Showdown #12 — Room Details Released",
      content: "Approved players: Room ID is 8834521, Password is FIRE99. Match begins in 2 hours. Be in the lobby 15 minutes early. Late entries will be disqualified.",
      type: "urgent",
    },
    {
      title: "Fair Play Warning",
      content: "Any player found using emulators, hacks, or third-party tools will be permanently banned and disqualified. Play fair, play clean.",
      type: "warning",
    },
  ]).onConflictDoNothing();

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
