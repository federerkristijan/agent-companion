-- Enum types
CREATE TYPE message_role AS ENUM ('user', 'agent');
CREATE TYPE memo_status AS ENUM ('raw', 'queued', 'done');
CREATE TYPE calendar_event_type AS ENUM ('agent_run', 'content', 'milestone');
CREATE TYPE calendar_event_status AS ENUM ('scheduled', 'done', 'cancelled');
CREATE TYPE task_type AS ENUM ('content', 'feature', 'check');
CREATE TYPE task_status AS ENUM ('pending', 'approved', 'done', 'rejected');

-- Chat messages between user and agent
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw ideas captured in the app
CREATE TABLE memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  status memo_status NOT NULL DEFAULT 'raw',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled agent runs, content, and milestones
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type calendar_event_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status calendar_event_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent daily digests and findings
CREATE TABLE agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks awaiting user approval or in progress
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type task_type NOT NULL,
  description TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
