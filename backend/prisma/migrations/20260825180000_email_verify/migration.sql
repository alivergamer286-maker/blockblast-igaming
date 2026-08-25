ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "EmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'verify',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailToken_token_key" ON "EmailToken"("token");
CREATE INDEX IF NOT EXISTS "EmailToken_userId_idx" ON "EmailToken"("userId");
CREATE INDEX IF NOT EXISTS "EmailToken_token_idx" ON "EmailToken"("token");
CREATE INDEX IF NOT EXISTS "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- existing users (e.g. admin) treated as verified
UPDATE "User" SET "emailVerified" = true WHERE "role" = 'admin';
