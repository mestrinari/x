import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { AtSign, MessageSquare, Pencil, Send, Trash2 } from 'lucide-react';
import { useDirectory } from '../app/Directory';
import { errorMessage } from '../api/resources';
import { createImageComment, deleteImageComment, editImageComment, loadImageCommentContext, type ImageCommentStep, type ImageComment, type ImageMentionInput } from '../api/imageComments';
import { Button } from './ui';

// Mentions use readable text with a stable user ID, supported by the existing comment contract.
function CommentText({ text }: { text: string }) {
  return <>{text.split(/(@[^\n@]+? \(#\d+\))/g).map((part, i) => /^@[^\n@]+ \(#\d+\)$/.test(part)
    ? <mark key={i} style={{ background: 'var(--accent)', color: 'var(--foreground)', borderRadius: 4, padding: '0 3px' }}>{part}</mark>
    : part)}</>;
}

export interface ImageCommentsHandle {
  referenceStep: (stepId: string) => void;
}
export function ImageComments({ imageId, disabled = false, ref }: { imageId?: number; disabled?: boolean; ref?: Ref<ImageCommentsHandle> }) {
  const { users, actorId, userName } = useDirectory();
  const inputId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const lock = useRef(false);
  const [comments, setComments] = useState<ImageComment[]>([]);
  const [steps, setSteps] = useState<ImageCommentStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [mentionIds, setMentionIds] = useState<number[]>([]);
  const [mentionTrackingSteps, setMentionTrackingSteps] = useState<Record<number, number | null>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionEnd, setMentionEnd] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const people = users.filter(user => user.ativo && `${user.nome} ${user.id}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).slice(0, 20);

  useEffect(() => {
    if (!imageId) return;
    let active = true;
    setLoading(true); setError('');
    loadImageCommentContext(imageId).then(data => { if (active) { setComments(data.comentarios); setSteps(data.trackingSteps); } })
      .catch(reason => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [imageId, revision]);

  useImperativeHandle(ref, () => ({
    referenceStep(stepId) {
      if (!imageId || disabled || busy || loading) return;
      const step = steps.find(item => item.trackingStepId === stepId);
      if (!step) { setError('Salve a imagem e atualize os comentários para referenciar esta etapa.'); return; }
      const token = `[Etapa ${[step.codigo, step.nome].filter(Boolean).join(' · ') || step.trackingStepId} (etapa #${step.id})] `;
      const start = textarea.current?.selectionStart ?? text.length;
      const end = textarea.current?.selectionEnd ?? start;
      setText(text.slice(0, start) + token + text.slice(end));
      setSelectedStep(step.id);
      setMentionTrackingSteps(() => Object.fromEntries(mentionIds.map(id => [id, step.id])));
      setMentionsOpen(false); setMentionStart(null); setError(''); setNotice('');
      requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(start + token.length, start + token.length); });
    },
  }));

  function changeText(value: string, cursor: number) {
    setText(value); setNotice('');
    if (selectedStep !== null && !value.includes(`(etapa #${selectedStep})`)) setSelectedStep(null);
    setMentionTrackingSteps(current => Object.fromEntries(Object.entries(current).map(([id, stepId]) =>
      [id, stepId !== null && text.includes(`(etapa #${stepId})`) && !value.includes(`(etapa #${stepId})`) ? null : stepId])));
    const match = value.slice(0, cursor).match(/(?:^|\s)@([^@\n]*)$/);
    setMentionsOpen(Boolean(match));
    setQuery(match?.[1] ?? '');
    setMentionStart(match ? cursor - match[1].length - 1 : null);
    setMentionEnd(cursor);
  }

  function mention(id: number, name: string) {
    const start = mentionStart ?? textarea.current?.selectionStart ?? text.length;
    const end = mentionStart !== null ? mentionEnd : start;
    const token = `@${name.replace(/[\r\n]/g, ' ')} (#${id}) `;
    setText(text.slice(0, start) + token + text.slice(end));
    setMentionIds(current => current.includes(id) ? current : [...current, id]);
    setMentionTrackingSteps(current => ({ ...current, [id]: selectedStep ?? current[id] ?? null }));
    setMentionsOpen(false); setMentionStart(null); setQuery('');
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(start + token.length, start + token.length); });
  }

  async function submit() {
    if (!imageId || !actorId || !text.trim() || disabled || loading || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const mencoes: ImageMentionInput[] = mentionIds
        .filter(id => text.includes(`(#${id})`))
        .map(usuarioId => ({ usuarioId, trackingStepId: mentionTrackingSteps[usuarioId] ?? null }));
      const result = editing === null
        ? await createImageComment(imageId, Number(actorId), userName(actorId), text.trim(), mencoes)
        : await editImageComment(imageId, editing, text.trim(), mencoes);
      setComments(current => editing === null ? [...current, result] : current.map(item => item.id === result.id ? result : item));
      setText(''); setMentionIds([]); setMentionTrackingSteps({}); setSelectedStep(null); setEditing(null); setMentionsOpen(false); setNotice('Comentário salvo.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { lock.current = false; setBusy(false); }
  }

  async function remove(id: number) {
    if (!imageId || disabled || lock.current || !window.confirm('Excluir este comentário?')) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await deleteImageComment(imageId, id);
      setComments(current => current.filter(item => item.id !== id));
      if (editing === id) { setEditing(null); setText(''); }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { lock.current = false; setBusy(false); }
  }

  return <section aria-label="Comentários da imagem" style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <MessageSquare size={16}/><strong>Comentários ({comments.length})</strong>
      {imageId && <Button type="button" variant="ghost" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}>Atualizar</Button>}
    </div>
    {!imageId ? <p className="field-help">Salve a imagem para adicionar comentários e mencionar pessoas.</p> : <>
      {loading && <p role="status">Carregando comentários...</p>}
      {!loading && !comments.length && <p className="field-help">Seja o primeiro a comentar.</p>}
      <div style={{ display: 'grid', gap: 12, maxHeight: 320, overflowY: 'auto', margin: '12px 0' }}>
        {comments.map(comment => <article key={comment.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
          <strong>{comment.autorNome}</strong>{' '}<small>{new Date(comment.criadoEm).toLocaleString('pt-BR')}{comment.modificadoEm ? ' · editado' : ''}</small>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><CommentText text={comment.comentario}/></p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => { setSelectedStep(null); setEditing(comment.id); setText(comment.comentario); setMentionIds(comment.mencoes?.map(mention => mention.usuarioId) ?? []); setMentionTrackingSteps(Object.fromEntries((comment.mencoes ?? []).map(mention => [mention.usuarioId, mention.trackingStepId]))); setError(''); setNotice(''); textarea.current?.focus(); }}><Pencil size={13}/> Editar</Button>
            <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => void remove(comment.id)}><Trash2 size={13}/> Excluir</Button>
          </div>
        </article>)}
      </div>
      <label htmlFor={inputId}>{editing === null ? 'Mensagem da imagem' : 'Editar comentário'}</label>
      <textarea className="input textarea" id={inputId} ref={textarea} rows={3} value={text} disabled={disabled || busy}
        placeholder="Escreva um comentário. Digite @ para mencionar alguém."
        onChange={event => changeText(event.target.value, event.target.selectionStart)}
        onKeyDown={event => { if (event.key === 'Escape') setMentionsOpen(false); if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void submit(); } }}/>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <Button type="button" variant="secondary" disabled={disabled || busy} onClick={() => { setMentionsOpen(v => !v); setMentionStart(null); setQuery(''); }}><AtSign size={14}/> Mencionar pessoa</Button>
        <Button type="button" disabled={disabled || busy || loading || !actorId || !text.trim()} onClick={() => void submit()}><Send size={14}/>{busy ? 'Salvando...' : editing === null ? 'Enviar comentário' : 'Salvar comentário'}</Button>
        {editing !== null && <Button type="button" variant="ghost" disabled={busy} onClick={() => { setEditing(null); setText(''); setMentionIds([]); setMentionTrackingSteps({}); setSelectedStep(null); setMentionsOpen(false); }}>Cancelar edição</Button>}
      </div>
      {mentionsOpen && <div style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, marginTop: 8 }}>
        <input aria-label="Buscar pessoa para mencionar" value={query} placeholder="Buscar pessoa" onChange={event => setQuery(event.target.value)} style={{ width: '100%', padding: 8 }}/>
        <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid' }}>{people.map(person => <Button key={person.id} type="button" variant="ghost" onClick={() => mention(Number(person.id), person.nome)}>@{person.nome} · #{person.id}</Button>)}</div>
        {!people.length && <p>Nenhuma pessoa encontrada.</p>}
      </div>}
      {!actorId && <p className="field-help">Selecione um operador para identificar o autor do comentário.</p>}
      <p className="field-help">Menções ficam no texto do comentário; não enviam notificações automáticas.</p>
    </>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
