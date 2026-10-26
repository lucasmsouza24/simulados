import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './ui.module.css';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}

/** Modal built on the native <dialog>: focus trap, Esc to close and inert background come from the browser. */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <div className={styles.dialogBody}>
          <h2 id={titleId}>{title}</h2>
          {children}
          <div className={styles.dialogActions}>{actions}</div>
        </div>
      )}
    </dialog>
  );
}
