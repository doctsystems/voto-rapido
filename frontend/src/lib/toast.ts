/**
 * Centralized notification helper using Sonner.
 *
 * Regular notifications (success/error/info/warning) → top-right
 * Confirmation actions → top-center, stays until user acts
 */
import { toast as sonner } from 'sonner';

export const toast = {
  success: (msg: string) =>
    sonner.success(msg, { position: 'top-right' }),

  error: (msg: string) =>
    sonner.error(msg, { position: 'top-right', duration: 5000 }),

  info: (msg: string) =>
    sonner.info(msg, { position: 'top-right' }),

  warning: (msg: string) =>
    sonner.warning(msg, { position: 'top-right' }),

  /**
   * Confirmation toast — top-center, no auto-close.
   * Shows action + cancel buttons inside the toast.
   */
  confirm: (msg: string, onConfirm: () => void, confirmLabel = 'Confirmar') => {
    sonner(msg, {
      position: 'top-center',
      duration: Infinity,
      action: {
        label: confirmLabel,
        onClick: () => { sonner.dismiss(); onConfirm(); },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => sonner.dismiss(),
      },
    });
  },
};
