import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll } from 'motion/react'
import type { User } from './api'
import { Brand } from './ui'

const Scene=lazy(()=>import('./Scene'))
const findings=[
 {question:'What changed after the trial?',answer:'Completion time improved by 28% across three trials.',detail:'The paper recommends a larger sample before wider adoption.',source:'Across three trials, the revised workflow improved completion time by 28% compared with the baseline.',page:'03'},
 {question:'How was it measured?',answer:'A revised workflow was compared with the baseline.',detail:'The same participating teams completed three consecutive trials.',source:'We compared baseline and revised workflows over three consecutive trials with the participating teams.',page:'02'},
 {question:'What remains uncertain?',answer:'The result has not been validated beyond the test teams.',detail:'Further evaluation is needed before broad deployment.',source:'The test sample was limited to the participating teams; wider deployment needs further evaluation.',page:'06'},
]
const stages=[
 {title:'Collect',line:'Bring the work together.',detail:'PDFs, Word files, notes, and scans live in a private source library.'},
 {title:'Trace',line:'Follow each claim home.',detail:'A finding stays attached to its supporting passage and original page.'},
 {title:'Understand',line:'Know what holds up.',detail:'Turn source-backed answers into summaries, study tools, and research notes.'},
]
const tools=[
 {name:'Ask',label:'A question becomes a trail.',detail:'Get a concise answer with the passages that support it.',example:'What changed after the trial?',result:'28% faster across three trials',page:'03'},
 {name:'Summarize',label:'The whole argument, in view.',detail:'Find the central ideas, takeaways, and supporting sources.',example:'Summarize the outcome and limits.',result:'Outcome · method · limitations',page:'02–06'},
 {name:'Study',label:'Read it. Keep it.',detail:'Make source-backed flashcards and practice quizzes.',example:'What did the comparison show?',result:'A prompt worth remembering',page:'02'},
 {name:'Research',label:'See the shape of the work.',detail:'Separate objectives, methods, results, conclusions, and gaps.',example:'What remains unproven?',result:'The sample needs broader testing',page:'06'},
]

function Cursor(){
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!matchMedia('(pointer:fine)').matches)return
  let frame=0
  const move=(event:PointerEvent)=>{
   cancelAnimationFrame(frame)
   frame=requestAnimationFrame(()=>{
    const element=ref.current
    if(!element)return
    element.dataset.active='true'
    element.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0)`
    const target=event.target instanceof Element?event.target:document.documentElement
    const label=target.closest('[data-cursor]')?.getAttribute('data-cursor')||''
    if(element.dataset.label!==label)element.dataset.label=label
   })
  }
  document.addEventListener('pointermove',move,{passive:true})
  const hide=()=>{if(ref.current)ref.current.dataset.active='false'}
  document.addEventListener('pointerleave',hide)
  window.addEventListener('scroll',hide,{passive:true})
  return()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',hide);window.removeEventListener('scroll',hide);cancelAnimationFrame(frame)}
 },[])
 return <div ref={ref} className="dv-cursor" aria-hidden="true"/>
}

export default function Landing({user}:{user:User|null}){
 const [finding,setFinding]=useState(0),[stage,setStage]=useState(0),[tool,setTool]=useState(0)
 const story=useRef<HTMLDivElement>(null)
 const reduced=Boolean(useReducedMotion())
 const {scrollYProgress}=useScroll({target:story,offset:['start start','end end']})
 const storyInView=useInView(story,{margin:'200px'})
 const destination=user?'/app':'/auth?create=1'
 function tilt(event:React.PointerEvent<HTMLDivElement>){
  if(reduced)return
  const bounds=event.currentTarget.getBoundingClientRect()
  const x=(event.clientX-bounds.left)/bounds.width-.5
  const y=(event.clientY-bounds.top)/bounds.height-.5
  event.currentTarget.style.setProperty('--ry',`${x*7}deg`)
  event.currentTarget.style.setProperty('--rx',`${-y*6}deg`)
 }
 return <div className="dv-page"><Cursor/>
  <header className="dv-nav"><Brand light/><nav aria-label="Main navigation"><a href="#demo">The question</a><a href="#method">The method</a><a href="#tools">Inside DocMind</a></nav><div className="dv-nav-actions">{!user&&<Link to="/auth" className="dv-signin">Sign in</Link>}<Link to={destination} className="dv-nav-enter" data-cursor="OPEN">Open DocMind <span aria-hidden="true">↗</span></Link></div></header>
  <main>
   <div className="dv-story" ref={story}>
    <div className="dv-stage"><Suspense fallback={<div className="dv-scene-fallback">A source comes into view.</div>}><Scene selected={finding} onSelect={()=>setFinding(value=>(value+1)%findings.length)} scroll={scrollYProgress} active={storyInView}/></Suspense></div>
    <div className="dv-chapters">
     <section className="dv-chapter dv-opening">
      <motion.div className="dv-opening-copy" initial={reduced?false:{opacity:0,y:32}} animate={{opacity:1,y:0}} transition={{duration:.85,ease:[.22,1,.36,1]}}>
       <h1>Every answer<br/><em>leaves a trail.</em></h1>
       <p>Ask your documents anything. DocMind shows the passage behind every answer, so the source is always within reach.</p>
       <div className="dv-actions"><Link to={destination} className="dv-primary" data-cursor="START"><span>Start a library</span><span className="dv-page-mark" aria-hidden="true"><i/><i/></span></Link><a href="#demo" className="dv-secondary" data-cursor="SCROLL">See how it works ↓</a></div>
      </motion.div>
      <div className="dv-opening-bottom"><span>Drag the source to turn it</span><div className="dv-source-switch" role="group" aria-label="Featured source">{findings.map((item,index)=><button type="button" key={item.page} aria-label={`Show featured source ${index+1}`} aria-pressed={finding===index} onClick={()=>setFinding(index)} className={finding===index?'active':''} data-cursor="VIEW">{item.page}</button>)}</div><span>Scroll to follow the evidence ↓</span></div>
     </section>
     <section className="dv-chapter dv-question" id="demo">
      <div className="dv-question-content">
       <motion.h2 initial={reduced?false:{opacity:.35,y:25}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.25}} transition={{duration:.55}}>Ask the page.<br/><em>Keep the proof.</em></motion.h2>
       <p>Choose a question. The finding and the exact source passage move together.</p>
       <div className="dv-question-list" role="tablist" aria-label="Example questions">{findings.map((item,index)=><button type="button" key={item.question} role="tab" aria-selected={finding===index} className={finding===index?'active':''} onClick={()=>setFinding(index)} data-cursor="ASK"><span>{item.question}</span><i aria-hidden="true">↗</i></button>)}</div>
       <div className="dv-answer" role="tabpanel"><AnimatePresence mode="wait"><motion.div key={finding} initial={reduced?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={reduced?undefined:{opacity:0,y:-6}} transition={{duration:.2}}><strong>{findings[finding].answer}</strong><p>{findings[finding].detail}</p><span>FIELD NOTES.PDF · PAGE {findings[finding].page}</span><blockquote>{findings[finding].source}</blockquote></motion.div></AnimatePresence></div>
      </div>
     </section>
     <section className="dv-chapter dv-process" id="method">
      <div className="dv-process-content">
       <motion.h2 initial={reduced?false:{opacity:.35,y:25}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.25}} transition={{duration:.55}}>One thought.<br/><em>Every source.</em></motion.h2>
       <p>The original material stays close while you move from question to conclusion.</p>
       <div className="dv-process-list" role="tablist" aria-label="Research process">{stages.map((item,index)=><button type="button" role="tab" key={item.title} aria-selected={stage===index} className={stage===index?'active':''} onClick={()=>setStage(index)} data-cursor="OPEN"><span>{item.title}</span><small>{item.line}</small></button>)}</div>
       <AnimatePresence mode="wait"><motion.p key={stage} className="dv-process-note" initial={reduced?false:{opacity:0,x:-12}} animate={{opacity:1,x:0}} exit={reduced?undefined:{opacity:0,x:8}} transition={{duration:.2}}>{stages[stage].detail}</motion.p></AnimatePresence>
      </div>
     </section>
    </div>
   </div>
   <section className="dv-tools" id="tools"><div className="dv-tools-heading"><h2>A working library.<br/><em>Not a black box.</em></h2><p>Four ways to use the same source-backed research space.</p></div><div className="dv-tools-work"><div className="dv-tools-list" role="tablist" aria-label="Research tools">{tools.map((item,index)=><button key={item.name} type="button" role="tab" aria-selected={tool===index} className={tool===index?'active':''} onClick={()=>setTool(index)} onFocus={()=>setTool(index)} onPointerEnter={()=>setTool(index)} data-cursor="VIEW"><span>{item.name}</span><i aria-hidden="true">↗</i></button>)}</div><div className="dv-preview-space"><div className="dv-preview" role="tabpanel" data-ui onPointerMove={tilt} onPointerLeave={event=>{event.currentTarget.style.setProperty('--rx','0deg');event.currentTarget.style.setProperty('--ry','0deg')}}><div className="dv-preview-content"><div className="dv-preview-top"><span>DOCMIND / {tools[tool].name.toUpperCase()}</span><span>FIELD NOTES.PDF</span></div><h3>{tools[tool].label}</h3><p>{tools[tool].detail}</p><div className="dv-preview-result"><span>{tools[tool].example}</span><strong>{tools[tool].result}</strong><small>SOURCE · PAGE {tools[tool].page}</small></div></div></div></div></div></section>
   <section className="dv-finale" aria-labelledby="dv-finale-title">
    <div className="dv-finale-top"><span>DOCMIND / THE NEXT PAGE</span><span>YOUR RESEARCH, WITH A WAY BACK</span></div>
    <div className="dv-finale-work">
     <div className="dv-finale-copy"><span>READY WHEN YOU ARE / 01</span><h2 id="dv-finale-title">Find the thought.<br/><em>Keep the trail.</em></h2><p>Bring your documents into a private workspace. Ask the next question and stay close to the pages that answer it.</p><Link to={destination} className="dv-finale-link" data-cursor="ENTER"><span>Open the research studio</span><span className="dv-finale-link-leaf" aria-hidden="true"><i/><i/></span></Link></div>
     <div className="dv-finale-art" aria-hidden="true" onPointerMove={tilt} onPointerLeave={event=>{event.currentTarget.style.setProperty('--rx','0deg');event.currentTarget.style.setProperty('--ry','0deg')}}><div className="dv-finale-sheet dv-finale-sheet-back"><small>FIELD NOTES / 02</small><span>Method and context</span><i/></div><div className="dv-finale-sheet dv-finale-sheet-front"><small>DOCMIND / SOURCE RECORD</small><span className="dv-finale-art-label">ANSWER / 03</span><strong>28% faster<br/>across three trials.</strong><p>Every finding has a passage behind it.</p><div><span>FIELD NOTES.PDF</span><span>PAGE 03 ↗</span></div></div><span className="dv-finale-art-index">03 / 03</span></div>
    </div>
    <div className="dv-finale-details"><div><small>01 / PRIVATE SPACE</small><p>Libraries and conversations are tied to your account on this installation.</p></div><div><small>02 / SOURCE FIRST</small><p>Answers point back to passages you can inspect in the original document.</p></div><div><small>03 / YOUR CONTROL</small><p>Export your account record, download original files, or delete your account.</p></div></div>
   </section>
  </main>
  <footer className="dv-footer"><Brand light/><span>Document intelligence, with a source.</span><nav aria-label="Site information"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/accessibility">Accessibility</Link><a href="https://github.com/AnmolShukla397/DocMind" target="_blank" rel="noreferrer">Project ↗</a></nav><span>© {new Date().getFullYear()} DocMind</span></footer>
 </div>
}
