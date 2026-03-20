-- Add enriched venue details to venues table

alter table venues add column if not exists description text;
alter table venues add column if not exists hours text;
alter table venues add column if not exists phone text;
alter table venues add column if not exists website text;
alter table venues add column if not exists rating numeric(2,1);

-- Add comment for documentation
comment on column venues.description is 'Venue description for display in detail panel';
comment on column venues.hours is 'Operating hours as human-readable string, e.g. "Open until 2am"';
comment on column venues.phone is 'Contact phone number';
comment on column venues.website is 'Venue website URL (without protocol)';
comment on column venues.rating is 'Venue rating from 0.0 to 5.0';