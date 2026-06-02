-- DB-level CHECK constraints (defense-in-depth, ARCHITECTURE 5.4) — niewyrażalne w schema.prisma.
-- stock_quantity>=0, price_gross>0 (z #22) i format email Usera (initial) już istnieją — tu tylko nowe.

ALTER TABLE "cart_item"
  ADD CONSTRAINT "cart_item_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_unit_price_positive"
  CHECK ("unit_price" > 0);

ALTER TABLE "order"
  ADD CONSTRAINT "order_total_nonneg"
  CHECK ("total" >= 0);
