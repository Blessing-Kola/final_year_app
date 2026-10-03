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
drop table if exists public.chapters cascade;

create table public.chapters (
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

-- chapters is dropped and recreated above, which takes this foreign key with it.
-- Restore it so reviews keeps pointing at the recreated table.
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
