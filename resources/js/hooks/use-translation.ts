import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function useTranslation() {
    const { translations, locale } = usePage<SharedData>().props as any;

    const t = (key: string): string => {
        // Safety check: ensure translations exists
        if (!translations) return key; 
        
        return translations[key] || key;
    };

    return { t, locale };
}