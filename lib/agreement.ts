import { createHash } from "crypto";
import { SIGN_OFF_AGREEMENT } from "@/lib/agreement-text";

export { SIGN_OFF_AGREEMENT };

export function hashAgreement(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
