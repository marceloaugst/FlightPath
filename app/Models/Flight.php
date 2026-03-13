<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    protected $fillable = [
        'icao24',
        'callsign',
        'longitude',
        'latitude',
        'altitude',
        'velocity',
        'origin_country',
        'last_contact',
        'true_track',
        'vertical_rate',
        'sensors',
        'geo_altitude',
        'squawk',
        'spi',
        'position_source'
    ];

    protected $casts = [
        'longitude' => 'decimal:6',
        'latitude' => 'decimal:6',
        'last_contact' => 'datetime',
        'altitude' => 'integer',
        'velocity' => 'float',
        'true_track' => 'float',
        'vertical_rate' => 'float',
        'geo_altitude' => 'float',
        'spi' => 'boolean'
    ];

    /**
     * Escopo para voos com posição válida
     */
    public function scopeWithPosition($query)
    {
        return $query->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->where('latitude', '!=', 0)
            ->where('longitude', '!=', 0);
    }

    /**
     * Escopo para voos ativos (último contato nas últimas 2 horas)
     */
    public function scopeActive($query)
    {
        return $query->where('last_contact', '>=', now()->subHours(2));
    }

    /**
     * Get flight speed in km/h
     */
    public function getSpeedKmhAttribute()
    {
        return $this->velocity ? round($this->velocity * 3.6, 1) : null;
    }

    /**
     * Get formatted altitude
     */
    public function getFormattedAltitudeAttribute()
    {
        return $this->altitude ? number_format($this->altitude) . ' m' : null;
    }
}
