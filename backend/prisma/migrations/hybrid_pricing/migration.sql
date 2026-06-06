-- Add hybrid pricing fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(50) DEFAULT 'fixed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5,2);

-- Add optional override fields to product_variants table
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS cost_price_override DECIMAL(10,2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS markup_percentage_override DECIMAL(5,2);
