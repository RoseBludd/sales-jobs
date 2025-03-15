-- CreateTable
CREATE TABLE "job_notes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "job_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_job_notes_job_id" ON "job_notes"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_notes_user_id" ON "job_notes"("user_id");

-- AddForeignKey
ALTER TABLE "job_notes" ADD CONSTRAINT "job_notes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "monday_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_notes" ADD CONSTRAINT "job_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "monday_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; 