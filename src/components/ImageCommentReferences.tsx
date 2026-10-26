import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDirectory } from '../app/Directory';
import type { ImageComment } from '../api/imageComments';
import { commentStepIds, useImageReferences } from './ImageReferenceContext';

function Reference({ children, details, onHover, onSelect }: { children: ReactNode; details: ReactNode; onHover?: (active: boolean) => void; onSelect?: () => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const anchor = useRef<HTMLButtonElement>(null);
  const id = useId();
  function show() {
    const rect = anchor.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 304)), top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 180)) });
    setOpen(true); onHover?.(true);
  }
  function hide() { setOpen(false); onHover?.(false); }
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => { if (!anchor.current?.contains(event.target as Node)) hide(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', hide, true);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', hide, true); };
  }, [open]);
  return <><button ref={anchor} type="button" aria-describedby={open ? id : undefined}
    onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
    onClick={() => { show(); onSelect?.(); }}
    style={{ display: 'inline', font: 'inherit', textAlign: 'left', background: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', cursor: 'pointer', overflowWrap: 'anywhere' }}>{children}</button>
    {open && createPortal(<div id={id} role="tooltip" style={{ position: 'fixed', ...position, width: 280, maxWidth: 'calc(100vw - 16px)', padding: 12, zIndex: 10000, background: 'var(--card, #172033)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 24px #0005', whiteSpace: 'normal', pointerEvents: 'none' }}>{details}</div>, document.body)}</>;
}
function UserReference({ id, children, stepId }: { id: number; children: ReactNode; stepId?: number | null }) {
  const { users, types } = useDirectory();
  const references = useImageReferences();
  const user = users.find(user => user.id === id);
  const step = references?.steps.find(step => step.id === stepId);
  return <Reference onHover={active => references?.setHovered(active ? step?.trackingStepId ?? null : null)} details={<>
    <strong>{user?.nome ?? `Usuário #${id}`}</strong><div>#{id}</div>
    {user ? <><div>{user.email}</div><div>{types.find(type => type.id === user.usuarioTipoId)?.nome}</div><div>{user.ativo ? 'Ativo' : 'Inativo'}</div></> : <div>Dados do usuário indisponíveis.</div>}
    {step && <div>Etapa: {step.codigo} {step.nome}</div>}
  </>}>{children}</Reference>;
}
function StepReference({ id, children }: { id: number; children: ReactNode }) {
  const references = useImageReferences();
  const step = references?.steps.find(step => step.id === id);
  return <Reference onHover={active => references?.setHovered(active ? step?.trackingStepId ?? null : null)}
    onSelect={() => { if (step && references) { references.setSelected(step.trackingStepId); references.imageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}
    details={step ? <><strong>{step.codigo} {step.nome}</strong><div>Clique para localizar esta etapa na imagem.</div></> : <>Esta etapa não está mais disponível na imagem.</>}>
    {children}
  </Reference>;
}
export function ImageCommentReferences({ comment }: { comment: ImageComment }) {
  const references = useImageReferences();
  const parts = comment.comentario.split(/(@[^\n@]+? \(#\d+\)|\[Etapa [^\n]*?\(etapa #\d+\)\]|@\d+\b)/g);
  const explicitSteps = new Set(Array.from(comment.comentario.matchAll(/\(etapa #(\d+)\)/g), match => Number(match[1])));
  return <>{parts.map((part, index) => {
    const user = part.match(/^@.*\(#(\d+)\)$/) ?? part.match(/^@(\d+)$/);
    if (user) return <UserReference key={index} id={Number(user[1])} stepId={comment.mencoes.find(mention => mention.usuarioId === Number(user[1]))?.trackingStepId}>{part}</UserReference>;
    const step = part.match(/^\[Etapa .*\(etapa #(\d+)\)\]$/);
    return step ? <StepReference key={index} id={Number(step[1])}>{part}</StepReference> : part;
  })}
  {Array.from(commentStepIds(comment)).filter(id => !explicitSteps.has(id)).map(id => {
    const step = references?.steps.find(step => step.id === id);
    return <span key={id}> <StepReference id={id}>{step ? `Etapa ${step.codigo ?? ''} ${step.nome ?? ''}` : `Etapa #${id}`}</StepReference></span>;
  })}</>;
}
