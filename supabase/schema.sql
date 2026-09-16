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
