import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const $=id=>document.getElementById(id), rnd=(a,b)=>a+Math.random()*(b-a);
const EDGE=-600, FLOOR=-150, ROADW=7, LIMIT=1612;
// ---------- renderer ----------
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.7;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.3,5000);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
const sunDir=new THREE.Vector3(-0.4,0.5,-0.75).normalize();
const sky=new THREE.Mesh(new THREE.SphereGeometry(2500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sd:{value:sunDir}},
 vertexShader:`varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 v;uniform vec3 sd;void main(){float h=max(v.y,0.);vec3 c=mix(vec3(.95,.8,.62),vec3(.3,.5,.85),pow(h,.5));float s=max(dot(v,sd),0.);c+=vec3(1.,.85,.6)*(pow(s,500.)*4.+pow(s,6.)*.3);gl_FragColor=vec4(c,1.);}`}));
scene.add(sky);scene.fog=new THREE.Fog(0xd8c8b0,300,2200);
scene.add(new THREE.HemisphereLight(0xdde8ff,0x6a5a40,0.7));
const sun=new THREE.DirectionalLight(0xfff0d8,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:600});sun.shadow.bias=-0.0005;scene.add(sun,sun.target);
function tex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(rep)t.repeat.set(...rep);return t}
const noise=(g,w,h,base,n,amp)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const v=Math.random()*amp-amp/2;g.fillStyle=`rgba(${v>0?255:0},${v>0?255:0},${v>0?255:0},${Math.abs(v)/255})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}};
// road with markings
const roadTex=tex(256,512,(g,w,h)=>{noise(g,w,h,'#3a3b3e',12000,60);g.fillStyle='#eee';g.fillRect(8,0,8,h);g.fillRect(w-16,0,8,h);g.fillStyle='#e8b830';g.fillRect(w/2-6,0,4,h);g.fillRect(w/2+2,0,4,h)},[1,40]);
const rockTex=tex(256,256,(g,w,h)=>{noise(g,w,h,'#8a6e52',9000,90);g.strokeStyle='#5a4532';g.lineWidth=2;for(let i=0;i<30;i++){g.beginPath();let y=Math.random()*h;g.moveTo(0,y);for(let x=0;x<w;x+=20)g.lineTo(x,y+=rnd(-6,6));g.stroke()}},[30,6]);
const grassTex=tex(256,256,(g,w,h)=>noise(g,w,h,'#7a8a4a',14000,70),[60,60]);
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,...o});
// plateau
const plateau=new THREE.Mesh(new THREE.BoxGeometry(2000,400,2000),[M(0xffffff,{map:rockTex}),M(0xffffff,{map:rockTex}),M(0xffffff,{map:grassTex}),M(0x555555),M(0xffffff,{map:rockTex}),M(0xffffff,{map:rockTex})]);
plateau.position.set(0,-200.02,EDGE+1000);plateau.receiveShadow=true;scene.add(plateau);
const road=new THREE.Mesh(new THREE.PlaneGeometry(ROADW*2+2,700),M(0xffffff,{map:roadTex,roughness:.85}));road.rotation.x=-Math.PI/2;road.position.set(0,0.01,EDGE+350);road.receiveShadow=true;scene.add(road);
// canyon floor + river + far cliff
const floor=new THREE.Mesh(new THREE.PlaneGeometry(4000,1600),M(0xffffff,{map:grassTex}));floor.rotation.x=-Math.PI/2;floor.position.set(0,FLOOR,EDGE-800);scene.add(floor);
const river=new THREE.Mesh(new THREE.PlaneGeometry(4000,60),M(0x3a6a90,{roughness:.1,metalness:.3}));river.rotation.x=-Math.PI/2;river.position.set(0,FLOOR+.3,EDGE-260);scene.add(river);
for(let i=0;i<40;i++){const r=rnd(80,260),hgt=rnd(150,450);const m=new THREE.Mesh(new THREE.ConeGeometry(r,hgt,7),M(0x7d6a55,{flatShading:true,roughness:1}));m.position.set(rnd(-1800,1800),FLOOR+hgt/2-10,EDGE-rnd(700,1500));scene.add(m)}
for(let i=0;i<30;i++){const s=rnd(4,14);const m=new THREE.Mesh(new THREE.DodecahedronGeometry(s),M(0x6e5a44,{flatShading:true}));m.position.set(rnd(-300,300),FLOOR+s*.4,EDGE-rnd(10,120));scene.add(m)}
// guardrails, posts, trees, signs
const postG=new THREE.BoxGeometry(.2,.9,.2),postM=M(0xdddddd),railM=M(0xc8ccd0,{metalness:.8,roughness:.3});
for(const s of[-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.1,.3,596),railM);rail.position.set(s*(ROADW+1.2),.7,EDGE+302);rail.castShadow=true;scene.add(rail);
 for(let z=EDGE+4;z<0;z+=4){const p=new THREE.Mesh(postG,postM);p.position.set(s*(ROADW+1.2),.45,z);scene.add(p)}}
const treeM=M(0x3e5a2c,{flatShading:true}),trunkM=M(0x5a4030);
for(let i=0;i<160;i++){const x=(Math.random()<.5?-1:1)*rnd(14,200),z=rnd(EDGE+20,300),h=rnd(5,11);const t=new THREE.Mesh(new THREE.ConeGeometry(h*.35,h,7),treeM);t.position.set(x,h/2+1.5,z);t.castShadow=true;scene.add(t);const k=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,1.6),trunkM);k.position.set(x,.8,z);scene.add(k)}
function signTex(txt,bg,fg){return tex(512,256,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=fg;g.lineWidth=14;g.strokeRect(10,10,w-20,h-20);g.fillStyle=fg;g.font='bold 92px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,w/2,h/2)})}
function sign(txt,x,z,bg='#f2c200',fg='#111'){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshStandardMaterial({map:signTex(txt,bg,fg),side:THREE.DoubleSide}));b.position.y=3.2;const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,3.2),postM);p.position.y=1.6;g.add(b,p);g.position.set(x,0,z);scene.add(g)}
for(let d=500;d>=100;d-=100)sign(d+' m',ROADW+3,EDGE+d,'#1a5ab0','#fff');
sign('⚠ 前方悬崖',-(ROADW+3),EDGE+60);sign('⚠ 前方悬崖',ROADW+3,EDGE+30);
// edge stripes
const stripe=new THREE.Mesh(new THREE.PlaneGeometry(ROADW*2+2,1.2),M(0xffffff,{map:tex(256,32,(g,w,h)=>{for(let i=0;i<16;i++){g.fillStyle=i%2?'#111':'#f2c200';g.fillRect(i*16,0,16,h)}}),emissive:0x332200}));stripe.rotation.x=-Math.PI/2;stripe.position.set(0,.02,EDGE+.6);scene.add(stripe);
// ---------- 尊界 V800-style MPV ----------
const car=new THREE.Group();scene.add(car);
const paintTop=new THREE.MeshPhysicalMaterial({color:0xc9b28a,metalness:.7,roughness:.25,clearcoat:1,clearcoatRoughness:.05});
const paintLow=new THREE.MeshPhysicalMaterial({color:0x14161a,metalness:.6,roughness:.3,clearcoat:1});
const glass=new THREE.MeshPhysicalMaterial({color:0x101418,metalness:.2,roughness:.05,transmission:0,clearcoat:1});
const chrome=M(0xffffff,{metalness:1,roughness:.08});
const add=(geo,mat,x,y,z,parent=car)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m};
// body: length 5.4 (along -z forward), width 2.0, height 1.95
add(new THREE.BoxGeometry(2.0,.75,5.3),paintLow,0,.7,0);                      // lower body
add(new THREE.BoxGeometry(1.98,.85,4.5),paintTop,0,1.45,.3);                   // upper body (two-tone)
add(new THREE.BoxGeometry(1.86,.1,4.3),paintTop,0,1.93,.35);                   // roof
const hood=add(new THREE.BoxGeometry(1.96,.5,1.1),paintTop,0,1.15,-2.15);hood.rotation.x=-.28; // sloped nose
add(new THREE.BoxGeometry(2.01,.62,3.9),glass,0,1.55,.45);                     // side glass band
const ws=add(new THREE.BoxGeometry(1.8,.08,1.2),glass,0,1.62,-1.65);ws.rotation.x=.62; // windshield
add(new THREE.BoxGeometry(2.02,.04,4.4),chrome,0,1.22,.3);                     // chrome waistline
for(const z of[-.6,.9])add(new THREE.BoxGeometry(2.03,.62,.05),paintTop,0,1.55,z); // pillars
// grille: tall chrome vertical slats
add(new THREE.BoxGeometry(1.2,.55,.06),M(0x0a0a0a),0,.85,-2.68);
for(let i=-6;i<=6;i++)add(new THREE.BoxGeometry(.035,.5,.05),chrome,i*.09,.85,-2.7);
add(new THREE.BoxGeometry(1.28,.05,.07),chrome,0,1.13,-2.7);add(new THREE.BoxGeometry(1.28,.05,.07),chrome,0,.58,-2.7);
const drl=M(0xffffff,{emissive:0xffffff,emissiveIntensity:3});
add(new THREE.BoxGeometry(1.9,.04,.05),drl,0,1.24,-2.66);                       // through-type light strip
for(const s of[-1,1])add(new THREE.BoxGeometry(.32,.12,.05),drl,s*.82,1.1,-2.66);
const tail=M(0xff2020,{emissive:0xff0000,emissiveIntensity:2});add(new THREE.BoxGeometry(1.9,.06,.05),tail,0,1.25,2.66);
const brakeL=M(0x550000,{emissive:0xff0000,emissiveIntensity:0});for(const s of[-1,1])add(new THREE.BoxGeometry(.3,.14,.05),brakeL,s*.8,1.05,2.66);
add(new THREE.BoxGeometry(.02,.5,1.0),chrome,1.005,1.5,.9);                    // sliding door rail hint
const wheels=[],tireG=new THREE.CylinderGeometry(.42,.42,.3,28),rimG=new THREE.CylinderGeometry(.3,.3,.31,14);tireG.rotateZ(Math.PI/2);rimG.rotateZ(Math.PI/2);
for(const[x,z]of[[-.95,-1.75],[.95,-1.75],[-.95,1.8],[.95,1.8]]){const w=new THREE.Group();add(tireG,M(0x111111,{roughness:.9}),0,0,0,w);add(rimG,chrome,0,0,0,w);w.position.set(x,.42,z);car.add(w);wheels.push(w)}
// steam nozzles (4 under body)
const nozzles=[[-.7,-1.6],[.7,-1.6],[-.7,1.6],[.7,1.6]].map(([x,z])=>{const n=add(new THREE.CylinderGeometry(.16,.22,.25,12),chrome,x,.25,z);n.visible=false;return n});
// ---------- steam particles ----------
const puffTex=tex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.5,'rgba(240,240,245,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h)});
const puffs=[];for(let i=0;i<300;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,opacity:0}));s.visible=false;scene.add(s);puffs.push({s,life:0,v:new THREE.Vector3()})}
let pi=0;function puff(pos,vel,size,life){const p=puffs[pi++%puffs.length];p.s.position.copy(pos);p.v.copy(vel);p.life=p.max=life;p.size=size;p.s.visible=true}
// ---------- bloom ----------
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.35,.4,.9));composer.addPass(new OutputPass());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)});
// ---------- input ----------
const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space')e.preventDefault();if(e.code==='KeyR'&&G.state!=='start')reset();if((e.code==='Enter')&&G.state==='start')begin()});addEventListener('keyup',e=>keys[e.code]=false);
document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off)});
const brakeKey=()=>keys.Space||keys.KeyS||keys.ArrowDown, steamKey=()=>keys.KeyE||keys.Space;
// ---------- game state ----------
const G=window.game={state:'start',z:0,x:0,y:0,vz:0,vx:0,vy:0,yaw:0,pitch:0,force:0,braked:false,snapped:false,snapAt:Infinity,v0:0,fuel:100,steamT:0,t:0,best:+(localStorage.v800best||0),msgT:0};
const timers=[];function later(fn,ms){timers.push({fn,at:G.t+ms/1000})}
function msg(t,dur=2.5,c='#fff'){$('msg').textContent=t;$('msg').style.color=c;G.msgT=dur}
function reset(){Object.assign(G,{state:'drive',z:-5,x:2.5,y:0,vz:0,vx:0,vy:0,yaw:0,pitch:0,roll:0,force:0,braked:false,snapped:false,v0:0,fuel:100,t:0});
 G.snapAt=Math.random()<.5?rnd(600,1450):Infinity;$('end').classList.add('hidden');$('pedArm').setAttribute('transform','');$('pedPad').setAttribute('transform','');$('warn').style.borderWidth='0';nozzles.forEach(n=>n.visible=false);msg('全力加速中…过 100 km/h 才能刹车',2.5)}
function begin(){$('start').classList.add('hidden');reset()}
$('go').onclick=begin;$('again').onclick=reset;
function end(title,body,score){G.state='over';if(score>G.best){G.best=score;localStorage.v800best=score}
 later(()=>{$('endT').textContent=title;$('endP').innerHTML=body+`<br><b style="font-size:28px;color:#e8c98a">得分 ${score}</b><br>最高分 ${G.best}`;$('end').classList.remove('hidden')},1200)}
function snap(){G.snapped=true;G.force=0;msg('⚠ 刹车踏板支架断裂！',3,'#ff4040');$('warn').style.borderWidth='18px';
 $('pedArm').setAttribute('transform','rotate(35 60 30)');$('pedPad').setAttribute('transform','translate(25 30) rotate(70 60 120)');nozzles.forEach(n=>n.visible=true);
 later(()=>G.state!=='over'&&msg('只能靠 P 挡……冲出悬崖后按住 E/空格 喷蒸汽！',3.5,'#ffd060'),2600)}
function steam(dt,strong){G.steamT-=dt;if(G.steamT>0)return;G.steamT=strong?.05:.1;
 for(const n of nozzles){const p=n.getWorldPosition(new THREE.Vector3());for(let k=0;k<(strong?3:1);k++)puff(p,new THREE.Vector3(rnd(-1.5,1.5),-rnd(14,22),rnd(-1.5,1.5)).add(new THREE.Vector3(G.vx,G.vy,G.vz).multiplyScalar(.3)),rnd(.8,1.4),rnd(1,1.6))}}
// ---------- loop ----------
const clock=new THREE.Clock(),camPos=new THREE.Vector3(0,4,10),look=new THREE.Vector3();let shake=0;
function update(dt){
 G.t+=dt;for(let i=timers.length-1;i>=0;i--)if(G.t>=timers[i].at){const t=timers.splice(i,1)[0];t.fn()}const steer=(keys.KeyA||keys.ArrowLeft?-1:0)+(keys.KeyD||keys.ArrowRight?1:0);
 if(G.state==='drive'){
  const kmh=-G.vz*3.6;
  if(!G.braked){G.vz-= (6+(keys.KeyW||keys.ArrowUp?4:0))*dt;G.vz=Math.max(G.vz,-75)}
  const canBrake=kmh>=100;
  if(brakeKey()&&canBrake&&!G.snapped){if(!G.braked){G.braked=true;G.v0=kmh;msg('刹车！动力已切断',1.2,'#9ef')}G.force+=950*dt;if(G.force>=LIMIT||G.force>=G.snapAt)snap()}
  else if(!G.snapped)G.force=Math.max(0,G.force-2500*dt);
  else if(brakeKey()&&G.snapped)G.force=0;
  if(brakeKey()&&!canBrake&&!G.braked)msg('还没到 100 km/h，不能刹车',.5,'#fc6');
  let dec=G.snapped?0.6:G.force/LIMIT*10.5;if(!G.braked)dec=0;
  if(G.vz<0)G.vz=Math.min(0,G.vz+dec*dt);
  G.vx=steer*Math.min(6,-G.vz*.25);G.x=THREE.MathUtils.clamp(G.x+G.vx*dt,-ROADW+1,ROADW-1);G.yaw=-G.vx*.03;
  G.z+=G.vz*dt;
  if(G.braked&&G.vz>-0.05&&G.z-2.7>EDGE){G.state='stopped';const d=G.z-2.7-EDGE;const sc=Math.round(5000*Math.exp(-d/40)+G.v0*G.v0/10);
   end(G.snapped?'P 挡救了你！':'刹停成功','车头距崖边 <b>'+d.toFixed(2)+' m</b><br>刹车初速度 '+G.v0.toFixed(1)+' km/h',sc)}
  if(G.z-1<EDGE){G.state='fall';G.fallT=0;msg(G.braked?'冲出悬崖！按住 E/空格 喷蒸汽！':'冲出悬崖！按住 E/空格 喷蒸汽！',3,'#ffd060');nozzles.forEach(n=>n.visible=true);$('warn').style.borderWidth='18px'}
 } else if(G.state==='fall'){
  G.fallT+=dt;const th=steamKey()&&G.fuel>0;
  G.vy-=9.8*dt;if(th){G.vy+=24*dt;G.fuel=Math.max(0,G.fuel-9*dt);steam(dt,true)}else if(G.fuel>0&&G.z>EDGE+1&&G.vy<-5&&G.y<G.vy*G.vy/36+4){G.vy+=30*dt;G.fuel=Math.max(0,G.fuel-6*dt);steam(dt,true);if(G.msgT<=0)msg('自动蒸汽缓降',1,'#cde')}else if(G.fuel>0)steam(dt,false);
  const fb=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);G.vz+=fb*12*dt;G.vz*=1-.35*dt;G.vx+=steer*8*dt;G.vx*=1-.8*dt;G.vy=Math.min(G.vy,14);
  G.x+=G.vx*dt;G.y+=G.vy*dt;G.z+=G.vz*dt;
  G.pitch=THREE.MathUtils.lerp(G.pitch,THREE.MathUtils.clamp(G.vy*.04,-.6,.4),dt*3);G.yaw=-G.vx*.04;
  if(G.z>EDGE-2.7&&G.y<-.2&&G.z<EDGE+3){G.z=EDGE-2.7;G.vz=Math.min(G.vz,0)*-.3;shake=.4}// cliff wall
  if(G.y<=0&&G.z>EDGE+1){G.y=0;
   if(G.vy>-10&&Math.abs(G.x)<ROADW+1){G.state='landed';const sc=Math.round(3000+G.fuel*30+Math.max(0,9+G.vy)*100);end('蒸汽飞回！安全着陆','落地速度 '+(-G.vy).toFixed(1)+' m/s · 剩余蒸汽 '+G.fuel.toFixed(0)+'%',sc);msg('🎉 安全着陆！',3,'#6f6')}
   else{G.state='crash';shake=1;end('着陆过猛','落地速度 '+(-G.vy).toFixed(1)+' m/s，车毁了',200)}}
  if(G.y<=FLOOR+.4&&G.z<=EDGE){G.y=FLOOR+.4;G.state='crash';shake=1;for(let i=0;i<40;i++)puff(car.position.clone(),new THREE.Vector3(rnd(-8,8),rnd(2,10),rnd(-8,8)),3,2.5);end('坠入谷底','蒸汽没顶住……',0)}
 }
 // apply transform
 car.position.set(G.x,G.y,G.z);car.rotation.set(G.pitch,G.yaw,0);
 for(const w of wheels)w.rotation.x+=G.vz*dt/.42*(G.state==='fall'?0:1);
 brakeL.emissiveIntensity=G.force>0?4:0;
 // particles
 for(const p of puffs){if(!p.s.visible)continue;p.life-=dt;if(p.life<=0){p.s.visible=false;continue}const k=1-p.life/p.max;p.v.multiplyScalar(1-2.2*dt);p.v.y+=2*dt;p.s.position.addScaledVector(p.v,dt);
  if(p.s.position.y<.3&&G.y<5)p.s.position.y=.3;p.s.scale.setScalar(p.size*(1+k*6));p.s.material.opacity=.85*(1-k)}
 // camera
 const back=G.state==='fall'||G.state==='landed'||G.state==='crash'?new THREE.Vector3(G.x+9,G.y+5,G.z+16):new THREE.Vector3(G.x*.5,3.6,G.z+10);
 camPos.lerp(back,1-Math.exp(-dt*(G.state==='fall'?2.5:6)));look.set(G.x,G.y+1,G.z-6);
 camera.position.copy(camPos);if(shake>0){shake-=dt;camera.position.x+=rnd(-.3,.3)*shake;camera.position.y+=rnd(-.3,.3)*shake}camera.lookAt(look);
 sun.position.set(G.x,G.y,G.z).addScaledVector(sunDir,200);sun.target.position.set(G.x,G.y,G.z);
 if(G.msgT>0){G.msgT-=dt;if(G.msgT<=0)$('msg').textContent=''}
 if(G.state==='drive'&&!G.snapped)$('warn').style.borderWidth=G.force>LIMIT*.85?'10px':'0';
 // HUD
 const kmh=Math.abs(G.vz*3.6),dist=Math.max(0,G.z-2.7-EDGE);
 $('hud').innerHTML=`车速 <b style="font-size:22px">${kmh.toFixed(0)}</b> km/h<br>距崖边 <b>${G.state==='fall'?'—':dist.toFixed(1)+' m'}</b><br>踏板力 ${G.force.toFixed(0)} N <span style="color:#f66">/ ${LIMIT} N</span><div class="bar"><i style="width:${Math.min(100,G.force/LIMIT*100)}%;background:${G.force>LIMIT*.85?'#f33':'#3f8'}"></i></div>`+
  (G.snapped||G.state==='fall'?`蒸汽 <div class="bar"><i style="width:${G.fuel}%;background:#cde"></i></div>`:'')+(G.state==='fall'?`高度 ${G.y.toFixed(1)} m（崖顶 0 m）`:'')+`<br><span style="color:#aaa">最高分 ${G.best}</span>`;
 $('pedTxt').textContent=G.snapped?'断裂！':G.force.toFixed(0)+' N';$('pedPad').style.fill='';
}
function loop(){const dt=Math.min(clock.getDelta(),.05);if(G.state!=='start')update(dt);else{car.position.set(2.5,0,-5);camera.position.set(8,3,-14+Math.sin(performance.now()/2000)*2);camera.lookAt(2.5,1,-5)}composer.render();requestAnimationFrame(loop)}
car.position.set(2.5,0,-5);
const REC=new URLSearchParams(location.search).has('record');
if(!REC)loop();else{let f=0,ph=0,t0=0;
 window.recStep=()=>{f++;const dt=1/30;
  if(G.state==='start'){if(f>75)begin(),G.snapAt=1e9;else{car.position.set(2.5,0,-5);camera.position.set(8,3,-14+Math.sin(f/30)*2);camera.lookAt(2.5,1,-5)}}
  else{
   if(ph===0&&G.z<-330){ph=1;keys.KeyS=true}
   if(ph===1&&G.snapped){ph=2;keys.KeyS=false}
   if(ph===2&&G.state==='fall'){ph=3;t0=f}
   if(ph===3&&f-t0>25){ph=4;keys.KeyE=true;keys.KeyS=true}
   if(ph===4&&G.y>3&&G.z>-598){ph=5;keys.KeyE=false}
   if(ph===5&&G.z>-585){ph=6;keys.KeyS=false}
   update(dt);}
  composer.render();return {f,state:G.state,ph};};}
