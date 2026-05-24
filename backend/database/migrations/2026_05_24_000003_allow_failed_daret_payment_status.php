<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE daret_payments MODIFY status ENUM('paid', 'pending', 'late', 'failed') DEFAULT 'pending'");
        }

        if ($driver === 'sqlite') {
            $this->rebuildSqliteTable("CHECK (status IN ('paid', 'pending', 'late', 'failed'))");
        }
    }

    public function down(): void
    {
        DB::table('daret_payments')
            ->where('status', 'failed')
            ->update(['status' => 'late']);

        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE daret_payments MODIFY status ENUM('paid', 'pending', 'late') DEFAULT 'pending'");
        }

        if ($driver === 'sqlite') {
            $this->rebuildSqliteTable("CHECK (status IN ('paid', 'pending', 'late'))");
        }
    }

    private function rebuildSqliteTable(string $statusCheck): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');
        DB::statement("
            CREATE TABLE daret_payments_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                daret_cycle_id INTEGER NOT NULL,
                daret_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                amount NUMERIC NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'pending' {$statusCheck},
                paid_at DATETIME NULL,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                FOREIGN KEY(daret_cycle_id) REFERENCES daret_cycles(id) ON DELETE CASCADE,
                FOREIGN KEY(daret_id) REFERENCES darets(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ");
        DB::statement('
            INSERT INTO daret_payments_new (id, daret_cycle_id, daret_id, user_id, amount, status, paid_at, created_at, updated_at)
            SELECT id, daret_cycle_id, daret_id, user_id, amount, status, paid_at, created_at, updated_at
            FROM daret_payments
        ');
        DB::statement('DROP TABLE daret_payments');
        DB::statement('ALTER TABLE daret_payments_new RENAME TO daret_payments');
        DB::statement('CREATE UNIQUE INDEX daret_payments_daret_cycle_id_user_id_unique ON daret_payments (daret_cycle_id, user_id)');
        DB::statement('CREATE INDEX daret_payments_daret_id_status_index ON daret_payments (daret_id, status)');
        DB::statement('PRAGMA foreign_keys = ON');
    }
};
