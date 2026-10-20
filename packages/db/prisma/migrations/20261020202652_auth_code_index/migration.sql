-- DropIndex
DROP INDEX "LoginCode_secretHash_key";

-- CreateIndex
CREATE INDEX "LoginCode_secretHash_idx" ON "LoginCode"("secretHash");
