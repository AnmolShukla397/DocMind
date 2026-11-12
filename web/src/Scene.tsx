import { Canvas, useFrame } from '@react-three/fiber'
import { useReducedMotion, type MotionValue } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { CanvasTexture, DoubleSide, Group, MathUtils, ShaderMaterial, SRGBColorSpace, Vector2 } from 'three'

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
const atmosphere = `
precision highp float; varying vec2 vUv; uniform float uTime; uniform float uScroll; uniform vec2 uPointer;
void main(){
 vec2 p=vUv-.5;
 float phase=smoothstep(.0,.5,uScroll)-smoothstep(.5,1.0,uScroll);
 float x=mix(.28,-.28,phase)+uPointer.x*.025;
 float sweep=1.0-smoothstep(.05,.75,length((p-vec2(x,.02))*vec2(.85,1.2)));
 float drift=sin(p.x*2.4+p.y*1.2+uTime*.09)*.5+.5;
 vec3 ink=vec3(.018,.027,.027);
 vec3 green=vec3(.085,.17,.145);
 vec3 color=mix(ink,green,sweep*.7+drift*.12);
 color+=vec3(.045,.08,.065)*(1.0-smoothstep(.05,.85,length(p-vec2(-.4,-.3))));
 gl_FragColor=vec4(color,1.0);
}`
const scan = `
precision mediump float; varying vec2 vUv; uniform float uScan;
void main(){
 float beam=1.0-smoothstep(.0,.17,abs(vUv.y-uScan));
 gl_FragColor=vec4(.70,.95,.79,beam*.18);
}`
const pageColors=['#edf2ee','#d6e3e6','#b8ccd6']
const rootStops=[2.5,-3.65,2.15]
const pagePoses=[
 [[0,0,1,-.09,-.055],[1.66,.36,-1.3,-.33,.1],[-1.35,-.24,-1.9,.31,-.15]],
 [[-.15,.08,1,.08,-.04],[1.85,.48,-.7,-.24,.08],[-1.7,-.38,-1.1,.25,-.12]],
 [[0,.12,1,.02,0],[-2.05,.24,-.75,.27,-.08],[2.05,.12,-.7,-.27,.08]],
]
const pageContent=[
 {type:'RESULT',title:['A measurable','improvement'],lines:['Completion time improved by 28%','across three consecutive trials.','The finding is tied to the original','study passage, not a generated guess.'],footer:'FIELD NOTES   /   PAGE 03'},
 {type:'METHOD',title:['Three trials.','One baseline.'],lines:['The team compared a revised','workflow against the baseline','with the same participants','over three consecutive trials.'],footer:'FIELD NOTES   /   PAGE 02'},
 {type:'LIMITATION',title:['What remains','uncertain'],lines:['The sample was limited to','participating teams. Wider','deployment calls for further','evaluation and monitoring.'],footer:'FIELD NOTES   /   PAGE 06'},
]
function makePageTexture(index:number){
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1080
 const context=canvas.getContext('2d')!
 const content=pageContent[index]
 context.fillStyle=index===0?'#f4f5ef':'#e8edf0';context.fillRect(0,0,800,1080)
 context.fillStyle='#344c48';context.fillRect(62,65,676,5)
 context.font='700 22px Arial';context.letterSpacing='3px';context.fillText('DOCMIND  /  SOURCE RECORD',62,119)
 context.fillStyle='#627875';context.fillText(content.type,62,188)
 context.fillStyle='#182b28';context.font='700 67px Arial';context.letterSpacing='-2px'
 content.title.forEach((line,lineIndex)=>context.fillText(line,62,285+lineIndex*80))
 context.fillStyle='#c6d6cf';context.fillRect(62,475,676,3)
 context.fillStyle='#3a514d';context.font='32px Arial';context.letterSpacing='0px'
 content.lines.forEach((line,lineIndex)=>context.fillText(line,62,560+lineIndex*62))
 context.fillStyle='#bce7c6';context.fillRect(62,849,290,55)
 context.fillStyle='#1d3730';context.font='700 26px Arial';context.fillText(index===0?'28% VERIFIED':index===1?'3 TRIALS':'REVIEW LIMITS',78,886)
 context.fillStyle='#718782';context.font='700 21px Arial';context.letterSpacing='2px';context.fillText(content.footer,62,1004)
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4
 return texture
}

function SourcePage({index,scanRef}:{index:number;scanRef?:RefObject<ShaderMaterial|null>}){
 const texture=useMemo(()=>makePageTexture(index),[index])
 useEffect(()=>()=>texture.dispose(),[texture])
 return <group>
  <mesh><boxGeometry args={[2.64,3.55,.13]}/><meshStandardMaterial color={pageColors[index]} roughness={.68} metalness={.04}/></mesh>
  <mesh position={[0,0,.067]}><planeGeometry args={[2.64,3.55]}/><meshStandardMaterial map={texture} roughness={.82} metalness={0}/></mesh>
  {index===0&&<mesh position={[0,0,.061]}><planeGeometry args={[2.64,3.55]}/><shaderMaterial ref={scanRef} vertexShader={vertex} fragmentShader={scan} uniforms={{uScan:{value:.2}}} transparent depthWrite={false} side={DoubleSide}/></mesh>}
 </group>
}

function Exhibit({selected,compact,reduced,scroll,hover,drag}:{selected:number;compact:boolean;reduced:boolean;scroll:MotionValue<number>;hover:React.RefObject<{x:number;y:number}>;drag:React.RefObject<{x:number;y:number}>}){
 const root=useRef<Group>(null), pages=useRef<(Group|null)[]>([]), backdrop=useRef<ShaderMaterial>(null), scanner=useRef<ShaderMaterial>(null), elapsed=useRef(0)
 const medium=compact&&window.innerWidth>=700
 const baseY=medium?-1.85:compact?-1.35:-.2
 useFrame((_,delta)=>{
  if(!root.current||!backdrop.current)return
  const step=Math.min(delta,1/30)
  if(!reduced)elapsed.current+=step
  const time=elapsed.current, progress=reduced?0:MathUtils.clamp(scroll.get(),0,1)
  const settle=(current:number,target:number,rate:number)=>reduced?target:MathUtils.damp(current,target,rate,step)
  const stage=progress*2, from=Math.min(1,Math.floor(stage)), blend=MathUtils.smoothstep(stage-from,0,1)
  const mix=(a:number,b:number)=>MathUtils.lerp(a,b,blend)
  backdrop.current.uniforms.uTime.value=time
  backdrop.current.uniforms.uScroll.value=progress
  backdrop.current.uniforms.uPointer.value.set(hover.current.x,hover.current.y)
  if(scanner.current)scanner.current.uniforms.uScan.value=.5+Math.sin(time*.42)*.32
  root.current.rotation.y=settle(root.current.rotation.y,drag.current.x+hover.current.x*.11+mix(.1,-.14),2.8)
  root.current.rotation.x=settle(root.current.rotation.x,drag.current.y-hover.current.y*.075+mix(0,.06),2.8)
  root.current.position.y=settle(root.current.position.y,baseY+mix(0,.2),2.6)
  root.current.position.x=settle(root.current.position.x,compact?0:mix(rootStops[from],rootStops[from+1]),2.6)
  pages.current.forEach((page,index)=>{
   if(!page)return
   const slot=(index-selected+3)%3, a=pagePoses[from][slot], b=pagePoses[from+1][slot]
   page.position.x=settle(page.position.x,mix(a[0],b[0]),3)
   page.position.y=settle(page.position.y,mix(a[1],b[1])+(reduced?0:Math.sin(time*.42+index*1.7)*.055),3)
   page.position.z=settle(page.position.z,mix(a[2],b[2]),3)
   page.rotation.y=settle(page.rotation.y,mix(a[3],b[3]),3)
   page.rotation.z=settle(page.rotation.z,mix(a[4],b[4]),3)
  })
 })
 return <>
  <mesh position={[0,0,-6]}><planeGeometry args={[42,24]}/><shaderMaterial ref={backdrop} vertexShader={vertex} fragmentShader={atmosphere} uniforms={{uTime:{value:0},uScroll:{value:0},uPointer:{value:new Vector2()}}} depthWrite={false}/></mesh>
  <ambientLight intensity={2}/><directionalLight position={[-4,5,8]} color="#ffffff" intensity={3.5}/><pointLight position={[4,0,5]} color="#b8f6d6" intensity={25} distance={12}/>
  <group ref={root} position={[compact?0:2.5,baseY,0]} scale={medium?.88:1}>
   <mesh position={[.55,-.23,-2.8]} rotation={[0,-.12,.05]}><boxGeometry args={[4.7,5.8,.1]}/><meshStandardMaterial color="#29423a" metalness={.14} roughness={.46}/></mesh>
   <mesh position={[.57,-.23,-2.72]} rotation={[0,-.12,.05]}><planeGeometry args={[4.45,5.55]}/><meshBasicMaterial color="#d3ffe2" transparent opacity={.08} depthWrite={false}/></mesh>
   {[0,1,2].map(index=><group key={index} ref={node=>{pages.current[index]=node}} position={[index===0?0:index===1?1.66:-1.35,index===0?0:index===1?.36:-.24,index===0?1:index===1?-1.3:-1.9]}><SourcePage index={index} scanRef={index===0?scanner:undefined}/></group>)}
   <mesh position={[0,-2.18,.95]}><boxGeometry args={[2.95,.08,.55]}/><meshStandardMaterial color="#bce7c6" metalness={.25} roughness={.52}/></mesh>
   <mesh position={[0,-2.28,.96]}><boxGeometry args={[3.42,.12,.75]}/><meshStandardMaterial color="#29463e" roughness={.55} metalness={.2}/></mesh>
  </group>
 </>
}

export default function Scene({selected,onSelect,scroll,active}:{selected:number;onSelect:()=>void;scroll:MotionValue<number>;active:boolean}){
 const wrap=useRef<HTMLDivElement>(null),drag=useRef({x:0,y:0}),hover=useRef({x:0,y:0}),pointer=useRef({x:0,y:0,active:false,moved:false})
 const reduced=Boolean(useReducedMotion())
 const [visible,setVisible]=useState(!document.hidden),[compact,setCompact]=useState(window.innerWidth<1050)
 useEffect(()=>{
  const visibility=()=>setVisible(!document.hidden),resize=()=>setCompact(window.innerWidth<1050)
  const move=(event:PointerEvent)=>{
   const bounds=wrap.current?.getBoundingClientRect()
   if(!bounds||event.clientY<bounds.top||event.clientY>bounds.bottom){hover.current.x=0;hover.current.y=0;return}
   hover.current.x=MathUtils.clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1)
   hover.current.y=MathUtils.clamp(1-(event.clientY-bounds.top)/bounds.height*2,-1,1)
  }
  document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);window.addEventListener('pointermove',move,{passive:true})
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move)}
 },[])
 function down(event:ReactPointerEvent<HTMLDivElement>){if(reduced||event.pointerType==='touch'||event.button!==0)return;pointer.current={x:event.clientX,y:event.clientY,active:true,moved:false};event.currentTarget.setPointerCapture(event.pointerId)}
 function move(event:ReactPointerEvent<HTMLDivElement>){if(!pointer.current.active)return;const dx=event.clientX-pointer.current.x,dy=event.clientY-pointer.current.y;if(Math.abs(dx)+Math.abs(dy)>3)pointer.current.moved=true;drag.current.x=MathUtils.clamp(drag.current.x+dx/420,-.42,.42);drag.current.y=MathUtils.clamp(drag.current.y+dy/420,-.24,.24);pointer.current.x=event.clientX;pointer.current.y=event.clientY}
 function up(event:ReactPointerEvent<HTMLDivElement>){pointer.current.active=false;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 return <div ref={wrap} className="dv-scene" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={()=>{if(!pointer.current.moved)onSelect();pointer.current.moved=false}}>
  <Canvas camera={{position:[0,0,compact?11:10],fov:compact?50:43}} dpr={compact?1:Math.min(devicePixelRatio,1.25)} frameloop={visible&&active&&!reduced?'always':'demand'} gl={{alpha:false,antialias:true,powerPreference:'high-performance'}} fallback={<div className="dv-scene-fallback">Sources in focus.</div>}>
   <Exhibit selected={selected} compact={compact} reduced={reduced} scroll={scroll} hover={hover} drag={drag}/>
  </Canvas>
 </div>
}
