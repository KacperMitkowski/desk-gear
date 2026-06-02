-- CodeRabbit review #22: integralność danych katalogu na poziomie DB (defense-in-depth).

-- 1) Kategoria nie może być własnym rodzicem (chroni przed zepsuciem rekurencyjnej hierarchii).
ALTER TABLE "category"
  ADD CONSTRAINT "category_no_self_parent"
  CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- 2) Maksymalnie jedno zdjęcie główne (is_primary = true) na produkt.
-- Partial unique index — niewyrażalny w schema.prisma. Ogólny "product_image_product_id_idx"
-- zostaje (obsługuje FK-lookupy / pobranie wszystkich zdjęć produktu).
CREATE UNIQUE INDEX "product_image_one_primary_per_product_idx"
  ON "product_image" ("product_id")
  WHERE "is_primary" = true;
