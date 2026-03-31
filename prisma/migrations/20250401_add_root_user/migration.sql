-- Add ROOT user with full admin permissions
INSERT INTO "User" ("id", "name", "email", "password", "role", "permissions", "actif", "createdAt", "updatedAt")
VALUES (
  'root_user_001',
  'root',
  'root@gagnebin.ma',
  '$2b$10$ZnZw28OJD.1qIv0pspmn8OMGU4LB7s0IV7nP9/nh6U.w29vl/mqxi',
  'ADMIN',
  '{"dashboard":{"view":true,"edit":true},"tiers":{"view":true,"edit":true,"create":true},"articles":{"view":true,"edit":true,"create":true},"bonsLivraison":{"view":true,"edit":true,"create":true},"facturesClients":{"view":true,"edit":true,"create":true},"avoirsClients":{"view":true,"edit":true,"create":true},"reglementsClients":{"view":true,"edit":true,"create":true},"facturesFournisseurs":{"view":true,"edit":true,"create":true},"reglementsFournisseurs":{"view":true,"edit":true,"create":true}}',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("email") DO NOTHING;
