import React from 'react';
import { Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalHeader, ModalBody, ModalFooter, ModalHeading, ModalCloseTrigger } from '@heroui/react';
import { cn } from '../../lib/utils';

export const Dialog = ({ open, onOpenChange, children, title, description, footer, size = "lg", className }) => {
    // We restore the strict conditional check to prevent "ghost" rendering 
    // when the state is false, while keeping the HeroUI v3 structure.
    if (!open) return null;

    return (
        <Modal
            isOpen={open}
            onOpenChange={onOpenChange}
        >
            <ModalBackdrop
                isDismissable={true}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            <ModalContainer 
                className="fixed inset-0 w-screen h-screen z-50 flex items-center justify-center p-4 pointer-events-none" 
                placement="center"
                size={size}
            >
                <ModalDialog
                    className={cn(
                        "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl relative outline-none max-h-[90vh] flex flex-col w-full pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300",
                        className
                    )}
                >
                    <ModalHeader className="py-3 px-5 pr-10 flex flex-col gap-0.5 relative">
                        <ModalHeading className="text-[14px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</ModalHeading>
                        {description && <p className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">{description}</p>}
                        <ModalCloseTrigger className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" />
                    </ModalHeader>

                    <ModalBody className="py-2 px-5 overflow-y-auto no-scrollbar">
                        <div className="text-zinc-700 dark:text-zinc-300 text-[13px] leading-relaxed">
                            {children}
                        </div>
                    </ModalBody>

                    {footer && (
                        <ModalFooter className="p-3 bg-transparent border-t border-zinc-100 dark:border-zinc-800/50 flex justify-end gap-2">
                            {footer}
                        </ModalFooter>
                    )}
                </ModalDialog>
            </ModalContainer>
        </Modal>
    );
};
