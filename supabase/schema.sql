create extension if not exists pgcrypto;

-- Internal project roles only: student, supervisor, coordinator.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  "firstName" text,
  "lastName" text,
  email text unique not null,
  password text not null,
  role text not null default 'student' check (role in ('student', 'supervisor', 'coordinator')),
  department text,
  "studentId" text,
  "staffId" text,
  "createdAt" timestamptz not null default now()
);

-- Staff identifiers used to be written into "studentId". Add the column and
-- move any existing supervisor/coordinator rows across.
alter table public.users add column if not exists "staffId" text;

update public.users
set "staffId" = "studentId",
    "studentId" = null
where role in ('supervisor', 'coordinator')
  and "studentId" is not null
  and "staffId" is null;

-- Emails are stored and matched lower-cased.
update public.users
set email = lower(email)
where email <> lower(email);

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('student', 'supervisor', 'coordinator'));

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  "originalName" text not null,
  "mimeType" text not null,
  size bigint not null,
  path text not null,
  "uploadedBy" uuid not null references public.users(id) on delete cascade,
  "uploadedAt" timestamptz not null default now()
);

create index if not exists documents_uploaded_by_idx
  on public.documents ("uploadedBy");

create index if not exists documents_uploaded_at_idx
  on public.documents ("uploadedAt" desc);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  tone text not null default 'indigo',
  "createdAt" timestamptz not null default now(),
  "readAt" timestamptz
);

create index if not exists activities_user_created_idx
  on public.activities ("userId", "createdAt" desc);

create table if not exists public.supervisor_requests (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.users(id) on delete cascade,
  "supervisorId" uuid references public.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'assigned', 'rejected')),
  message text,
  "requestedAt" timestamptz not null default now(),
  "assignedAt" timestamptz,
  "assignedBy" uuid references public.users(id) on delete set null
);

create unique index if not exists supervisor_requests_active_student_idx
  on public.supervisor_requests ("studentId")
  where status in ('pending', 'assigned');

create index if not exists supervisor_requests_status_idx
  on public.supervisor_requests (status, "requestedAt" desc);

create table if not exists public.project_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null,
  availability text not null default 'available'
    check (availability in ('available', 'unavailable')),
  "createdAt" timestamptz not null default now()
);

-- A student's own submitted project topic, reviewed by their supervisor/coordinator.
create table if not exists public.student_topics (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null unique references public.users(id) on delete cascade,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  "declineReason" text,
  "submittedAt" timestamptz not null default now(),
  "reviewedAt" timestamptz,
  "reviewedBy" uuid references public.users(id) on delete set null
);

create index if not exists student_topics_status_idx
  on public.student_topics (status, "submittedAt" desc);

-- A student's proposal. Can only be submitted once their topic is accepted.
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null unique references public.users(id) on delete cascade,
  title text not null,
  description text,
  "documentId" uuid references public.documents(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  "submittedAt" timestamptz,
  "updatedAt" timestamptz not null default now()
);

create index if not exists proposals_status_idx
  on public.proposals (status, "submittedAt" desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.users(id) on delete cascade,
  "topicId" uuid references public.project_topics(id) on delete set null,
  title text not null,
  status text not null default 'draft',
  stage text not null default 'proposal',
  progress integer not null default 0 check (progress between 0 and 100),
  deadline date,
  "createdAt" timestamptz not null default now()
);

create unique index if not exists projects_student_idx on public.projects ("studentId");

-- Set when the student submits the final project, once every chapter is approved.
alter table public.projects add column if not exists "finalSubmittedAt" timestamptz;

-- Chapters run strictly in sequence: chapter N only opens once N-1 is approved.
-- The lock itself is never stored — it is derived from the previous chapter's
-- status on every read, so it cannot drift out of sync.
--
-- This used to be dropped and recreated on every run, which is destructive in two
-- ways: it deletes every chapter students have written, and the cascade takes the
-- foreign keys from chapter_comments and reviews with it. Re-adding the reviews
-- key then fails (23503), because the recreated chapters table is empty while
-- reviews still points at the old chapter ids. Created if missing, like every
-- other table in this file.
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  "studentId" uuid not null references public.users(id) on delete cascade,
  "chapterNumber" integer not null check ("chapterNumber" between 1 and 5),
  title text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'draft', 'submitted', 'under_review', 'approved', 'needs_revision')),
  "documentId" uuid references public.documents(id) on delete set null,
  "submittedAt" timestamptz,
  "reviewedAt" timestamptz,
  "reviewedBy" uuid references public.users(id) on delete set null,
  "updatedAt" timestamptz not null default now(),
  unique ("projectId", "chapterNumber")
);

create index if not exists chapters_project_idx
  on public.chapters ("projectId", "chapterNumber");

create index if not exists chapters_student_idx
  on public.chapters ("studentId", "chapterNumber");

-- Review comments left by a supervisor against one chapter. A table rather than a
-- column so a chapter keeps the whole review trail across revisions.
create table if not exists public.chapter_comments (
  id uuid primary key default gen_random_uuid(),
  "chapterId" uuid not null references public.chapters(id) on delete cascade,
  "supervisorId" uuid not null references public.users(id) on delete cascade,
  "studentId" uuid not null references public.users(id) on delete cascade,
  comment text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Restore the foreign key for anyone whose database was created by the version
-- above that dropped chapters: the cascade removed this constraint and only the
-- reviews one was being put back.
alter table public.chapter_comments drop constraint if exists chapter_comments_chapterid_fkey;
alter table public.chapter_comments add constraint chapter_comments_chapterid_fkey
  foreign key ("chapterId") references public.chapters(id) on delete cascade;

create index if not exists chapter_comments_chapter_idx
  on public.chapter_comments ("chapterId", "createdAt");

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.users(id) on delete cascade,
  "supervisorId" uuid not null references public.users(id) on delete cascade,
  topic text not null,
  "scheduledAt" timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled'))
);

-- A student's request for a meeting with their assigned supervisor.
-- Separate from public.meetings, which holds meetings already on the calendar.
create table if not exists public.meeting_requests (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.users(id) on delete cascade,
  "supervisorId" uuid not null references public.users(id) on delete cascade,
  title text not null,
  "date" date not null,
  "time" text not null,
  mode text not null default 'in-person'
    check (mode in ('in-person', 'online')),
  location text,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  "responseMessage" text,
  "respondedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists meeting_requests_student_idx
  on public.meeting_requests ("studentId", "createdAt" desc);

create index if not exists meeting_requests_supervisor_idx
  on public.meeting_requests ("supervisorId", status, "createdAt" desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  "studentId" uuid not null references public.users(id) on delete cascade,
  "supervisorId" uuid not null references public.users(id) on delete cascade,
  "chapterId" uuid references public.chapters(id) on delete set null,
  type text not null default 'chapter',
  status text not null default 'pending',
  "submittedAt" timestamptz not null default now(),
  "reviewedAt" timestamptz
);

-- Put the foreign key back for anyone whose database was created by the version
-- above that dropped chapters, which took this constraint with it. Harmless when
-- it already exists: it is dropped and re-added against a chapters table that now
-- keeps its rows, so the re-validation passes.
alter table public.reviews drop constraint if exists reviews_chapterid_fkey;
alter table public.reviews add constraint reviews_chapterid_fkey
  foreign key ("chapterId") references public.chapters(id) on delete set null;

create table if not exists public.defenses (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  "studentId" uuid not null references public.users(id) on delete cascade,
  "scheduledAt" timestamptz,
  venue text,
  format text,
  status text not null default 'unscheduled'
);

create table if not exists public.defense_panel_members (
  "defenseId" uuid not null references public.defenses(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  role text not null,
  primary key ("defenseId", "userId")
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  "defenseId" uuid not null references public.defenses(id) on delete cascade,
  "studentId" uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  score numeric,
  feedback text,
  "submittedAt" timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  "senderId" uuid not null references public.users(id) on delete cascade,
  "recipientId" uuid not null references public.users(id) on delete cascade,
  body text not null,
  "createdAt" timestamptz not null default now(),
  "readAt" timestamptz
);

create index if not exists meetings_participants_idx on public.meetings ("studentId", "supervisorId");
create index if not exists reviews_supervisor_idx on public.reviews ("supervisorId", status);
create index if not exists defenses_student_idx on public.defenses ("studentId");
create index if not exists messages_participants_idx on public.messages ("senderId", "recipientId", "createdAt" desc);

-- Project defence day, final scores, and the student's own preparation checklist.

-- The defence day is one shared event, so the current schedule is simply the most
-- recent row: an edit records a new version rather than overwriting the day that
-- students and supervisors were already notified about.
create table if not exists public.defence_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Project defence',
  "scheduledDate" date not null,
  "startTime" text not null,
  venue text not null,
  instructions text,
  "createdBy" uuid references public.users(id) on delete set null,
  "publishedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists defence_schedules_published_idx
  on public.defence_schedules ("publishedAt" desc);

-- One collated result per student. The unique constraint on "studentId" is what
-- makes a duplicate score submission impossible, not just unlikely.
create table if not exists public.defence_results (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null unique references public.users(id) on delete cascade,
  "projectId" uuid references public.projects(id) on delete set null,
  "scheduleId" uuid references public.defence_schedules(id) on delete set null,
  "supervisorId" uuid references public.users(id) on delete set null,
  -- Supervisor's project report component.
  "supervisorScore" numeric check ("supervisorScore" >= 0),
  "supervisorMax" numeric not null default 100,
  "supervisorBreakdown" jsonb,
  "supervisorStatus" text not null default 'pending'
    check ("supervisorStatus" in ('pending', 'draft', 'submitted')),
  "supervisorSubmittedAt" timestamptz,
  "supervisorUpdatedAt" timestamptz,
  -- Defence component, recorded by the coordinator.
  "defenceScore" numeric check ("defenceScore" >= 0),
  "defenceMax" numeric not null default 100,
  "defenceRecordedBy" uuid references public.users(id) on delete set null,
  "defenceRecordedAt" timestamptz,
  -- Collated outcome, filled in when the coordinator publishes.
  "finalScore" numeric,
  grade text,
  status text not null default 'collecting'
    check (status in ('collecting', 'ready', 'published')),
  "publishedAt" timestamptz,
  "publishedBy" uuid references public.users(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists defence_results_status_idx
  on public.defence_results (status, "studentId");

-- Append-only. Every score write records the field it touched and both values, so
-- a change can be explained after the fact rather than only observed.
create table if not exists public.defence_score_audit (
  id uuid primary key default gen_random_uuid(),
  "resultId" uuid references public.defence_results(id) on delete cascade,
  "studentId" uuid references public.users(id) on delete cascade,
  field text not null,
  "oldValue" text,
  "newValue" text,
  action text not null,
  "actorId" uuid references public.users(id) on delete set null,
  "actorRole" text,
  "createdAt" timestamptz not null default now()
);

create index if not exists defence_score_audit_student_idx
  on public.defence_score_audit ("studentId", "createdAt" desc);

-- Private to the student who wrote it. Every read and write is scoped by
-- "studentId" on the server, so no route ever takes a student id from the client.
create table if not exists public.defence_checklist_items (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.users(id) on delete cascade,
  title text not null,
  notes text,
  done boolean not null default false,
  "completedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists defence_checklist_student_idx
  on public.defence_checklist_items ("studentId", "createdAt");

