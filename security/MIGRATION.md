# Access-control migration (draft, not deployed)
Baseline: production v1.41. Preserve existing roster and project data.
1. Export current rules and inventory roster, invites, projectcfg, projects, models and activity. Verify owner identity and verified email.
2. Add access/{uid} documents with role, status and migration marker; owner-only role administration initially. Preserve legacy access until migration is complete.
3. Implement per-user administration and project membership documents. Never authorize from editable user profiles. Invitations require verified email and trusted redemption.
4. Test rules in emulator: unauthenticated, pending, viewer, member, admin, owner, suspended; self-promotion, admin promotion, cross-project reads/writes, queries, invitation replay and legacy access.
5. Update client queries to match project-scoped rules before enforcing them. Preserve existing users' access via explicit assignments or migration default.
6. Deploy only after backup, tests and owner verification. Rollback: restore previous rules and application revision; retain legacy roster until migration validated.
No production deployment or database writes authorized by this document.
