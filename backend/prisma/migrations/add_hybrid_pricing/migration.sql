-- Add hybrid pricing system to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS "pricingMethod" VARCHAR(50) NOT NULL DEFAULT 'fixed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS "markupPercentage" DECIMAL(5,2);

-- Add optional override to product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "costPriceOverride" DECIMAL(10,2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "markupPercentageOverride" DECIMAL(5,2);

-- Add computed column for actual selling price (optional, for reference)
-- This is calculated in the app, not in DB
COMMENT ON COLUMN products."pricingMethod" IS 'fixed or markup';
COMMENT ON COLUMN products."costPrice" IS 'Purchase/cost price for markup calculation';
COMMENT ON COLUMN products."markupPercentage" IS 'Profit margin percentage for markup pricing';
COMMENT ON COLUMN product_variants."costPriceOverride" IS 'Override cost price for this variant';
COMMENT ON COLUMN product_variants."markupPercentageOverride" IS 'Override markup percentage for this variant';
