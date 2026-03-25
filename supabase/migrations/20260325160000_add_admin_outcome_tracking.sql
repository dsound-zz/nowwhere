-- Add admin outcome tracking to email_queue
-- This allows us to track AI accuracy over time

alter table email_queue 
  add column if not exists admin_outcome text check (admin_outcome in ('approved', 'rejected')),
  add column if not exists outcome_at timestamptz;

-- Add confidence column if it doesn't exist (for AI confidence scores)
alter table email_queue
  add column if not exists confidence numeric(3,2) check (confidence >= 0 and confidence <= 1);

-- Create index for faster accuracy queries
create index if not exists email_queue_admin_outcome_idx on email_queue(admin_outcome) where admin_outcome is not null;
create index if not exists email_queue_outcome_at_idx on email_queue(outcome_at) where outcome_at is not null;

-- Add comment for clarity
comment on column email_queue.admin_outcome is 'Admin decision: approved or rejected. Used to track AI accuracy.';
comment on column email_queue.outcome_at is 'Timestamp when admin made the decision';
comment on column email_queue.confidence is 'AI confidence score (0-1) for the parsed data';
