import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

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
                    "max-w-[1000px] w-[95vw] h-[85vh] p-0 gap-0 border-none shadow-2xl flex flex-col",
                    "bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md overflow-hidden",
                    className
                )}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 shrink-0 z-20">
                    <div className="flex flex-col">
                        {title && (
                            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                {title}
                            </DialogTitle>
                        )}
                        {description && (
                            <div className="text-xs text-gray-500 mt-0.5">
                                {description}
                            </div>
                        )}
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