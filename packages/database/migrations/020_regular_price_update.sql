-- Update regular seasons pass price from $1,350 to $1,200
UPDATE membership_price_windows
SET price_cents = 120000
WHERE slug = 'regular';
