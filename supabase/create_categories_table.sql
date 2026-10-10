-- ==============================================================================
-- WEBRAJYA POS - PRODUCT CATEGORIES SCHEMA & SEED MIGRATION
-- Target DB: PostgreSQL / Supabase
-- Description: Creates/Updates categories table and populates standard categories
-- ==============================================================================

-- 1. Create product categories table if it does not exist
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist (in case table already existed previously)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Enable Row Level Security (RLS) & Safely Create Policies for Supabase
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Allow public read access to categories') THEN
        CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Allow full access for authenticated users to categories') THEN
        CREATE POLICY "Allow full access for authenticated users to categories" ON public.categories FOR ALL USING (true);
    END IF;
END $$;

-- 3. Insert stationery shop categories
INSERT INTO public.categories (name, description)
VALUES
    ('Pens', 'Ball pens, gel pens, ink pens and refills'),
    ('Pencils', 'Wooden pencils, mechanical pencils and leads'),
    ('Erasers & Sharpeners', 'Erasers, sharpeners and correction tools'),
    ('Notebooks & Registers', 'Notebooks, long books, registers and diaries'),
    ('Paper & Sheets', 'A4 paper, colour paper, chart paper and sheets'),
    ('Files & Folders', 'Files, folders, document holders and envelopes'),
    ('Office Supplies', 'Staplers, pins, clips, tapes and office accessories'),
    ('School Supplies', 'School stationery, geometry boxes and school kits'),
    ('Art & Craft', 'Colours, brushes, craft paper and art materials'),
    ('Markers & Highlighters', 'Permanent markers, whiteboard markers and highlighters'),
    ('Drawing & Geometry', 'Rulers, scales, compasses, protractors and geometry sets'),
    ('Adhesives', 'Glue sticks, liquid glue, Fevicol and adhesive products'),
    ('Calculators', 'Basic and scientific calculators'),
    ('Books & Publications', 'Books, workbooks, guides and educational publications'),
    ('Bags & Accessories', 'School bags, pencil pouches and accessories'),
    ('Files & Office Paper', 'Carbon paper, paper pads and office documentation'),
    ('Printer & Computer Supplies', 'Printer paper, cartridges and computer accessories'),
    ('Gift & Fancy Items', 'Gift wrap, greeting cards and decorative items'),
    ('Toys & Games', 'Small toys, puzzles and stationery-related games'),
    ('Bottles & Lunch Boxes', 'Water bottles, lunch boxes and food containers'),
    ('General Merchandise', 'Products that do not fit another category'),
    ('Uncategorized', 'Products awaiting category assignment')
ON CONFLICT (name) DO NOTHING;

-- 4. View all categories
SELECT id, name, description, is_active
FROM public.categories
ORDER BY name;
