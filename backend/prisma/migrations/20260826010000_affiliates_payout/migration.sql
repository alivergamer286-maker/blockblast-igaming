ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
CREATE INDEX IF NOT EXISTS "User_referredById_idx" ON "User"("referredById");

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateProfile_userId_key" ON "AffiliateProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateProfile_code_key" ON "AffiliateProfile"("code");
CREATE INDEX IF NOT EXISTS "AffiliateProfile_code_idx" ON "AffiliateProfile"("code");
CREATE INDEX IF NOT EXISTS "AffiliateProfile_active_idx" ON "AffiliateProfile"("active");

DO $$ BEGIN
  ALTER TABLE "AffiliateProfile" ADD CONSTRAINT "AffiliateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "houseEdge" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "pointsPerUnit" DECIMAL(18,4) NOT NULL DEFAULT 500,
    "maxMultiplier" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "minBet" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "maxBet" DECIMAL(18,2) NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformConfig" ("id", "houseEdge", "pointsPerUnit", "maxMultiplier", "minBet", "maxBet", "updatedAt")
VALUES ('default', 0.05, 500, 10, 1, 100, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "potentialWin" DECIMAL(18,2) NOT NULL DEFAULT 0;
