const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const pdfPath = '/Users/aryanrajput/.gemini/antigravity-ide/brain/03c9aedc-49fe-47f6-a53f-3faab598b231/.user_uploaded/media_1791722801985.pdf';
  console.log('Reading PDF from:', pdfPath);
  const buffer = fs.readFileSync(pdfPath);
  const parser = new pdf.PDFParse({ data: buffer });
  await parser.load();
  const text = (await parser.getText()).text;
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentCategory = 'General Supplies';
  const rawItems = [];

  for (const line of rawLines) {
    if (line.startsWith('---') || line.includes('PRICE LIST') || line.includes('CHANDRA TRADING') || 
        line.includes('GSTIN') || line.includes('Phone') || line.includes('NEW SHUKRAWARI') || 
        line.includes('S.NO.') || line.includes('*** End of Report ***') || /^-- \d+ of \d+ --$/.test(line)) {
      continue;
    }

    if (!/^\d+\s+/.test(line) && !/^\d+\*|^\d+\.\d+$/.test(line)) {
      if (line === '-BLANK-') {
        currentCategory = 'General Stationery';
      } else if (line.startsWith('ZZZZZZ')) {
        currentCategory = 'General Supplies';
      } else {
        currentCategory = line;
      }
      continue;
    }

    const match = line.match(/^(\d+)\s+(.+?)\s+([0-9]+\*[0-9]+|[0-9]+\*\/[0-9]+|QUAIRE\(24SHEET\))\s+([0-9]+\.[0-9]{2})$/);
    if (match) {
      rawItems.push({
        sno: match[1],
        name: match[2].trim(),
        pack: match[3].trim(),
        rate: parseFloat(match[4]),
        section: currentCategory
      });
    } else {
      const matchNoPack = line.match(/^(\d+)\s+(.+?)\s+([0-9]+\.[0-9]{2})$/);
      if (matchNoPack) {
        rawItems.push({
          sno: matchNoPack[1],
          name: matchNoPack[2].trim(),
          pack: '1*1',
          rate: parseFloat(matchNoPack[3]),
          section: currentCategory
        });
      }
    }
  }

  console.log(`Parsed ${rawItems.length} items from PDF.`);

  function getCategory(item) {
    const s = item.section.toUpperCase();
    const n = item.name.toUpperCase();
    if (s === 'NCERT' || n.startsWith('NCERT')) return 'NCERT Books';
    if (s === 'NAVBODH' || n.startsWith('BODH ') || n.startsWith('NAV BODH')) return 'Navbodh Books';
    if (s === 'SLA' || n.startsWith('SLA ')) return 'SLA Guides & Books';
    if (s === 'DIGDARSHIKA') return 'Digdarshika Guides';
    if (s === 'KESHAV' || n.startsWith('KESHAV')) return 'Keshav Guides';
    if (n.startsWith('MPTCB')) return 'MPTCB Books';
    if (n.startsWith('ARI ') || n.startsWith('ARIHANT') || n.startsWith('AR ALL IN ONE')) return 'Arihant Books';
    if (n.startsWith('LUCENT')) return 'Lucent Books';
    if (n.startsWith('SAAR ')) return 'Saar Books';
    if (n.startsWith('GPH ')) return 'GPH Guides';
    if (n.startsWith('DINESH ')) return 'Dinesh Guides';
    if (n.startsWith('PAHADA') || n.includes('PAHADA')) return 'Pahada Books';
    if (s === 'APSARA' || n.startsWith('APSARA') || n.startsWith('APS ')) return 'Apsara Stationery';
    if (s === 'NATARAJ' || n.startsWith('NATARAJ') || n.startsWith('NAT ')) return 'Nataraj Stationery';
    if (s === 'DOMS' || n.startsWith('DOMS')) return 'DOMS Art & Stationery';
    if (s === 'FLAIR' || n.startsWith('FLAIR')) return 'Flair Pens';
    if (s === 'HAUSER' || n.startsWith('HAUSER')) return 'Hauser Pens';
    if (s === 'CELLO' || n.startsWith('CELLO')) return 'Cello Pens';
    if (s === 'REYNOLD' || n.startsWith('REY ') || n.startsWith('REYNOLD')) return 'Reynolds Pens';
    if (s === 'RORITO' || n.startsWith('RORITO')) return 'Rorito Pens';
    if (s === 'UNOMAX' || n.startsWith('UNO ') || n.startsWith('UNOMAX')) return 'Unomax Pens';
    if (s === 'MONTEX' || n.startsWith('MONTEX')) return 'Montex Pens';
    if (n.startsWith('ELKOS')) return 'Elkos Pens';
    if (s === 'TOTEM' || n.startsWith('TOTEM')) return 'Totem Pens';
    if (s === 'KANGAROO' || n.startsWith('KAN ')) return 'Kangaro Staplers & Punch';
    if (s === 'INZO' || n.startsWith('BINDER CLIP')) return 'Inzo Clips & Stationery';
    if (s === 'HINDAUN' || n.includes('EXAM BOARD')) return 'Exam Boards';
    if (s === 'SLATE' || n.startsWith('SLATE')) return 'Slates & Boards';
    if (s === 'PIDILITE' || n.startsWith('FEVICOL') || n.startsWith('FEVISTICK')) return 'Adhesives & Glues';
    if (s === 'KORES') return 'Kores Products';
    if (s === 'KODAK') return 'Kodak Paper Rolls';
    if (s === 'RAJHANS' || n.startsWith('RAJHANS')) return 'Rajhans Notebooks';
    if (s === 'SANGAM' || n.startsWith('SANGAM') || n.startsWith('SAMGAM')) return 'Sangam Books & Stationery';
    if (s === 'CHANDRA') {
      if (n.includes('FILE') || n.includes('LACE') || n.includes('TAG')) return 'Files & Folders';
      if (n.includes('BOOK') || n.includes('ATTEND') || n.includes('ATTEN') || n.includes('NOTEBOOK') || n.includes('CNB') || n.includes('ROUGH') || n.includes('VOUCHER')) return 'Registers & Books';
      if (n.includes('PIN')) return 'Office Pins & Clips';
      if (n.includes('TAPE')) return 'Tapes & Packaging';
      if (n.includes('RAMAYAN') || n.includes('VAIBHAV')) return 'Religious Books';
      if (n.includes('STAMP') || n.includes('PAD') || n.includes('INK')) return 'Stamps & Ink';
      return 'Office Stationery';
    }
    if (n.includes('FILE') || n.includes('FOLDER') || n.includes('COBRA')) return 'Files & Folders';
    if (n.includes('COPY') || n.includes('REGISTER') || n.includes('NOTEBOOK') || n.includes('CNB') || n.includes('ROUGH') || n.includes('REG.')) return 'Notebooks & Registers';
    if (n.includes('PAPER') || n.includes('SHEET') || n.includes('REAM') || n.includes('ROLL')) return 'Paper & Sheets';
    if (n.includes('PEN') || n.includes('PENCIL') || n.includes('REFILL') || n.includes('REFFIL')) return 'Pens & Pencils';
    if (n.includes('COLOUR') || n.includes('COLOR') || n.includes('BRUSH') || n.includes('CRAYON')) return 'Art & Colours';
    return 'General Stationery';
  }

  function getTaxAndHsn(name, category) {
    const isBook = category.includes('Book') || category.includes('Guide') || category.includes('Pahada') || name.includes('GEETA') || name.includes('RAMAYAN');
    if (isBook) {
      return { hsn: '4901', gst: 0.00 };
    }
    const isNotebook = category.includes('Notebook') || category.includes('Register') || name.includes('COPY') || name.includes('REG.');
    if (isNotebook) {
      return { hsn: '4820', gst: 12.00 };
    }
    const isPen = category.includes('Pen') || name.includes('PEN') || name.includes('REFILL');
    if (isPen) {
      return { hsn: '9608', gst: 18.00 };
    }
    const isPencil = name.includes('PENCIL');
    if (isPencil) {
      return { hsn: '9609', gst: 12.00 };
    }
    const isPaper = category.includes('Paper') || name.includes('PAPER');
    if (isPaper) {
      return { hsn: '4802', gst: 12.00 };
    }
    return { hsn: '4820', gst: 12.00 };
  }

  const products = rawItems.map((item, index) => {
    const skuNum = String(index + 1).padStart(4, '0');
    const sku = `CTC-${skuNum}`;
    const id = sku;
    
    let cleanName = item.name;
    if (cleanName === '1*1') {
      if (index === 11) cleanName = 'MISC STATIONERY ITEM 1';
      else if (index === 12) cleanName = 'MISC STATIONERY ITEM 2';
      else cleanName = 'SLA GENERAL ITEM';
    }

    const category = getCategory({ ...item, name: cleanName });
    const { hsn, gst } = getTaxAndHsn(cleanName, category);
    const saleRate = Number(item.rate.toFixed(2));
    const mrp = saleRate > 0 ? saleRate : 0.00;
    const purchaseRate = saleRate > 0 ? Number((saleRate * 0.75).toFixed(2)) : 0.00;

    return {
      id,
      sku,
      barcode: sku,
      name: cleanName,
      category,
      pack_info: item.pack || '1*1',
      unit: 'Pcs',
      mrp,
      purchase_rate: purchaseRate,
      sale_rate: saleRate,
      hsn_code: hsn,
      gst_rate: gst,
      stock_qty: 100,
      min_stock_level: 5,
      is_active: true
    };
  });

  console.log(`Generated ${products.length} product objects.`);

  // Write SQL File
  const sqlChunks = [];
  sqlChunks.push(`-- ==============================================================================
-- CHANDRA TRADING COMPANY - COMPLETE PRICE LIST IMPORT (2,201 ITEMS)
-- Official Master Catalog Generated from Chandra Trading Company Price List PDF
-- Target Database: Supabase / PostgreSQL
-- Project: https://afmonljoftcsclxdcdpy.supabase.co
-- Total Products: ${products.length}
-- ==============================================================================

-- 1. Ensure public.products table exists
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT ('prod_' || uuid_generate_v4()),
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General Supplies',
  pack_info TEXT DEFAULT '1*1',
  unit TEXT NOT NULL DEFAULT 'Pcs',
  mrp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  purchase_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sale_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  hsn_code TEXT DEFAULT '4820',
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  stock_qty INT NOT NULL DEFAULT 0,
  min_stock_level INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);

-- 2. Insert or update all 2,201 price list products
`);

  const BATCH_SIZE = 200;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    
    let batchSql = `-- Batch ${batchNum} of ${totalBatches} (Items ${i + 1} to ${Math.min(i + BATCH_SIZE, products.length)})\n`;
    batchSql += `INSERT INTO public.products (\n`;
    batchSql += `  id, sku, barcode, name, category, pack_info, unit, mrp, purchase_rate, sale_rate, hsn_code, gst_rate, stock_qty, min_stock_level, is_active\n`;
    batchSql += `) VALUES\n`;

    const rowSqls = batch.map(p => {
      const escName = p.name.replace(/'/g, "''");
      const escCat = p.category.replace(/'/g, "''");
      const escPack = p.pack_info.replace(/'/g, "''");
      return `  ('${p.id}', '${p.sku}', '${p.barcode}', '${escName}', '${escCat}', '${escPack}', '${p.unit}', ${p.mrp.toFixed(2)}, ${p.purchase_rate.toFixed(2)}, ${p.sale_rate.toFixed(2)}, '${p.hsn_code}', ${p.gst_rate.toFixed(2)}, ${p.stock_qty}, ${p.min_stock_level}, ${p.is_active})`;
    });

    batchSql += rowSqls.join(',\n') + '\n';
    batchSql += `ON CONFLICT (id) DO UPDATE SET\n`;
    batchSql += `  sku = EXCLUDED.sku,\n`;
    batchSql += `  barcode = EXCLUDED.barcode,\n`;
    batchSql += `  name = EXCLUDED.name,\n`;
    batchSql += `  category = EXCLUDED.category,\n`;
    batchSql += `  pack_info = EXCLUDED.pack_info,\n`;
    batchSql += `  unit = EXCLUDED.unit,\n`;
    batchSql += `  mrp = EXCLUDED.mrp,\n`;
    batchSql += `  purchase_rate = EXCLUDED.purchase_rate,\n`;
    batchSql += `  sale_rate = EXCLUDED.sale_rate,\n`;
    batchSql += `  hsn_code = EXCLUDED.hsn_code,\n`;
    batchSql += `  gst_rate = EXCLUDED.gst_rate,\n`;
    batchSql += `  stock_qty = EXCLUDED.stock_qty,\n`;
    batchSql += `  min_stock_level = EXCLUDED.min_stock_level,\n`;
    batchSql += `  is_active = EXCLUDED.is_active,\n`;
    batchSql += `  updated_at = NOW();\n\n`;

    sqlChunks.push(batchSql);
  }

  const fullSql = sqlChunks.join('');
  const outputPath = path.join(__dirname, '../supabase/IMPORT_ALL_PRICE_LIST_ITEMS.sql');
  fs.writeFileSync(outputPath, fullSql, 'utf8');
  console.log(`Successfully wrote ${fullSql.length} bytes to ${outputPath}`);

  // Now, directly import into Supabase via client so it's already active!
  console.log('Connecting to Supabase to upsert products directly...');
  const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const urlMatch = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envText.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/);
  
  if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
    
    // Batch upsert 100 items at a time
    const UPSERT_BATCH = 100;
    let successCount = 0;
    for (let i = 0; i < products.length; i += UPSERT_BATCH) {
      const slice = products.slice(i, i + UPSERT_BATCH);
      const { error } = await supabase.from('products').upsert(slice, { onConflict: 'id' });
      if (error) {
        console.error(`Error on batch ${i} - ${i + slice.length}:`, error.message);
      } else {
        successCount += slice.length;
        process.stdout.write(`\rUpserted ${successCount}/${products.length} products to Supabase...`);
      }
    }
    console.log('\nDirect Supabase upsert complete!');

    // Check final count
    const { count, error: countErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`Final count in Supabase products table: ${count} rows`);
  }
}

main().catch(console.error);
