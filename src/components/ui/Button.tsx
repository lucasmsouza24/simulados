import type { ButtonHTMLAttributes } from 'react';
import styles from './ui.module.css';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'normal' | 'small';
}

export function Button({ variant = 'primary', size = 'normal', className, type = 'button', ...rest }: ButtonProps) {
  const classes = [
    styles.button,
    variant === 'ghost' && styles.ghost,
    variant === 'danger' && styles.danger,
    size === 'small' && styles.small,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}

interface ToggleChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  pressed: boolean;
  onToggle: () => void;
}

export function ToggleChip({ pressed, onToggle, className, ...rest }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={[styles.chip, className].filter(Boolean).join(' ')}
      onClick={onToggle}
      {...rest}
    />
  );
}
