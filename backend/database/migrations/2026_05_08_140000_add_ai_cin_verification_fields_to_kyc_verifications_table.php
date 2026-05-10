<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kyc_verifications', function (Blueprint $table): void {
            if (!Schema::hasColumn('kyc_verifications', 'ocr_confidence_score')) {
                $table->unsignedTinyInteger('ocr_confidence_score')->default(0)->after('ocr_verified');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_keyword_score')) {
                $table->unsignedTinyInteger('ocr_keyword_score')->default(0)->after('ocr_confidence_score');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_text_density_score')) {
                $table->unsignedTinyInteger('ocr_text_density_score')->default(0)->after('ocr_keyword_score');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_document_shape_score')) {
                $table->unsignedTinyInteger('ocr_document_shape_score')->default(0)->after('ocr_text_density_score');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_blur_score')) {
                $table->unsignedTinyInteger('ocr_blur_score')->default(0)->after('ocr_document_shape_score');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_document_detected')) {
                $table->boolean('ocr_document_detected')->default(false)->after('ocr_blur_score');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_suspicious')) {
                $table->boolean('ocr_suspicious')->default(false)->after('ocr_document_detected');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_extracted_full_name')) {
                $table->string('ocr_extracted_full_name')->nullable()->after('ocr_suspicious');
            }
            if (!Schema::hasColumn('kyc_verifications', 'ocr_extracted_birth_date')) {
                $table->date('ocr_extracted_birth_date')->nullable()->after('ocr_extracted_full_name');
            }
        });

        $this->setAllowedStatuses(['pending', 'pending_review', 'needs_review', 'approved', 'rejected']);
    }

    public function down(): void
    {
        DB::table('kyc_verifications')
            ->where('status', 'pending_review')
            ->update(['status' => 'pending']);

        $this->setAllowedStatuses(['pending', 'needs_review', 'approved', 'rejected']);

        Schema::table('kyc_verifications', function (Blueprint $table): void {
            $columns = [
                'ocr_confidence_score',
                'ocr_keyword_score',
                'ocr_text_density_score',
                'ocr_document_shape_score',
                'ocr_blur_score',
                'ocr_document_detected',
                'ocr_suspicious',
                'ocr_extracted_full_name',
                'ocr_extracted_birth_date',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('kyc_verifications', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
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
                ocr_confidence_score INTEGER NOT NULL DEFAULT '0',
                ocr_keyword_score INTEGER NOT NULL DEFAULT '0',
                ocr_text_density_score INTEGER NOT NULL DEFAULT '0',
                ocr_document_shape_score INTEGER NOT NULL DEFAULT '0',
                ocr_blur_score INTEGER NOT NULL DEFAULT '0',
                ocr_document_detected TINYINT(1) NOT NULL DEFAULT '0',
                ocr_suspicious TINYINT(1) NOT NULL DEFAULT '0',
                ocr_extracted_full_name VARCHAR,
                ocr_extracted_birth_date DATE,
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
                id, user_id, national_id_number, full_name, birth_date,
                cin_front_path, cin_back_path, selfie_path, extracted_text,
                detected_cin_number, ocr_verified, ocr_confidence_score,
                ocr_keyword_score, ocr_text_density_score, ocr_document_shape_score,
                ocr_blur_score, ocr_document_detected, ocr_suspicious,
                ocr_extracted_full_name, ocr_extracted_birth_date, status,
                reviewed_by, reviewed_at, rejection_reason, created_at, updated_at
            )
            SELECT
                id, user_id, national_id_number, full_name, birth_date,
                cin_front_path, cin_back_path, selfie_path, extracted_text,
                detected_cin_number, COALESCE(ocr_verified, 0),
                COALESCE(ocr_confidence_score, 0),
                COALESCE(ocr_keyword_score, 0),
                COALESCE(ocr_text_density_score, 0),
                COALESCE(ocr_document_shape_score, 0),
                COALESCE(ocr_blur_score, 0),
                COALESCE(ocr_document_detected, 0),
                COALESCE(ocr_suspicious, 0),
                ocr_extracted_full_name,
                ocr_extracted_birth_date,
                status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at
            FROM kyc_verifications');

            DB::statement('DROP TABLE kyc_verifications');
            DB::statement('ALTER TABLE kyc_verifications_new RENAME TO kyc_verifications');
        });

        DB::statement('PRAGMA foreign_keys=ON');
    }
};
