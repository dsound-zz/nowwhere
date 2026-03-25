-- Fix foreign key constraint on events.raw_email_id to allow email deletion
-- Current behavior: Cannot delete email_queue rows referenced by events
-- New behavior: Setting raw_email_id to NULL when email is deleted (preserves events)

-- Drop the existing constraint
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_raw_email_id_fkey;

-- Add it back with ON DELETE SET NULL behavior
ALTER TABLE events 
ADD CONSTRAINT events_raw_email_id_fkey 
FOREIGN KEY (raw_email_id) 
REFERENCES email_queue(id) 
ON DELETE SET NULL;

-- Comment for documentation
COMMENT ON CONSTRAINT events_raw_email_id_fkey ON events IS 
'References source email in queue. Sets to NULL when email is deleted to allow cleanup.';
