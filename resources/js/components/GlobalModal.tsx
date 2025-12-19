import React from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogClose, 
    DialogTitle, 
    DialogDescription // 1. Import this
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function GlobalModal({ 
    isOpen, 
    onClose, 
    title, 
    description, 
    children, 
    className 
}: GlobalModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className={cn(
                    // Base Layout & Animation
                    "p-0 gap-0 border-none shadow-2xl flex flex-col",
                    "bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md overflow-hidden",
                    "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
                    
                    // Responsive Dimensions
                    "w-full h-[90dvh] sm:h-[85vh] sm:rounded-xl",
                    
                    // Width Logic
                    "sm:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[1600px] 2xl:max-w-[95vw]",
                    
                    className
                )}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 shrink-0 z-20">
                    <div className="flex flex-col gap-0.5">
                        {/* Title is required for accessibility. If missing, we render a hidden one. */}
                        <DialogTitle className={cn("text-lg font-bold text-gray-900 dark:text-white", !title && "sr-only")}>
                            {title || "Modal"}
                        </DialogTitle>

                        {/* 2. FIX: Use DialogDescription component. 
                           If no description is provided, use "sr-only" class to hide it visually 
                           but keep it in the DOM to satisfy the warning.
                        */}
                        <DialogDescription className={cn("text-xs text-gray-500", !description && "sr-only")}>
                            {description || "Modal Content"}
                        </DialogDescription>
                    </div>

                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <X size={18} />
                        </Button>
                    </DialogClose>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden relative z-10 flex flex-col lg:flex-row h-full">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
}