import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onF2_NewBill?: () => void;
  onF3_AddCustomer?: () => void;
  onF4_SearchProduct?: () => void;
  onF6_ToggleGst?: () => void;
  onF7_ToggleInterstate?: () => void;
  onF8_QuickPay?: () => void;
  onF9_SaveAndPrint?: () => void;
  onF10_HoldDraft?: () => void;
  onF11_ClearBill?: () => void;
  onEscape?: () => void;
  onBarcodeScan?: (barcode: string) => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check Alt shortcuts (work from anywhere)
      if (e.altKey) {
        if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          handlers.onF6_ToggleGst?.();
          return;
        }
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          handlers.onF11_ClearBill?.();
          return;
        }
      }

      // Ignore functional keys if target is inside an editable input unless F-key
      const isFKey = e.key.startsWith('F') && e.key.length <= 3;
      const isEscape = e.key === 'Escape';

      if (isFKey) {
        e.preventDefault();
        switch (e.key) {
          case 'F2':
            handlers.onF2_NewBill?.();
            break;
          case 'F3':
            handlers.onF3_AddCustomer?.();
            break;
          case 'F4':
            handlers.onF4_SearchProduct?.();
            break;
          case 'F6':
            handlers.onF6_ToggleGst?.();
            break;
          case 'F7':
            handlers.onF7_ToggleInterstate?.();
            break;
          case 'F8':
            handlers.onF8_QuickPay?.();
            break;
          case 'F9':
            handlers.onF9_SaveAndPrint?.();
            break;
          case 'F10':
            handlers.onF10_HoldDraft?.();
            break;
          case 'F11':
            handlers.onF11_ClearBill?.();
            break;
        }
        return;
      }

      if (isEscape) {
        handlers.onEscape?.();
        return;
      }

      // Barcode Scanner Listener:
      // Scanners type characters rapidly (< 50ms interval) ending with Enter.
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Reset buffer if typing was slow (> 100ms between keys)
      if (timeDiff > 100) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 4) {
          // Trigger barcode scan handler
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          handlers.onBarcodeScan?.(scannedCode);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers, enabled]);
}
