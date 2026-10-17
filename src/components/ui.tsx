import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}

export function IconButton({ label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className="icon-btn" aria-label={label} title={label} {...props} />;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input select" {...props} />;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return <label className="toggle-row"><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`toggle ${checked ? 'is-on' : ''}`}><span /></button><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span></label>;
}

export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return <span className="chip">{children}{onRemove && <button type="button" onClick={onRemove} aria-label="Remover"><X size={12} /></button>}</span>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><strong>{title}</strong><IconButton label="Fechar" onClick={onClose}><X size={18} /></IconButton></div>{children}</div></div>;
}
