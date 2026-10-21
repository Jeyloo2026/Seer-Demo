import type { Market } from "./seer";
import { kindOf } from "./market";
import type { AppKey } from "../ui/kit";

/** Real on-chain markets that anchor each interface. */
export const FEATURED = {
  rebrand: { id: "0xe7850b0d928aa40ab8732bd323fa4f6ef3c24b8a", chainId: 100 },
  devcon: { id: "0xc2b8e25675db9977ad14bca62b655e4aa6b36683", chainId: 100 },
  jobboard: { id: "0x8b3c7f3f09f6a85353926d8ee0f12decc1c9a5e8", chainId: 100 },
  deepRound2: { id: "0xc6c82f5ff9b57722f4831d1dbcae3809cf12c0b9", chainId: 10 },
  deepRound1: { id: "0xb88275fe4e2494e04cea8fb5e9d913aa48add581", chainId: 10 },
  pd: { id: "0xc84786b06390f11ded0dd362e27fc881b540e6f2", chainId: 100 },
} as const;

export const OPPORTUNITY_IDS: string[] = [FEATURED.jobboard.id, FEATURED.rebrand.id, FEATURED.devcon.id];

/** Which interface is the natural home for a market. */
export function homeApp(m: Market): { app: AppKey; path: string } | null {
  if (m.type === "Futarchy") return { app: "futarchy", path: "/futarchy" };
  if (OPPORTUNITY_IDS.includes(m.id)) return { app: "opportunity", path: `/opportunity/${m.id}` };
  if (/probability of default/i.test(m.name)) return { app: "risk", path: "/risk" };
  const real = m.outcomes.filter((o) => o !== "Invalid").length;
  if (/juror weight|deepfunding|originality score/i.test(m.name) || (kindOf(m) === "Multi-scalar" && real > 4) || real >= 12)
    return { app: "deep", path: `/deep/${m.chainId}/${m.id}` };
  return null;
}
