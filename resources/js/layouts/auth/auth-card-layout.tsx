import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { useTranslation } from '@/hooks/use-translation'; 

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { t } = useTranslation(); // 2. Use Hook

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-b from-orange-50 to-white p-6 md:p-10 dark:from-zinc-900 dark:to-zinc-950">
            <div className="flex w-full max-w-md flex-col gap-6">
                {/* Logo Section with Professional Branding */}
                {/* Logo Section with Professional Branding */}
            <Link
                href={home()}
                className="flex flex-col items-center gap-2 self-center font-medium transition-opacity hover:opacity-90"
            >
                {/* Logo Image */}
                <div className="flex items-center justify-center">
                    <img
                        src="/assets/images/logo.png"
                        alt="Logo"
                        className="h-16 w-auto drop-shadow-md"
                    />
                </div>

                {/* App Title */}
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white text-center leading-tight">
                    Attendance
                    <span className="text-orange-600"> Management</span>
                </h1>

                {/* Optional Subtitle from Translations */}
                {/* <span className="text-sm text-gray-500 dark:text-gray-400 -mt-1">
                    {t('app_name')}
                </span> */}
            </Link>


                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl border-orange-100 shadow-xl shadow-orange-500/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
                        <CardHeader className="space-y-1 px-10 pt-8 pb-2 text-center">
                            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {title}
                            </CardTitle>
                            <CardDescription className="text-base text-gray-500 dark:text-gray-400">
                                {description}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="px-10 pb-8 pt-6">
                            {children}
                        </CardContent>
                    </Card>
                </div>
                
                {/* Footer / Legal Text (Localized) */}
                <p className="px-8 text-center text-xs text-gray-400">
                    {t('footer_copy')} <br/>
                    {t('footer_sub')}
                </p>
            </div>
        </div>
    );
}