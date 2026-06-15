import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info"
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({ userId, title, message, type });
  } catch {
    // Don't let notification errors break the main flow
  }
}
