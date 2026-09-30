-- Kjøres av databaseeier. Approllen får aldri DDL, DELETE eller historikkendring.
GRANT CONNECT ON DATABASE stackrankdh_dev TO stackrankdh_app;
GRANT USAGE ON SCHEMA public TO stackrankdh_app;
GRANT SELECT, INSERT ON workspaces TO stackrankdh_app;
GRANT SELECT, INSERT, UPDATE ON workspace_documents TO stackrankdh_app;
GRANT SELECT, INSERT ON document_revisions TO stackrankdh_app;
