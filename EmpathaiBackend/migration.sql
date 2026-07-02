-- 1. Add approval_status with default
ALTER TABLE ai_generated_content ADD COLUMN approval_status varchar(255) DEFAULT 'APPROVED';

-- 2. Migrate existing data
UPDATE ai_generated_content SET approval_status = 'PENDING' WHERE is_approved = false;
UPDATE ai_generated_content SET approval_status = 'APPROVED' WHERE is_approved = true;

-- 3. Drop the old column
ALTER TABLE ai_generated_content DROP COLUMN is_approved;

-- 4. Add chapter number to chapters table
ALTER TABLE chapters ADD COLUMN chapter_number INT;
