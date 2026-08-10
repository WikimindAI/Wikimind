import * as THREE from "three";
import { gsap } from "https://unpkg.com/gsap@3.12.5/index.js";
import { ScrollTrigger } from "https://unpkg.com/gsap@3.12.5/ScrollTrigger.js";
gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------
   Decode base64 geometry data exported from the Tinkercad OBJ
--------------------------------------------------------- */
function b64ToFloat32(b64){
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i=0;i<bin.length;i++) view[i] = bin.charCodeAt(i);
  return new Float32Array(buf);
}
function b64ToUint32(b64){
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i=0;i<bin.length;i++) view[i] = bin.charCodeAt(i);
  return new Uint32Array(buf);
}

function buildGeometry(part){
  const pos = b64ToFloat32(part.pos_b64);
  const idx = b64ToUint32(part.idx_b64);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}

/* ---------------------------------------------------------
   Scene setup
--------------------------------------------------------- */
const wrap = document.getElementById('canvas-wrap');
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth/window.innerHeight, 0.1, 3000);
camera.position.set(0, 10, 260);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
wrap.appendChild(renderer.domElement);

// Lighting — warm key + cool rim, evokes a field-study photo light
const hemi = new THREE.HemisphereLight(0x8fae7a, 0x0b0f0c, 0.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe1b0, 2.0);
key.position.set(120, 200, 160);
scene.add(key);
const rim = new THREE.DirectionalLight(0xE8A33D, 0.9);
rim.position.set(-160, 40, -120);
scene.add(rim);
const fill = new THREE.DirectionalLight(0x3c5a4a, 0.6);
fill.position.set(0, -80, 120);
scene.add(fill);

/* ---------------------------------------------------------
   Build parts
   Real assembly, bottom to top:
   RESERVOIR (base cup) -> CAGE (main body) -> ENTONNOIR (screw-on funnel lid)
--------------------------------------------------------- */
const materials = {
  reservoir: new THREE.MeshPhysicalMaterial({ color:0xD98F3E, roughness:0.35, metalness:0.05, transmission:0.15, thickness:2, clearcoat:0.3 }),
  cage:      new THREE.MeshStandardMaterial({ color:0x4B5D45, roughness:0.55, metalness:0.08 }),
  entonnoir: new THREE.MeshStandardMaterial({ color:0xB9BDB2, roughness:0.45, metalness:0.1 }),
};

const meshes = {};
const groups = {};
for (const name of ['reservoir','cage','entonnoir']){
  const geo = buildGeometry(PARTS_DATA[name]);
  const mesh = new THREE.Mesh(geo, materials[name]);
  const g = new THREE.Group();
  g.add(mesh);
  meshes[name] = mesh;
  groups[name] = g;
}

const H_R = PARTS_DATA.reservoir.height;
const H_C = PARTS_DATA.cage.height;
const H_E = PARTS_DATA.entonnoir.height;
const TOTAL = H_R + H_C + H_E;
const MID = TOTAL/2;

// assembled base Y offsets (bottom of each part), then re-centered by -MID
const BASE_Y = {
  reservoir: 0,
  cage: H_R,
  entonnoir: H_R + H_C,
};

const assembly = new THREE.Group();
assembly.position.y = -MID;
for (const name of ['reservoir','cage','entonnoir']){
  groups[name].position.y = BASE_Y[name];
  assembly.add(groups[name]);
}
scene.add(assembly);

/* Slow ambient rotation for a sense of life */
let ambientSpin = 0;

/* ---------------------------------------------------------
   Loading overlay
--------------------------------------------------------- */
const loadingEl = document.getElementById('loading');
requestAnimationFrame(()=>{
  setTimeout(()=>{
    loadingEl.style.opacity = 0;
    setTimeout(()=> loadingEl.style.display='none', 650);
  }, 300);
});

/* ---------------------------------------------------------
   Render loop
--------------------------------------------------------- */
function animate(){
  requestAnimationFrame(animate);
  ambientSpin += 0.0009;
  assembly.rotation.y = state.baseRotY + ambientSpin;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------------------------------------------------
   Animation state driven by scroll
--------------------------------------------------------- */
const state = {
  entOffset: 0,      // extra lift of the entonnoir lid once unscrewed
  entRot: 0,          // extra spin of the entonnoir while unscrewing
  cageOffset: 0,      // extra lift of the cage once separated from reservoir
  baseRotY: 0.5,      // gentle default yaw so the model doesn't face flat
};

function applyState(){
  groups.entonnoir.position.y = BASE_Y.entonnoir + state.entOffset + state.cageOffset;
  groups.entonnoir.rotation.y = state.entRot;
  groups.cage.position.y = BASE_Y.cage + state.cageOffset;
}
applyState();

const q = (sel)=>document.querySelector(sel);

/* ---- Rail active state ---- */
const railStops = document.querySelectorAll('#rail .stop');
function setActiveStop(i){
  railStops.forEach((el,idx)=> el.classList.toggle('active', idx===i));
}

/* ============ 1. HERO -> assembled establishing shot ============ */
gsap.set(camera.position, {x:0, y:10, z:260});

/* ============ 2. UNSCREW: entonnoir lid spins 4 turns & lifts ============ */
ScrollTrigger.create({
  trigger: "#stage-unscrew",
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate(self){
    const p = self.progress;
    state.entRot = p * Math.PI * 8;       // 4 full turns
    state.entOffset = p * 60;             // lifts clear of the cage
    applyState();
    camera.position.x = THREE.MathUtils.lerp(0, 130, p);
    camera.position.y = THREE.MathUtils.lerp(10, 40, p);
    camera.position.z = THREE.MathUtils.lerp(260, 175, p);
    camera.lookAt(0, THREE.MathUtils.lerp(0,30,p), 0);
    setActiveStop(p>0.5 ? 1 : 0);
  }
});

/* ============ 3. Overview: pull back, all 3 parts visible, exploded ============ */
ScrollTrigger.create({
  trigger: "#stage-intro",
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate(self){
    const p = self.progress;
    camera.position.x = THREE.MathUtils.lerp(130, 0, p);
    camera.position.y = THREE.MathUtils.lerp(40, 20, p);
    camera.position.z = THREE.MathUtils.lerp(175, 300, p);
    camera.lookAt(0, THREE.MathUtils.lerp(30, 10, p), 0);
    setActiveStop(1);
  }
});

/* ============ 4. Entonnoir detail ============ */
ScrollTrigger.create({
  trigger: "#stage-entonnoir",
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate(self){
    const p = self.progress;
    const entWorldY = -MID + BASE_Y.entonnoir + state.entOffset + state.cageOffset + H_E/2;
    camera.position.x = THREE.MathUtils.lerp(0, -95, p);
    camera.position.y = THREE.MathUtils.lerp(20, entWorldY+10, p);
    camera.position.z = THREE.MathUtils.lerp(300, 95, p);
    camera.lookAt(0, entWorldY, 0);
    materials.entonnoir.emissive = new THREE.Color(0xE8A33D);
    materials.entonnoir.emissiveIntensity = p*0.18;
    setActiveStop(2);
  }
});

/* ============ 5. Cage detail: cage separates from reservoir ============ */
ScrollTrigger.create({
  trigger: "#stage-cage",
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate(self){
    const p = self.progress;
    state.cageOffset = p * 55;
    applyState();
    const cageWorldY = -MID + BASE_Y.cage + state.cageOffset + H_C/2;
    camera.position.x = THREE.MathUtils.lerp(-95, 90, p);
    camera.position.y = THREE.MathUtils.lerp(30, cageWorldY, p);
    camera.position.z = THREE.MathUtils.lerp(95, 90, p);
    camera.lookAt(0, cageWorldY, 0);
    materials.cage.emissive = new THREE.Color(0xE8A33D);
    materials.cage.emissiveIntensity = p*0.15;
    setActiveStop(3);
  }
});

/* ============ 6. Reservoir detail ============ */
ScrollTrigger.create({
  trigger: "#stage-reservoir",
  start: "top bottom",
  end: "bottom top",
  scrub: true,
  onUpdate(self){
    const p = self.progress;
    const resWorldY = -MID + BASE_Y.reservoir + H_R/2;
    camera.position.x = THREE.MathUtils.lerp(90, 0, p);
    camera.position.y = THREE.MathUtils.lerp(60, resWorldY+6, p);
    camera.position.z = THREE.MathUtils.lerp(90, 130, p);
    camera.lookAt(0, resWorldY, 0);
    materials.reservoir.emissive = new THREE.Color(0xE8A33D);
    materials.reservoir.emissiveIntensity = p*0.2;
    setActiveStop(4);
  }
});

/* ============ 7. Outro: pull back to full exploded assembly ============ */
ScrollTrigger.create({
  trigger: "footer",
  start: "top bottom",
  end: "top top",
  scrub: true,
  onUpdate(self){
    const p = self.progress;
    camera.position.x = THREE.MathUtils.lerp(0, 0, p);
    camera.position.y = THREE.MathUtils.lerp(6, 30, p);
    camera.position.z = THREE.MathUtils.lerp(130, 340, p);
    camera.lookAt(0, 20, 0);
  }
});
