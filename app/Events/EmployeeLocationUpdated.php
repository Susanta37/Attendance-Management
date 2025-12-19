<?php

namespace App\Events;

use App\Models\EmployeeLocation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmployeeLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $location;

    /**
     * Create a new event instance.
     */
    public function __construct(EmployeeLocation $location)
    {
        $this->location = $location;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Broadcast on a private channel specific to the user ID
        return [
            new PrivateChannel('attendance.live.' . $this->location->user_id),
        ];
    }
}