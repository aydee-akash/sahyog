import { getSession } from "./auth";
import { verifyReceiptToken } from "./session";

type Owned = { id: string; userId: string | null };

// A receipt is visible to its logged-in owner, to admins, or to whoever holds
// the signed link issued right after payment (guest donors).
export async function canViewReceipt(donation: Owned, token?: string | null): Promise<boolean> {
  const session = await getSession();
  if (session?.role === "ADMIN") return true;
  if (session && donation.userId === session.userId) return true;
  return verifyReceiptToken(token, donation.id);
}
