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
        Schema::create('flights', function (Blueprint $table) {
            $table->id();
            $table->string('icao24')->nullable()->index();
            $table->string('callsign')->nullable();
            $table->decimal('longitude', 11, 6)->nullable();
            $table->decimal('latitude', 11, 6)->nullable();
            $table->integer('altitude')->nullable(); // altitude barométrica em metros
            $table->float('velocity')->nullable(); // velocidade em m/s
            $table->string('origin_country')->nullable();
            $table->timestamp('last_contact')->nullable();
            $table->float('true_track')->nullable(); // direção em graus
            $table->float('vertical_rate')->nullable(); // taxa de subida/descida em m/s
            $table->json('sensors')->nullable(); // sensores que detectaram
            $table->float('geo_altitude')->nullable(); // altitude geométrica em metros
            $table->string('squawk')->nullable(); // código squawk
            $table->boolean('spi')->nullable(); // special purpose indicator
            $table->integer('position_source')->nullable(); // fonte da posição
            $table->timestamps();

            // Índices para consultas comuns
            $table->index(['latitude', 'longitude']);
            $table->index('last_contact');
            $table->index('origin_country');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flights');
    }
};
