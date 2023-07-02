-- Create Audit Enum
CREATE TYPE "AuditOperation" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "TeamAuditLog" (
    "versionId" SERIAL NOT NULL,
    "versionOperation" "AuditOperation" NOT NULL,
    "versionTeamId" INTEGER,
    "versionUserId" INTEGER,
    "versionTimestamp" TIMESTAMP(3) NOT NULL,
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeamAuditLog_pkey" PRIMARY KEY ("versionId")
);


CREATE OR REPLACE FUNCTION "FN_audit_team_table"() RETURNS TRIGGER AS $$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "TeamAuditLog"
            VALUES (DEFAULT, 'DELETE', NULL, current_setting('app.current_user_id', TRUE)::int, now(), OLD.*);
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "TeamAuditLog"
            VALUES (DEFAULT, 'UPDATE', NEW."id", current_setting('app.current_user_id', TRUE)::int, now(), NEW.*);
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "TeamAuditLog"
            VALUES (DEFAULT, 'INSERT', NEW."id", current_setting('app.current_user_id', TRUE)::int, now(), NEW.*);
        END IF;
        RETURN NULL;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit
AFTER INSERT OR UPDATE OR DELETE ON "public"."Team"
    FOR EACH ROW EXECUTE FUNCTION "FN_audit_team_table"();


-- AddForeignKey
ALTER TABLE "TeamAuditLog" ADD CONSTRAINT "TeamAuditLog_versionTeamId_fkey" FOREIGN KEY ("versionTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAuditLog" ADD CONSTRAINT "TeamAuditLog_versionUserId_fkey" FOREIGN KEY ("versionUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
