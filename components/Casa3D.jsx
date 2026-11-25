'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

/* Vista 3D da moradia. Unidades do modelo: centímetros; R/C y=0, piso 1 y≈300, sótão y≈600. */
export default function Casa3D({cutY=null,focus=null,tints=null,src='/models/casa.glb',onReady,className}) {
  const host=useRef(null),canvasRef=useRef(null),api=useRef({}),[state,setState]=useState('A carregar a moradia…'),[loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const el=host.current;let disposed=false;
    const renderer=new THREE.WebGLRenderer({canvas:canvasRef.current,antialias:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.localClippingEnabled=true;
    const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe3d9');
    scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),0.04).texture;
    const sun=new THREE.DirectionalLight('#fff4e0',1.6);sun.position.set(600,1200,600);scene.add(sun);scene.add(new THREE.HemisphereLight('#ffffff','#b8b2a4',0.5));
    const camera=new THREE.PerspectiveCamera(50,1,5,60000);camera.position.set(1500,900,900);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(430,250,-480);controls.enableDamping=true;controls.update();
    const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),1e5);
    const resize=()=>{const w=el.clientWidth||1,h=el.clientHeight||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const ro=new ResizeObserver(resize);ro.observe(el);resize();
    let raf;const loop=()=>{raf=requestAnimationFrame(loop);controls.update();renderer.render(scene,camera);};loop();
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.load(src,gltf=>{
      if(disposed)return;const model=gltf.scene;
      model.traverse(o=>{if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.clippingPlanes=[plane];m.clipShadows=false;});}});
      const groups={};model.traverse(o=>{if(!o.isMesh)return;let t=null;for(let p=o;p&&!t;p=p.parent)if(p.userData.room)t=p.userData;if(t&&t.part){o.userData.orig=o.material;(groups[`${t.room}/${t.part}`]??=[]).push(o);}});
      scene.add(model);api.current={THREE,scene,camera,controls,plane,model,renderer,groups,tinted:{}};setState('');setLoaded(true);onReady?.(api.current);
    },e=>{},err=>setState('Não foi possível carregar o modelo 3D.'));
    api.current={scene,camera,controls,plane,renderer};
    return()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();};
  },[]);
  useEffect(()=>{if(api.current.plane)api.current.plane.constant=cutY==null?1e5:cutY;},[cutY]);
  useEffect(()=>{const a=api.current;if(!focus||!a.camera)return;a.controls.target.set(...focus.target);a.camera.position.set(...focus.position);a.controls.update();},[focus]);
  useEffect(()=>{
    const a=api.current;if(!loaded||!a.groups)return;
    const want=new Map();for(const [room,parts] of Object.entries(tints||{}))for(const [part,hex] of Object.entries(parts))if(hex)want.set(`${room}/${part}`,hex);
    for(const [key,meshes] of Object.entries(a.groups)){
      const hex=want.get(key),prev=a.tinted[key];
      if(!hex){if(prev){meshes.forEach(m=>{m.material=m.userData.orig;});prev.dispose?.();delete a.tinted[key];}continue;}
      if(prev&&prev.userData.hex===hex)continue;
      const base=Array.isArray(meshes[0].userData.orig)?meshes[0].userData.orig[0]:meshes[0].userData.orig;
      const mat=prev||new THREE.MeshStandardMaterial({roughness:base.roughness??0.7,metalness:Math.min(base.metalness??0,0.2),side:base.side,clippingPlanes:[a.plane],clipShadows:false});mat.userData.hex=hex;mat.color.set(hex);mat.needsUpdate=true;a.tinted[key]=mat;
      meshes.forEach(m=>{m.material=Array.isArray(m.userData.orig)?m.userData.orig.map(()=>mat):mat;});
    }
  },[tints,loaded]);
  return <div ref={host} className={className} style={{position:'relative',width:'100%',height:'100%'}}><canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block'}}/>{state&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#71786e',fontSize:13}}>{state}</div>}</div>;
}
