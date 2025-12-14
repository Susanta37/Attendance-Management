<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDocument extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'document_type',
        'document_name',
        'document_path',
        'verification_status',
        'verified_by',
        'verified_at',
        'rejection_reason',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    /**
     * Relationship: Document belongs to a user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship: Document verified by a user
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Approve the document
     */
    public function approve(int $verifiedBy): void
    {
        $this->update([
            'verification_status' => 'approved',
            'verified_by' => $verifiedBy,
            'verified_at' => now(),
            'rejection_reason' => null,
        ]);
    }

    /**
     * Reject the document
     */
    public function reject(int $verifiedBy, string $reason): void
    {
        $this->update([
            'verification_status' => 'rejected',
            'verified_by' => $verifiedBy,
            'verified_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Scope: Only pending documents
     */
    public function scopePending($query)
    {
        return $query->where('verification_status', 'pending');
    }

    /**
     * Scope: Only approved documents
     */
    public function scopeApproved($query)
    {
        return $query->where('verification_status', 'approved');
    }

    /**
     * Scope: Only rejected documents
     */
    public function scopeRejected($query)
    {
        return $query->where('verification_status', 'rejected');
    }
}
