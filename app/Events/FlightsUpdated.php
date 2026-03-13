<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FlightsUpdated implements ShouldBroadcast
{
   use Dispatchable, InteractsWithSockets, SerializesModels;

   public array $flights;
   public array $stats;
   public string $timestamp;

   /**
    * Create a new event instance.
    */
   public function __construct(array $flights, array $stats)
   {
      $this->flights = $flights;
      $this->stats = $stats;
      $this->timestamp = now()->toISOString();
   }

   /**
    * Get the channels the event should broadcast on.
    */
   public function broadcastOn(): array
   {
      return [
         new Channel('flights')
      ];
   }

   /**
    * The event's broadcast name.
    */
   public function broadcastAs(): string
   {
      return 'flights.updated';
   }

   /**
    * Get the data to broadcast.
    */
   public function broadcastWith(): array
   {
      return [
         'flights' => $this->flights,
         'stats' => $this->stats,
         'timestamp' => $this->timestamp,
         'total_count' => count($this->flights)
      ];
   }

   /**
    * Determine if this event should be broadcast.
    */
   public function broadcastWhen(): bool
   {
      return !empty($this->flights);
   }
}
