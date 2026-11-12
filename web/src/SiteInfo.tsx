import { Link } from 'react-router-dom'
import { Brand } from './ui'

type Kind = 'privacy' | 'terms' | 'accessibility'
type Section = { title: string; paragraphs: string[]; points?: string[] }

const pages: Record<Kind, { eyebrow: string; title: string; intro: string; sections: Section[] }> = {
  privacy: {
    eyebrow: 'SITE INFORMATION / 01',
    title: 'Privacy, in plain sight.',
    intro: 'This notice describes the DocMind application supplied in this project. Your documents live on the server running your installation, so the person or organization operating that server controls its hosting and backups.',
    sections: [
      { title: 'What the app stores', paragraphs: ['When you create an account, DocMind stores your name, email address, a salted password hash, and session records. It stores the documents you upload, extracted text, optional embeddings, library names, questions, answers, and source references.'] },
      { title: 'Why it uses that data', paragraphs: ['DocMind uses account information to sign you in and keep libraries separate. It uses document content to search for relevant passages, answer your questions, and create summaries, flashcards, quizzes, and research notes. The included frontend has no advertising or analytics scripts.'] },
      { title: 'Where processing happens', paragraphs: ['By default, files and the SQLite database remain on the server running DocMind. Evidence mode works without a language model. If the server operator enables Ollama, relevant document text and questions are sent to the Ollama endpoint configured for that installation; that endpoint can be local or remote.'] },
      { title: 'Session cookie', paragraphs: ['The app uses one essential, HttpOnly, SameSite=Strict session cookie. It expires after at most eight hours, and the server ends a session after 30 minutes of inactivity. The cookie is marked Secure when the site uses HTTPS or the operator enables the secure-cookie setting.'] },
      { title: 'How long data remains', paragraphs: ['Account records, original files, extracted passages, and conversations remain until you remove documents or delete the account. Account deletion removes the account’s database records and stored original files from this installation. The server operator may separately manage backups.'] },
      { title: 'Your controls', paragraphs: ['From the account menu, you can export your profile, library and document metadata, and conversations; download original documents individually; or delete your account. For requests about a hosted installation or its backups, contact the person or organization operating it.'] },
    ],
  },
  terms: {
    eyebrow: 'SITE INFORMATION / 02',
    title: 'Use with care.',
    intro: 'DocMind is a research workspace for documents you choose to provide. These notes explain the behavior of the included application; a host may publish additional terms for its own deployment.',
    sections: [
      { title: 'Your documents', paragraphs: ['Upload only material you are allowed to use. Your account can access its own libraries and files; do not place secrets in a shared or untrusted installation.'] },
      { title: 'Answers and source checks', paragraphs: ['Search results and generated answers can be incomplete or mistaken. DocMind shows supporting passages where available, but you should inspect the original document before relying on a conclusion or using it for an important decision.'] },
      { title: 'Availability and operation', paragraphs: ['The person or organization running the server manages uptime, storage, backups, model configuration, and access to that installation. Optional model features depend on the configured Ollama service being available.'] },
      { title: 'Account actions', paragraphs: ['You can sign out, export account information, download original files, and delete your account from the research workspace. Deletion is intended to remove this installation’s active account records and original files; ask the operator about any backups.'] },
    ],
  },
  accessibility: {
    eyebrow: 'SITE INFORMATION / 03',
    title: 'A clear path through.',
    intro: 'The 3D source exhibit adds atmosphere to the public story. The essential explanations, links, and actions remain ordinary page content that can be reached without using the canvas.',
    sections: [
      { title: 'Keyboard and focus', paragraphs: ['Links, forms, source selectors, and tool tabs can be used with a keyboard. Focus indicators show where you are. The examples and source passages are written in the page rather than embedded only in the 3D scene.'] },
      { title: 'Reduced motion', paragraphs: ['If your system requests reduced motion, the moving 3D exhibit becomes a still composition and decorative movement is reduced. The research tools and account controls remain available.'] },
      { title: 'Reading and feedback', paragraphs: ['The layout adapts to narrow screens and zoom. If you find a barrier in the project, report it through the DocMind repository without posting private documents or account information.'] },
    ],
  },
}

export default function SiteInfo({ kind }: { kind: Kind }) {
  const page = pages[kind]
  return <div className="site-info-page">
    <header className="site-info-header"><Brand light /><Link to="/" className="site-info-back">← Back to the story</Link></header>
    <main className="site-info-layout">
      <aside className="site-info-rail"><span>DOCMIND / REFERENCE</span><nav aria-label="Site information"><Link to="/privacy" aria-current={kind === 'privacy' ? 'page' : undefined}>01&nbsp; Privacy</Link><Link to="/terms" aria-current={kind === 'terms' ? 'page' : undefined}>02&nbsp; Terms</Link><Link to="/accessibility" aria-current={kind === 'accessibility' ? 'page' : undefined}>03&nbsp; Accessibility</Link></nav><p>Updated 12 November 2026</p></aside>
      <article className="site-info-article"><span className="site-info-eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p className="site-info-intro">{page.intro}</p><div className="site-info-sections">{page.sections.map((section, index) => <section key={section.title}><small>{String(index + 1).padStart(2, '0')}</small><div><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.points && <ul>{section.points.map(point => <li key={point}>{point}</li>)}</ul>}</div></section>)}</div><Link className="site-info-end" to="/">Return to DocMind <span aria-hidden="true">↗</span></Link></article>
    </main>
    <footer className="site-info-footer"><Brand light /><span>Document intelligence, with a source.</span><nav aria-label="Footer"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/accessibility">Accessibility</Link><a href="https://github.com/AnmolShukla397/DocMind" target="_blank" rel="noreferrer">Project ↗</a></nav></footer>
  </div>
}
