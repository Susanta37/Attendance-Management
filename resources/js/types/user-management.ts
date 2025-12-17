// User Management TypeScript Interfaces

export interface Role {
    id: number;
    name: string;
    slug: string;
}

export interface Department {
    id: number;
    name: string;
    parent_id: number | null;
    type: string;
}

export interface UserSetting {
    id?: number;
    user_id?: number;
    face_verification_enabled: boolean;
    gps_spoof_check_enabled: boolean;
    multiple_attendance_allowed: boolean;
    allow_outside_geofence: boolean;
    live_tracking_enabled: boolean;
    shift_start?: string;
    shift_end?: string;
}

export interface UserSettingSchema {
    key: keyof UserSetting;
    label: string;
    type: 'boolean';
    default: boolean;
}

export interface UserDocument {
    id: number;
    user_id: number;
    document_type: string;
    document_name: string;
    document_path: string;
    verification_status: 'pending' | 'approved' | 'rejected';
    verified_by?: number;
    verified_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface FaceEmbedding {
    id: number;
    user_id: number;
    embedding: number[] | string;
    registered_image: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role_id: number;
    department_id: number;
    address?: string;
    district?: string;
    block?: string;
    gram_panchayat?: string;
    pincode?: string;
    status: 'active' | 'inactive' | 'suspended';
    is_first_login: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;

    // Relationships
    role?: Role;
    department?: Department;
    settings?: UserSetting;
    documents?: UserDocument[];
    face_embedding?: FaceEmbedding;
}

export interface UserFormData {
    name: string;
    email: string;
    phone: string;
    password?: string;
    role_id: number;
    department_id: number;
    address?: string;
    district?: string;
    block?: string;
    gram_panchayat?: string;
    pincode?: string;
    settings?: Partial<UserSetting>;
}

export interface UserFilters {
    role_id?: string;
    district?: string;
    block?: string;
    gram_panchayat?: string;
    search?: string;
}

export interface PaginatedUsers {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface InitialData {
    users: PaginatedUsers;
    roles: Role[];
    departments: Department[];
    userSettingsSchema: UserSettingSchema[];
}
