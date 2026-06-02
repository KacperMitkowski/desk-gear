-- CreateIndex
CREATE INDEX "order_status_change_changed_by_id_idx" ON "order_status_change"("changed_by_id");

-- CodeRabbit review #32: koszyk musi mieć dokładnie jednego właściciela (gość XOR user) —
-- blokuje cart-sieroty (oba NULL) oraz niespójny stan (oba ustawione). Niewyrażalne w schema.prisma.
ALTER TABLE "cart"
  ADD CONSTRAINT "cart_exactly_one_owner"
  CHECK (num_nonnulls("user_id", "guest_token") = 1);
