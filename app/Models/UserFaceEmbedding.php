<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserFaceEmbedding extends Model
{
    protected $table = 'user_face_embeddings';

    protected $fillable = [
        'user_id',
        'embedding',
        'registered_image',
    ];

    protected $casts = [
        'embedding' => 'array', // Automatically decode JSON if embedding stored as JSON
    ];

    // Relationship: Face embedding belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
