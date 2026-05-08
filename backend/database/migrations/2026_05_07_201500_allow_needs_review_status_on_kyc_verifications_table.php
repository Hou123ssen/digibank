<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->setAllowedStatuses(['pending', 'needs_review', 'approved', 'rejected']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('kyc_verifications')
            ->where('status', 'needs_review')
            ->update(['status' => 'pending']);

        $this->setAllowedStatuses(['pending', 'approved', 'rejected']);
    }

    private function setAllowedStatuses(array $statuses): void
    {
        $driver = DB::getDriverName();
        $statusList = collect($statuses)
            ->map(fn (string $status): string => "'{$status}'")
            ->implode(', ');

        if ($driver === 'sqlite') {
            $this->rebuildSqliteTable($statusList);

            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE `kyc_verifications` MODIFY `status` ENUM({$statusList}) NOT NULL DEFAULT 'pending'");
        }
    }

    private function rebuildSqliteTable(string $statusList): void
    {
        DB::statement('PRAGMA foreign_keys=OFF');

        DB::transaction(function () use ($statusList): void {
            DB::statement("CREATE TABLE kyc_verifications_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                user_id INTEGER NOT NULL UNIQUE,
                national_id_number VARCHAR NOT NULL,
                full_name VARCHAR NOT NULL,
                birth_date DATE NOT NULL,
                cin_front_path VARCHAR NOT NULL,
                cin_back_path VARCHAR NOT NULL,
                selfie_path VARCHAR,
                extracted_text TEXT,
                detected_cin_number VARCHAR,
                ocr_verified TINYINT(1) NOT NULL DEFAULT '0',
                status VARCHAR CHECK (status IN ({$statusList})) NOT NULL DEFAULT 'pending',
                reviewed_by INTEGER,
                reviewed_at DATETIME,
                rejection_reason TEXT,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            )");

            DB::statement('INSERT INTO kyc_verifications_new (
                id,
                user_id,
                national_id_number,
                full_name,
                birth_date,
                cin_front_path,
                cin_back_path,
                selfie_path,
                extracted_text,
                detected_cin_number,
                ocr_verified,
                status,
                reviewed_by,
                reviewed_at,
                rejection_reason,
                created_at,
                updated_at
            )
            SELECT
                id,
                user_id,
                national_id_number,
                full_name,
                birth_date,
                cin_front_path,
                cin_back_path,
                selfie_path,
                extracted_text,
                detected_cin_number,
                COALESCE(ocr_verified, 0),
                status,
                reviewed_by,
                reviewed_at,
                rejection_reason,
                created_at,
                updated_at
            FROM kyc_verifications');

            DB::statement('DROP TABLE kyc_verifications');
            DB::statement('ALTER TABLE kyc_verifications_new RENAME TO kyc_verifications');
        });

        DB::statement('PRAGMA foreign_keys=ON');
    }
};
