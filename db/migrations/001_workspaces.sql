CREATE TABLE workspaces (
 id text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_documents (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 kind text NOT NULL CHECK (kind IN ('portfolio','lab')),
 model_version integer NOT NULL CHECK (model_version > 0),
 revision integer NOT NULL CHECK (revision > 0),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 is_reset boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (workspace_id,kind)
);

CREATE TABLE document_revisions (
 workspace_id text NOT NULL,
 kind text NOT NULL,
 revision integer NOT NULL CHECK (revision > 0),
 model_version integer NOT NULL CHECK (model_version > 0),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 operation text NOT NULL CHECK (operation IN ('save','reset')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (workspace_id,kind,revision),
 FOREIGN KEY (workspace_id,kind) REFERENCES workspace_documents(workspace_id,kind)
);

-- Primærnøklene dekker oppslag og historikk per dokument. Ingen generell
-- JSONB-indeks før det finnes konkrete innholdsspørringer som trenger den.
REVOKE ALL ON workspaces,workspace_documents,document_revisions FROM PUBLIC;
