import { useEffect, useRef, useState, type FormEvent, type DragEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import { api, formatBytes, saveText, type Answer, type Collection, type DocumentRecord, type Message, type OllamaStatus, type Source, type User } from './api'
import { Brand, Button, Notice } from './ui'

type View = 'Chat' | 'Summary' | 'Study' | 'Research'
type Dialog = { kind: 'new' | 'rename' | 'delete-collection' | 'delete-document' | 'clear-chat' | 'delete-account'; id?: string; name?: string }
const views: View[] = ['Chat', 'Summary', 'Study', 'Research']
const toolContent = {
  Summary: { title: 'Read the entire argument.', detail: 'Find the central ideas and takeaways without losing the passages they came from.', button: 'Generate summary', kind: 'summary' },
  Study: { title: 'Turn reading into recall.', detail: 'Make source-backed flashcards or a practice quiz from this library.', button: 'Create flashcards', kind: 'flashcards' },
  Research: { title: 'Find the shape of the work.', detail: 'Extract objectives, methods, results, and conclusions, with gaps called out clearly.', button: 'Analyze research', kind: 'research' },
}

function SourceList({ sources, onSelect }: { sources: Source[]; onSelect: (source: Source) => void }) {
  return <div className="source-list"><span className="micro-label">EVIDENCE USED / {sources.length} PASSAGE{sources.length === 1 ? '' : 'S'}</span>{sources.map(item => <button className="source-row" type="button" key={item.chunk_id} onClick={() => onSelect(item)}><span>{item.label}</span><span><strong>{item.filename}</strong><small>Page {item.page} · Open passage</small></span><i>↗</i></button>)}</div>
}

function MessageCard({ message, onSource }: { message: Message; onSource: (source: Source) => void }) {
  const user = message.role === 'user'
  return <article className={`message ${user ? 'message-user' : 'message-assistant'}`}><div className="message-avatar" aria-hidden="true">{user ? 'YOU' : '[ ]'}</div><div className="message-content"><div className="message-byline"><strong>{user ? 'You' : 'DocMind'}</strong><span>{user ? 'QUESTION' : message.answer_mode || 'ANSWER'}</span></div><div className="markdown"><ReactMarkdown>{message.body}</ReactMarkdown></div>{!user && message.sources.length > 0 && <SourceList sources={message.sources} onSelect={onSource} />}</div></article>
}

function FileDrop({ onFiles, busy }: { onFiles: (files: File[]) => void; busy: boolean }) {
  const [dragging, setDragging] = useState(false)
  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setDragging(false); onFiles(Array.from(event.dataTransfer.files))
  }
  return <label className={`file-drop ${dragging ? 'dragging' : ''} ${busy ? 'busy' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }} onDrop={drop}><input type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg" multiple onChange={event => { onFiles(Array.from(event.target.files || [])); event.currentTarget.value = '' }} disabled={busy} /><span className="file-drop-mark" aria-hidden="true">↗</span><strong>{busy ? 'Reading your pages…' : dragging ? 'Release to add your sources' : 'Drop documents here'}</strong><small>or choose PDF, DOCX, TXT, MD, PNG or JPG · 15 MB each</small></label>
}

export default function Workspace({ user, onUser }: { user: User; onUser: (user: User | null) => void }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [collections, setCollections] = useState<Collection[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const [view, setView] = useState<View>('Chat')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [toolKind, setToolKind] = useState<'flashcards' | 'quiz'>('flashcards')
  const [source, setSource] = useState<Source | null>(null)
  const [document, setDocument] = useState<DocumentRecord | null>(null)
  const [inspector, setInspector] = useState(false)
  const [rail, setRail] = useState(false)
  const [profile, setProfile] = useState(false)
  const [collectionMenu, setCollectionMenu] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const activeId = params.get('c') || collections[0]?.id || ''
  const active = collections.find(item => item.id === activeId)

  useEffect(() => {
    let live = true
    Promise.all([api<Collection[]>('/collections'), api<OllamaStatus>('/status')])
      .then(([items, model]) => { if (live) { setCollections(items); setStatus(model) } })
      .catch(failure => { if (live) setError((failure as Error).message) })
    return () => { live = false }
  }, [])
  useEffect(() => {
    if (!activeId) { setDocuments([]); setMessages([]); return }
    let live = true
    Promise.all([
      api<DocumentRecord[]>(`/collections/${activeId}/documents`),
      api<Message[]>(`/collections/${activeId}/messages`),
    ]).then(([docs, chat]) => { if (live) { setDocuments(docs); setMessages(chat); setSource(null); setDocument(null); setAnswer(null) } })
      .catch(failure => { if (live) setError((failure as Error).message) })
    return () => { live = false }
  }, [activeId])
  useEffect(() => { if (view === 'Chat') end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages.length, view])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDialog(null); setProfile(false); setRail(false); setInspector(false) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  function selectCollection(id: string) {
    setParams({ c: id }); setView('Chat'); setRail(false); setCollectionMenu(''); setError(''); setNotice('')
  }
  function chooseSource(item: Source) { setSource(item); setDocument(null); setInspector(true) }
  async function refresh() {
    const items = await api<Collection[]>('/collections')
    setCollections(items)
    if (activeId) setDocuments(await api<DocumentRecord[]>(`/collections/${activeId}/documents`))
  }
  async function upload(files: File[]) {
    if (!activeId || !files.length) return
    if (documents.length + files.length > 40) { setError('A library can hold up to 40 documents.'); return }
    setError(''); setNotice(''); setBusy('upload')
    try {
      let uploaded = 0
      for (const file of files) {
        const body = new FormData()
        body.append('file', file)
        await api(`/collections/${activeId}/documents`, body)
        uploaded += 1
        setNotice(`${uploaded} of ${files.length} sources indexed…`)
      }
      await refresh()
      setNotice(`${uploaded} ${uploaded === 1 ? 'document is' : 'documents are'} ready to search.`)
    } catch (failure) { setError((failure as Error).message); await refresh().catch(() => undefined) }
    finally { setBusy('') }
  }
  async function ask(event: FormEvent) {
    event.preventDefault()
    const text = question.trim()
    if (!activeId || !text || busy) return
    setQuestion(''); setError(''); setNotice(''); setBusy('ask')
    const temporary: Message = { id: 'pending', role: 'user', body: text, sources: [], answer_mode: '', created_at: Date.now() / 1000 }
    setMessages(current => [...current, temporary])
    try {
      const result = await api<Answer>(`/collections/${activeId}/ask`, { question: text })
      const updated = await api<Message[]>(`/collections/${activeId}/messages`)
      setMessages(updated)
      if (result.sources[0]) { setSource(result.sources[0]); setDocument(null) }
    } catch (failure) {
      setMessages(current => current.filter(item => item.id !== 'pending'))
      setQuestion(text)
      setError((failure as Error).message)
    } finally { setBusy('') }
  }
  async function runTool(kind: string) {
    if (!activeId || busy) return
    setBusy('tool'); setError(''); setNotice('')
    try {
      const result = await api<Answer>(`/collections/${activeId}/tools/${kind}`, {}, 'POST')
      setAnswer(result)
      if (result.sources[0]) { setSource(result.sources[0]); setDocument(null) }
    } catch (failure) { setError((failure as Error).message) }
    finally { setBusy('') }
  }
  function openDialog(next: Dialog) {
    setDialog(next); setDialogValue(next.kind === 'rename' ? next.name || '' : ''); setCollectionMenu(''); setProfile(false)
  }
  async function confirmDialog(event: FormEvent) {
    event.preventDefault()
    if (!dialog || busy) return
    setBusy('dialog'); setError('')
    try {
      if (dialog.kind === 'new') {
        const created = await api<Collection>('/collections', { title: dialogValue.trim() })
        await refresh(); selectCollection(created.id); setNotice('New library created.')
      } else if (dialog.kind === 'rename') {
        await api(`/collections/${dialog.id}`, { title: dialogValue.trim() }, 'PATCH')
        await refresh(); setNotice('Library renamed.')
      } else if (dialog.kind === 'delete-collection') {
        await api(`/collections/${dialog.id}`, undefined, 'DELETE')
        const updated = await api<Collection[]>('/collections')
        setCollections(updated); setParams(updated[0] ? { c: updated[0].id } : {}); setNotice('Library deleted.')
      } else if (dialog.kind === 'delete-document') {
        await api(`/documents/${dialog.id}`, undefined, 'DELETE')
        await refresh(); setSource(null); setDocument(null); setNotice('Document removed.')
      } else if (dialog.kind === 'clear-chat') {
        await api(`/collections/${activeId}/messages`, undefined, 'DELETE')
        setMessages([]); setNotice('Conversation cleared.')
      } else {
        await api('/account', { password: dialogValue }, 'DELETE')
        onUser(null); navigate('/', { replace: true })
      }
      setDialog(null)
    } catch (failure) { setError((failure as Error).message) }
    finally { setBusy('') }
  }
  async function signOut() {
    await api('/auth/logout', {}, 'POST').catch(() => undefined)
    onUser(null); navigate('/auth', { replace: true })
  }
  async function exportData() {
    try {
      const data = await api<Record<string, unknown>>('/account/export')
      saveText('docmind-account-data.json', JSON.stringify(data, null, 2), 'application/json')
      setProfile(false); setNotice('Account data downloaded.')
    } catch (failure) { setError((failure as Error).message) }
  }
  function exportChat() {
    const content = messages.map(item => `## ${item.role === 'user' ? 'You' : 'DocMind'}\n\n${item.body}\n\n${item.sources.map(source => `${source.label} ${source.filename}, page ${source.page}\n${source.text}`).join('\n\n')}`).join('\n\n---\n\n')
    saveText('docmind-conversation.md', content)
    setNotice('Conversation downloaded.')
  }
  const subtitle = status?.chat_ready ? `Local AI connected · ${status.chat_model}` : 'Evidence mode · connect Ollama for generated answers'

  return <div className="workspace">
    <aside className={`workspace-rail ${rail ? 'open' : ''}`}><div className="rail-top"><Brand light /><button className="mobile-close" type="button" aria-label="Close library navigation" onClick={() => setRail(false)}>×</button></div><p className="rail-caption">YOUR DOCUMENT LIBRARIES</p><div className="rail-heading"><span>Collections</span><button type="button" aria-label="Create collection" onClick={() => openDialog({ kind: 'new' })}>＋</button></div><nav className="collection-list" aria-label="Collections">{collections.map(item => <div className={`collection-item ${activeId === item.id ? 'active' : ''}`} key={item.id}><button type="button" className="collection-select" onClick={() => selectCollection(item.id)} aria-current={activeId === item.id ? 'page' : undefined}><span className="collection-symbol">[ ]</span><span><strong>{item.title}</strong><small>{item.document_count} {item.document_count === 1 ? 'document' : 'documents'}</small></span></button><button type="button" className="collection-more" aria-label={`Options for ${item.title}`} aria-expanded={collectionMenu === item.id} onClick={() => setCollectionMenu(current => current === item.id ? '' : item.id)}>···</button>{collectionMenu === item.id && <div className="collection-popover"><button type="button" onClick={() => openDialog({ kind: 'rename', id: item.id, name: item.title })}>Rename</button><button type="button" onClick={() => openDialog({ kind: 'delete-collection', id: item.id, name: item.title })}>Delete</button></div>}</div>)}</nav><div className="rail-documents"><div className="rail-heading"><span>Sources</span><span>{documents.length.toString().padStart(2, '0')}</span></div>{documents.length ? <div className="document-list">{documents.map(item => <div className="document-item" key={item.id}><button type="button" onClick={() => { setDocument(item); setSource(null); setInspector(true); setRail(false) }}><span className="document-icon">▤</span><span><strong title={item.filename}>{item.filename}</strong><small>{item.page_count} {item.page_count === 1 ? 'page' : 'pages'} · {formatBytes(item.bytes)}</small></span></button><button type="button" className="document-delete" aria-label={`Remove ${item.filename}`} onClick={() => openDialog({ kind: 'delete-document', id: item.id, name: item.filename })}>×</button></div>)}</div> : <p className="rail-empty">Your source list will appear here.</p>}</div><div className="rail-bottom"><div className="status-indicator"><i className={status?.chat_ready ? 'online' : ''} /><span>{status?.chat_ready ? 'LOCAL AI READY' : 'EVIDENCE MODE'}</span></div><p>Your documents stay in this installation.</p></div></aside>
    {rail && <button className="workspace-scrim" type="button" aria-label="Close navigation" onClick={() => setRail(false)} />}
    <div className="workspace-center"><header className="workspace-top"><button className="mobile-menu" type="button" aria-label="Open library navigation" onClick={() => setRail(true)}>☰</button><div className="workspace-title"><span>DOCMIND / RESEARCH STUDIO</span><h1>{active?.title || 'Your library'}</h1></div><div className="workspace-top-actions"><button className="source-toggle" type="button" onClick={() => setInspector(value => !value)} aria-label="Toggle source inspector">[ ] <span>Source lens</span></button><div className="profile-wrap"><button type="button" className="profile-trigger" aria-label={`Account menu for ${user.name}`} aria-expanded={profile} onClick={() => setProfile(value => !value)}><span>{user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span><strong>{user.name.split(' ')[0]}</strong><i>⌄</i></button>{profile && <div className="profile-menu"><div><strong>{user.name}</strong><small>{user.email}</small></div><button onClick={exportData}>Download my data ↓</button><button onClick={() => openDialog({ kind: 'delete-account' })}>Delete account</button><button onClick={signOut}>Sign out ↗</button></div>}</div></div></header>
      <div className="workspace-body"><div className="workspace-meta"><div><span>YOUR RESEARCH SPACE</span><p>{subtitle}</p></div><div><strong>{documents.length.toString().padStart(2, '0')}</strong><span>SOURCES INDEXED</span></div></div><div className="view-tabs" role="tablist" aria-label="Research tools">{views.map(item => <button type="button" role="tab" aria-selected={view === item} className={view === item ? 'active' : ''} key={item} onClick={() => { setView(item); setError(''); setNotice(''); setAnswer(null) }}>{item}{view === item && <motion.i layoutId="workspace-tab" />}</button>)}</div><Notice message={error} /><Notice message={notice} type="success" />
      {!active ? <div className="blank-library"><span>[ 0 ]</span><h2>Make a place for your research.</h2><p>Create a library to begin adding documents and asking questions.</p><Button onClick={() => openDialog({ kind: 'new' })}>Create library</Button></div> : <>
        {view === 'Chat' ? <div className="chat-view"><div className="chat-stream">{messages.length ? messages.map(item => <MessageCard key={item.id} message={item} onSource={chooseSource} />) : <div className="chat-empty"><div className="empty-visual" aria-hidden="true"><span>[</span><i>?</i><span>]</span></div><h2>Start with a question.</h2><p>Upload a source, then ask what matters. Every answer points back to its supporting passage.</p><div className="suggested-questions">{['What are the key findings?', 'How was the conclusion reached?', 'What is still uncertain?'].map(text => <button type="button" key={text} onClick={() => setQuestion(text)}>{text} ↗</button>)}</div></div>}<div ref={end} /></div><div className="composer-area"><FileDrop onFiles={upload} busy={busy === 'upload'} /><form className="composer" onSubmit={ask}><label className="sr-only" htmlFor="ask-input">Ask your documents</label><textarea id="ask-input" rows={2} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder={documents.length ? 'Ask something specific about your sources…' : 'Add a source to begin asking…'} disabled={!documents.length || busy === 'ask'} /><Button type="submit" busy={busy === 'ask'} disabled={!documents.length || !question.trim()}>Ask</Button></form><div className="composer-foot"><span>ENTER TO ASK · SHIFT + ENTER FOR A NEW LINE</span>{messages.length > 0 && <div><button type="button" onClick={exportChat}>Export chat ↓</button><button type="button" onClick={() => openDialog({ kind: 'clear-chat' })}>Clear chat</button></div>}</div></div></div> : <div className="tool-view"><div className="tool-intro"><span>[ {view.toUpperCase()} ]</span><h2>{toolContent[view].title}</h2><p>{toolContent[view].detail}</p></div><div className="tool-control"><div><strong>{documents.length} {documents.length === 1 ? 'source' : 'sources'} in this library</strong><span>{documents.length ? 'The output will cite the passages it uses.' : 'Add a document in Chat first.'}</span></div>{view === 'Study' && <div className="study-switch" role="group" aria-label="Study format"><button type="button" className={toolKind === 'flashcards' ? 'active' : ''} onClick={() => { setToolKind('flashcards'); setAnswer(null) }}>Flashcards</button><button type="button" className={toolKind === 'quiz' ? 'active' : ''} onClick={() => { setToolKind('quiz'); setAnswer(null) }}>Quiz</button></div>}<Button onClick={() => runTool(view === 'Study' ? toolKind : toolContent[view].kind)} busy={busy === 'tool'} disabled={!documents.length}>{view === 'Study' && toolKind === 'quiz' ? 'Create quiz' : toolContent[view].button}</Button></div>{answer ? <motion.div className="tool-result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}><div className="tool-result-head"><span>RESULT / {answer.answer_mode.toUpperCase()}</span><button type="button" onClick={() => saveText(`docmind-${view.toLowerCase()}.md`, answer.answer)}>Download .md ↓</button></div><div className="markdown"><ReactMarkdown>{answer.answer}</ReactMarkdown></div>{answer.sources.length > 0 && <SourceList sources={answer.sources} onSelect={chooseSource} />}</motion.div> : <div className="tool-empty"><div aria-hidden="true">[ {view === 'Summary' ? 'Σ' : view === 'Study' ? '?' : '∴'} ]</div><p>Your {view.toLowerCase()} output will appear here, linked to its source passages.</p></div>}</div>}
      </>}</div>
    </div>
    <aside className={`inspector ${inspector ? 'open' : ''}`}><div className="inspector-head"><span>SOURCE LENS / DOCMIND</span><button type="button" aria-label="Close source inspector" onClick={() => setInspector(false)}>×</button></div>{source ? <div className="inspector-content"><div className="inspector-mark">{source.label}</div><h2>See the passage<br />behind the answer.</h2><div className="inspector-file"><span>DOCUMENT</span><strong>{source.filename}</strong><span>PAGE {String(source.page).padStart(2, '0')}</span></div><blockquote>{source.text}</blockquote><div className="inspector-score"><span>RETRIEVAL SIGNAL</span><strong>{Math.round(source.signal * 100)}<small>/100</small></strong></div><a className="inspector-open" href={`/api/documents/${source.document_id}/file`} target="_blank" rel="noreferrer">Open original document ↗</a></div> : document ? <div className="inspector-content"><div className="inspector-mark">▤</div><h2>Source on file.</h2><div className="inspector-file"><span>DOCUMENT</span><strong>{document.filename}</strong><span>{document.page_count} PAGES · {document.chunk_count} PASSAGES</span></div><p className="inspector-help">DocMind split this document into searchable passages and kept the original file linked to your account.</p><a className="inspector-open" href={`/api/documents/${document.id}/file`} target="_blank" rel="noreferrer">Open original document ↗</a></div> : <div className="inspector-empty"><div>[ ]</div><h2>Everything has<br />a source.</h2><p>Choose a cited passage or a document to inspect its origin here.</p></div>}<div className="inspector-bottom">A GOOD ANSWER LEAVES A TRAIL.</div></aside>
    {inspector && <button className="inspector-scrim" type="button" aria-label="Close source inspector" onClick={() => setInspector(false)} />}
    <AnimatePresence>{dialog && <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDialog(null) }}><motion.form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onSubmit={confirmDialog} initial={{ opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} transition={{ duration: .22 }}><button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => setDialog(null)}>×</button><span>[ DOCMIND / LIBRARY ACTION ]</span><h2 id="dialog-title">{dialog.kind === 'new' ? 'Name your library.' : dialog.kind === 'rename' ? 'Rename this library.' : dialog.kind === 'delete-account' ? 'Delete your account?' : dialog.kind === 'clear-chat' ? 'Clear the conversation?' : dialog.kind === 'delete-collection' ? 'Delete this library?' : 'Remove this document?'}</h2><p>{dialog.kind === 'new' ? 'Keep related documents and conversations together.' : dialog.kind === 'rename' ? 'Your documents and conversation stay in place.' : dialog.kind === 'delete-account' ? 'This removes your libraries, documents and messages from this installation. Enter your password to continue.' : dialog.kind === 'clear-chat' ? 'This removes the conversation from this library. Documents stay indexed.' : dialog.kind === 'delete-collection' ? `“${dialog.name}” and its documents and conversation will be removed.` : `“${dialog.name}” will be removed from your library.`}</p>{['new', 'rename', 'delete-account'].includes(dialog.kind) && <label><span>{dialog.kind === 'delete-account' ? 'Current password' : 'Library name'}</span><input autoFocus type={dialog.kind === 'delete-account' ? 'password' : 'text'} value={dialogValue} onChange={event => setDialogValue(event.target.value)} required minLength={dialog.kind === 'delete-account' ? 1 : 2} maxLength={dialog.kind === 'delete-account' ? 256 : 80} /></label>}<div className="dialog-actions"><Button type="button" quiet onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" busy={busy === 'dialog'} disabled={['new', 'rename', 'delete-account'].includes(dialog.kind) && !dialogValue.trim()}>{dialog.kind.startsWith('delete') || dialog.kind === 'clear-chat' ? 'Confirm action' : 'Save library'}</Button></div></motion.form></div>}</AnimatePresence>
  </div>
}
