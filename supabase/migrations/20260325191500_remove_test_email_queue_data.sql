-- Remove all test email_queue records
-- These were previously seeded as test data but should not persist
-- Real email queue items should only come from actual inbound emails

delete from email_queue where status = 'pending';

-- Note: This removes all pending email_queue items
-- If you have legitimate pending emails you want to keep, do not run this migration
