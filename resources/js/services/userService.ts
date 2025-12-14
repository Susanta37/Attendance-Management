import axios from 'axios';
import {
    User,
    UserFormData,
    UserFilters,
    InitialData,
    UserDocument,
} from '@/types/user-management';

/**
 * User Management API Service
 * All endpoints return JSON responses from web.php routes
 */
class UserService {
    private baseUrl = '/admin/users';

    /**
     * Get initial data: users with filters + roles, departments, settings schema
     */
    async getInitialData(filters?: UserFilters): Promise<InitialData> {
        const response = await axios.get(this.baseUrl, {
            params: filters,
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        return response.data;
    }

    /**
     * Create new user
     */
    async createUser(data: UserFormData): Promise<{ message: string; user: User }> {
        const response = await axios.post(this.baseUrl, data, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Update existing user
     */
    async updateUser(userId: number, data: UserFormData): Promise<{ message: string; user: User }> {
        const response = await axios.put(`${this.baseUrl}/${userId}`, data, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Soft delete user (deactivate)
     */
    async deleteUser(userId: number): Promise<{ message: string }> {
        const response = await axios.delete(`${this.baseUrl}/${userId}`, {
            headers: {
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Restore soft deleted user (activate)
     */
    async restoreUser(userId: number): Promise<{ message: string; user: User }> {
        const response = await axios.post(`${this.baseUrl}/${userId}/restore`, {}, {
            headers: {
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Get user documents
     */
    async getUserDocuments(userId: number): Promise<{ documents: UserDocument[] }> {
        const response = await axios.get(`${this.baseUrl}/${userId}/documents`, {
            headers: {
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Upload document for user
     */
    async uploadDocument(userId: number, file: File, documentType: string): Promise<{ message: string; document: UserDocument }> {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('document_type', documentType);

        const response = await axios.post(`${this.baseUrl}/${userId}/documents`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Approve document
     */
    async approveDocument(documentId: number): Promise<{ message: string; document: UserDocument }> {
        const response = await axios.post(`${this.baseUrl}/documents/${documentId}/approve`, {}, {
            headers: {
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Reject document
     */
    async rejectDocument(documentId: number, reason: string): Promise<{ message: string; document: UserDocument }> {
        const response = await axios.post(
            `${this.baseUrl}/documents/${documentId}/reject`,
            { rejection_reason: reason },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );
        return response.data;
    }

    /**
     * Delete document
     */
    async deleteDocument(documentId: number): Promise<{ message: string }> {
        const response = await axios.delete(`${this.baseUrl}/documents/${documentId}`, {
            headers: {
                'Accept': 'application/json',
            },
        });
        return response.data;
    }

    /**
     * Enroll face for user
     */
    async enrollFace(userId: number, imageData: string): Promise<{ success: boolean; message?: string }> {
        const response = await axios.post(
            `${this.baseUrl}/${userId}/face/enroll`,
            { image: imageData },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );
        return response.data;
    }

    /**
     * Re-enroll face for user
     */
    async reEnrollFace(userId: number, imageData: string): Promise<{ success: boolean; message?: string }> {
        const response = await axios.post(
            `${this.baseUrl}/${userId}/face/re-enroll`,
            { image: imageData },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );
        return response.data;
    }
}

// Export singleton instance
export const userService = new UserService();
