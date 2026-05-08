<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('kyc_verifications', function (Blueprint $table) {
            $table->text('extracted_text')->nullable()->after('selfie_path');
            $table->string('detected_cin_number')->nullable()->after('extracted_text');
            $table->boolean('ocr_verified')->default(false)->after('detected_cin_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kyc_verifications', function (Blueprint $table) {
            $table->dropColumn(['extracted_text', 'detected_cin_number', 'ocr_verified']);
        });
    }
};
