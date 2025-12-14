<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserDocumentController extends Controller
{
    /**
     * Get all documents for a user
     */
    public function index(User $user)
    {
        $documents = $user->documents()->latest()->get();

        return response()->json([
            'documents' => $documents,
        ]);
    }

    /**
     * Upload a new document for a user
     */
    public function store(Request $request, User $user)
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'max:255'],
            'document' => ['required', 'file', 'max:5120'], // 5MB max
        ]);

        // Store the file
        $file = $request->file('document');
        $fileName = time() . '_' . $file->getClientOriginalName();
        $filePath = $file->storeAs('documents/users/' . $user->id, $fileName, 'public');

        // Create document record
        $document = $user->documents()->create([
            'document_type' => $validated['document_type'],
            'document_name' => $file->getClientOriginalName(),
            'document_path' => $filePath,
            'verification_status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => $document,
        ], 201);
    }

    /**
     * Update document metadata
     */
    public function update(Request $request, UserDocument $document)
    {
        $validated = $request->validate([
            'document_type' => ['sometimes', 'string', 'max:255'],
            'document_name' => ['sometimes', 'string', 'max:255'],
        ]);

        $document->update($validated);

        return response()->json([
            'message' => 'Document updated successfully',
            'document' => $document,
        ]);
    }

    /**
     * Approve a document
     */
    public function approve(Request $request, UserDocument $document)
    {
        $document->approve(auth()->id());

        return response()->json([
            'message' => 'Document approved successfully',
            'document' => $document->fresh(),
        ]);
    }

    /**
     * Reject a document
     */
    public function reject(Request $request, UserDocument $document)
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $document->reject(auth()->id(), $validated['rejection_reason']);

        return response()->json([
            'message' => 'Document rejected successfully',
            'document' => $document->fresh(),
        ]);
    }

    /**
     * Soft delete a document
     */
    public function destroy(UserDocument $document)
    {
        // Delete the file from storage
        if (Storage::disk('public')->exists($document->document_path)) {
            Storage::disk('public')->delete($document->document_path);
        }

        $document->delete();

        return response()->json([
            'message' => 'Document deleted successfully',
        ]);
    }
}
