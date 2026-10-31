-- Add independent optional profile details. Existing notes and report snapshots
-- are not rewritten; old clients can continue saving the original fields.
alter table public.students
  add column if not exists school text not null default '' check (char_length(school) <= 120),
  add column if not exists traits text not null default '' check (char_length(traits) <= 2000),
  add column if not exists parent_requirements text not null default '' check (char_length(parent_requirements) <= 2000),
  add column if not exists school_context text not null default '' check (char_length(school_context) <= 2000);

notify pgrst, 'reload schema';
