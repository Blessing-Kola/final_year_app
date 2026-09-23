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
  "createdAt" timestamptz not null default now()
);

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
);9

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

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  "projectId" uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'pending',
  "submittedAt" timestamptz,
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  "studentId" uuid not null references public.users(id) on delete cascade,
  "supervisorId" uuid not null references public.users(id) on delete cascade,
  topic text not null,
  "scheduledAt" timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled'))
);

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

create index if not exists chapters_project_idx on public.chapters ("projectId");
create index if not exists meetings_participants_idx on public.meetings ("studentId", "supervisorId");
create index if not exists reviews_supervisor_idx on public.reviews ("supervisorId", status);
create index if not exists defenses_student_idx on public.defenses ("studentId");
create index if not exists messages_participants_idx on public.messages ("senderId", "recipientId", "createdAt" desc);
