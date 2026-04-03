"use client";
import { useState, useEffect, useCallback } from "react";

/* ── Supabase ──────────────────────────────────────────── */
const SB="https://ulyycjtrshpsjpvbztkr.supabase.co";
const SK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseXljanRyc2hwc2pwdmJ6dGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzg1NzAsImV4cCI6MjA5MDcxNDU3MH0.UYwCdYrdy20xl_hCkO8t4CAB16vBHj-oMdflDv1XlVE";
const H={apikey:SK,Authorization:`Bearer ${SK}`,"Content-Type":"application/json",Prefer:"return=representation"};
let local=false;
async function dbF(p,o={}){const r=await fetch(`${SB}/rest/v1/${p}`,{...o,headers:{...H,...(o.headers||{})}});if(!r.ok)throw new Error(`${r.status}`);const t=await r.text();return t?JSON.parse(t):null;}
async function sG(k){try{if(typeof window!=="undefined"&&window.storage){const r=await window.storage.get(k);return r?JSON.parse(r.value):null;}}catch{}return null;}
async function sS(k,v){try{if(typeof window!=="undefined"&&window.storage)await window.storage.set(k,JSON.stringify(v));}catch{}}

/* ── Constants ─────────────────────────────────────────── */
const EQ=["Switchgear","Panelboard","Transformer","Circuit Breaker","Motor Control Center (MCC)","Bus Duct","Disconnect Switch","UPS System","PDU","RPP (Remote Power Panel)","ATS / Transfer Switch","Other"];
const MFR=["Eaton / Cutler-Hammer","Siemens","Square D / Schneider","ABB","GE","Westinghouse","ITE","Federal Pacific","Liebert / Vertiv","APC / Schneider","Other"];
const LOC=[{v:"job_site",l:"Job Site"},{v:"main_warehouse",l:"Main Warehouse"},{v:"satellite_1",l:"Satellite WH 1"},{v:"satellite_2",l:"Satellite WH 2"},{v:"off_site",l:"Off-Site"},{v:"new_location",l:"New Location"}];
const GRD=[{v:"A",c:"#16a34a",d:"Excellent"},{v:"B",c:"#2563eb",d:"Good"},{v:"C",c:"#f59e0b",d:"Fair"},{v:"D",c:"#dc2626",d:"Poor"}];
const STS=[{v:"received",l:"Received",c:"#2563eb"},{v:"in_inspection",l:"Inspecting",c:"#f59e0b"},{v:"in_refurb",l:"Refurb",c:"#8b5cf6"},{v:"ready",l:"Ready",c:"#16a34a"},{v:"allocated",l:"Allocated",c:"#0891b2"},{v:"sold",l:"Sold",c:"#6b7280"},{v:"scrapped",l:"Scrapped",c:"#dc2626"}];
const sc={};STS.forEach(s=>sc[s.v]=s.c);
const gc={};GRD.forEach(g=>gc[g.v]=g.c);
const MT=["Breaker","Cover / Door","Bus Bar","Lug / Connector","Fuse","Relay","Control Wiring","Nameplate","Hardware / Bolts","Fan / Vent","Arc Chute","Trip Unit","Shunt Trip","Aux Contact","Other"];

const COMP_TYPES=["Breaker","Fuse","Contactor","Relay","Starter","VFD / Drive","Disconnect","Control Module","Metering","PLC Module","Transformer (internal)","Bus Plug","Other"];
const AMP_RATINGS=["15","20","25","30","35","40","50","60","70","80","90","100","125","150","175","200","225","250","300","350","400","450","500","600","700","800","1000","1200","1600","2000","2500","3000","4000","Other"];
const POLES=["1","2","3","4"];
const POSITIONS=["Top","Upper","Middle","Lower","Bottom","Left","Right","Front","Rear","Bay 1","Bay 2","Bay 3","Bay 4","Bay 5","Bay 6","Section A","Section B","Section C","Other"];

const today=()=>new Date().toISOString().slice(0,10);

/* ── Styles ─────────────────────────────────────────────── */
const inp={width:"100%",padding:"12px 14px",border:"1.5px solid #d1d5db",borderRadius:10,fontSize:16,background:"#fff",color:"#111",boxSizing:"border-box",outline:"none",fontFamily:"inherit",WebkitAppearance:"none"};
const inpE={...inp,borderColor:"#ef4444"};
const inpSm={...inp,fontSize:14,padding:"10px 12px"};
const lbl={display:"block",fontSize:13,fontWeight:700,color:"#475569",marginBottom:4};
const card={background:"#fff",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"};

/* ── Component ─────────────────────────────────────────── */
export default function Inventory() {
  const [view,setView]=useState("scan");
  const [items,setItems]=useState([]);
  const [ld,setLd]=useState(false);
  const [sv,setSv]=useState(false);
  const [scanning,setScanning]=useState(false);
  const [scanImg,setScanImg]=useState(null);
  const [msg,setMsg]=useState(null);
  const [search,setSearch]=useState("");
  const [fLoc,setFLoc]=useState("all");
  const [fGrd,setFGrd]=useState("all");
  const [expId,setExpId]=useState(null);
  const [openSec,setOpenSec]=useState({});
  const toggle=(s)=>setOpenSec(p=>({...p,[s]:!p[s]}));

  const [form,setForm]=useState({
    equipmentType:"",manufacturer:"",modelNumber:"",serialNumber:"",
    voltageRating:"",amperageRating:"",grade:"C",conditionNotes:"",
    location:"main_warehouse",locationDetail:"",jobNumber:"",
    sourceJobSite:"",customerOrigin:"",scannedBy:"",dateReceived:today(),
  });
  const [missing,setMissing]=useState([]);
  const [subcomps,setSubcomps]=useState([]);
  const [errs,setErrs]=useState({});

  /* ── OCR ── */
  const handleScan=async(file)=>{
    if(!file)return;setScanning(true);setMsg(null);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=()=>rej();r.readAsDataURL(file);});
      setScanImg(`data:${file.type};base64,${b64}`);
      const resp=await fetch(`${SB}/functions/v1/scan-nameplate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_base64:b64,media_type:file.type})});
      if(!resp.ok)throw new Error(`${resp.status}`);
      const p=await resp.json();if(p.error)throw new Error(p.error);
      setForm(prev=>({...prev,
        serialNumber:p.serial_number||prev.serialNumber,modelNumber:p.model_number||prev.modelNumber,
        voltageRating:p.voltage_rating||prev.voltageRating,amperageRating:p.amperage_rating||prev.amperageRating,
        manufacturer:MFR.find(m=>p.manufacturer&&m.toLowerCase().includes(p.manufacturer.toLowerCase().split("/")[0].trim()))||prev.manufacturer,
        equipmentType:EQ.find(t=>p.equipment_type&&t.toLowerCase().includes(p.equipment_type.toLowerCase()))||prev.equipmentType,
      }));
      setMsg({t:"success",m:"Nameplate scanned. Verify below."});
    }catch(e){setMsg({t:"error",m:"Scan failed: "+e.message});}
    finally{setScanning(false);}
  };

  /* ── Load ── */
  const loadItems=useCallback(async()=>{
    setLd(true);
    try{if(!local){
      const d=await dbF("inventory_items?select=*,inventory_missing_components(*),inventory_subcomponents(*)&order=created_at.desc");
      if(d){setItems(d.map(r=>({...r,missing:r.inventory_missing_components||[],subcomps:r.inventory_subcomponents||[]})));setLd(false);return;}
    }}catch{local=true;}
    setItems(await sG("wes_inv")||[]);setLd(false);
  },[]);
  useEffect(()=>{loadItems();},[loadItems]);

  /* ── Helpers ── */
  const uf=(k,v)=>{setForm(p=>({...p,[k]:v}));if(errs[k])setErrs(p=>({...p,[k]:undefined}));};
  const addM=()=>setMissing(p=>[...p,{componentType:"",description:"",quantity:1}]);
  const rmM=i=>setMissing(p=>p.filter((_,j)=>j!==i));
  const uM=(i,f,v)=>setMissing(p=>p.map((m,j)=>j===i?{...m,[f]:v}:m));

  /* Subcomponent helpers */
  const addSub=()=>setSubcomps(p=>[...p,{
    componentType:"Breaker",ampRating:"20",voltage:"",poles:"1",
    quantity:1,position:"",grade:"B",conditionNotes:"",isPresent:true,
    manufacturer:"",modelNumber:"",serialNumber:"",salvageable:true,originType:"oem",
  }]);
  const rmSub=i=>setSubcomps(p=>p.filter((_,j)=>j!==i));
  const uSub=(i,f,v)=>setSubcomps(p=>p.map((s,j)=>j===i?{...s,[f]:v}:s));

  /* Quick-add breakers */
  const quickAddBreakers=(amp,qty,poles,position,grade,origin)=>{
    const newOnes=Array.from({length:qty},()=>({
      componentType:"Breaker",ampRating:amp,voltage:"",poles:String(poles),
      quantity:1,position,grade,conditionNotes:"",isPresent:true,
      manufacturer:form.manufacturer||"",modelNumber:"",serialNumber:"",salvageable:true,originType:origin||"oem",
    }));
    setSubcomps(p=>[...p,...newOnes]);
  };
  const [qbAmp,setQbAmp]=useState("20");
  const [qbQty,setQbQty]=useState(1);
  const [qbPoles,setQbPoles]=useState("1");
  const [qbPos,setQbPos]=useState("");
  const [qbGrade,setQbGrade]=useState("B");
  const [qbOrigin,setQbOrigin]=useState("oem");

  const validate=()=>{
    const e={};if(!form.equipmentType)e.equipmentType="Required";
    if(!form.serialNumber.trim())e.serialNumber="Required";
    if(!form.scannedBy.trim())e.scannedBy="Required";
    setErrs(e);return Object.keys(e).length===0;
  };

  /* ── Submit ── */
  const handleSubmit=async()=>{
    if(!validate())return;setSv(true);setMsg(null);
    const id=`INV-${Date.now().toString(36).toUpperCase()}`;
    const row={id,serial_number:form.serialNumber,model_number:form.modelNumber||null,manufacturer:form.manufacturer||null,equipment_type:form.equipmentType,voltage_rating:form.voltageRating||null,amperage_rating:form.amperageRating||null,grade:form.grade,condition_notes:form.conditionNotes||null,location:form.location,location_detail:form.locationDetail||null,job_number:form.jobNumber||null,source_job_site:form.sourceJobSite||null,customer_origin:form.customerOrigin||null,status:"received",date_received:form.dateReceived,scanned_by:form.scannedBy};
    const mr=missing.filter(m=>m.componentType).map(m=>({inventory_id:id,component_type:m.componentType,description:m.description||null,quantity:m.quantity||1,replacement_status:"needed"}));
    const sr=subcomps.map((s,i)=>({
      inventory_id:id,component_type:s.componentType,amp_rating:s.ampRating||null,
      voltage:s.voltage||null,poles:parseInt(s.poles)||1,quantity:s.quantity||1,
      position:s.position||null,grade:s.grade,condition_notes:s.conditionNotes||null,
      is_present:s.isPresent,manufacturer:s.manufacturer||null,
      model_number:s.modelNumber||null,serial_number:s.serialNumber||null,
      salvageable:s.salvageable,sort_order:i,origin_type:s.originType||"oem",
    }));
    try{
      let ok=false;
      if(!local){try{
        await dbF("inventory_items",{method:"POST",body:JSON.stringify(row)});
        if(mr.length)await dbF("inventory_missing_components",{method:"POST",body:JSON.stringify(mr)});
        if(sr.length)await dbF("inventory_subcomponents",{method:"POST",body:JSON.stringify(sr)});
        ok=true;
      }catch{local=true;}}
      const li={...row,missing:mr,subcomps:sr,created_at:new Date().toISOString()};
      if(!ok){const u=[li,...items];setItems(u);await sS("wes_inv",u);}else{await loadItems();}
      setForm(p=>({...p,serialNumber:"",modelNumber:"",voltageRating:"",amperageRating:"",conditionNotes:"",jobNumber:"",locationDetail:"",sourceJobSite:"",customerOrigin:""}));
      setMissing([]);setSubcomps([]);setScanImg(null);
      setMsg({t:"success",m:`${id} added with ${sr.length} subcomponents`});setView("list");
    }catch(e){setMsg({t:"error",m:e.message});}finally{setSv(false);}
  };

  /* ── Patch ── */
  const patch=async(id,u)=>{
    const ul=items.map(r=>r.id===id?{...r,...u}:r);setItems(ul);
    if(!local){try{const d={};for(const[k,v]of Object.entries(u))d[k.replace(/[A-Z]/g,m=>"_"+m.toLowerCase())]=v===""?null:v;await dbF(`inventory_items?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(d)});return;}catch{local=true;}}
    await sS("wes_inv",ul);
  };

  /* ── Export ── */
  const esc=v=>{const s=String(v??"");return s.includes(",")||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s;};
  const exportCSV=()=>{
    if(!fi.length)return alert("Nothing");
    const h=["ID","Serial","Model","Mfr","Type","V","A","Grade","Status","Location","Job #","Source","Customer","Received","By","Missing","Sub-Type","Sub-Amps","Sub-Poles","Sub-Position","Sub-Grade","Sub-OEM/AM","Sub-Present","Sub-Salvageable","Sub-Notes"];
    const l=[h.map(esc).join(",")];
    fi.forEach(item=>{
      const subs=item.subcomps||item.inventory_subcomponents||[];
      const mc=(item.missing||[]).map(m=>`${m.component_type} x${m.quantity||1}`).join("; ");
      if(subs.length===0){
        l.push([esc(item.id),esc(item.serial_number),esc(item.model_number),esc(item.manufacturer),esc(item.equipment_type),esc(item.voltage_rating),esc(item.amperage_rating),esc(item.grade),esc(item.status),esc(LOC.find(x=>x.v===item.location)?.l||item.location),esc(item.job_number),esc(item.source_job_site),esc(item.customer_origin),esc(item.date_received),esc(item.scanned_by),esc(mc),"","","","","","","","",""].join(","));
      }else{
        subs.forEach(s=>{
          l.push([esc(item.id),esc(item.serial_number),esc(item.model_number),esc(item.manufacturer),esc(item.equipment_type),esc(item.voltage_rating),esc(item.amperage_rating),esc(item.grade),esc(item.status),esc(LOC.find(x=>x.v===item.location)?.l||item.location),esc(item.job_number),esc(item.source_job_site),esc(item.customer_origin),esc(item.date_received),esc(item.scanned_by),esc(mc),esc(s.component_type),esc(s.amp_rating||s.ampRating),esc(s.poles),esc(s.position),esc(s.grade),esc((s.origin_type||s.originType)==="aftermarket"?"Aftermarket":"OEM"),esc(s.is_present!==false&&s.isPresent!==false?"Yes":"MISSING"),esc(s.salvageable!==false?"Yes":"No"),esc(s.condition_notes||s.conditionNotes)].join(","));
        });
      }
    });
    const b=new Blob([l.join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`WES_Inv_${today()}.csv`;a.click();
  };

  const fi=items.filter(i=>{if(fLoc!=="all"&&i.location!==fLoc)return false;if(fGrd!=="all"&&i.grade!==fGrd)return false;if(search){const s=search.toLowerCase();return[i.serial_number,i.model_number,i.manufacturer,i.equipment_type,i.id,i.job_number,i.customer_origin].some(f=>f&&f.toLowerCase().includes(s));}return true;});
  const byL={};items.forEach(i=>{byL[i.location]=(byL[i.location]||0)+1;});
  const byG={};items.forEach(i=>{byG[i.grade]=(byG[i.grade]||0)+1;});

  /* Sub-component stats */
  const subsByGrade={};
  subcomps.forEach(s=>{subsByGrade[s.grade]=(subsByGrade[s.grade]||0)+s.quantity;});
  const totalSubs=subcomps.reduce((a,s)=>a+s.quantity,0);

  return(
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro",sans-serif',maxWidth:480,margin:"0 auto",padding:"12px 16px",color:"#0f172a",minHeight:"100vh",background:"#f1f5f9"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,padding:"12px 0",borderBottom:"3px solid #0f172a"}}>
        <div><div style={{fontSize:20,fontWeight:800}}>Inventory</div><div style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>WORLDWIDE ELECTRICAL SERVICES</div></div>
        <div style={{display:"flex",gap:4}}>
          {[{k:"scan",l:"+ Scan"},{k:"list",l:String(items.length)}].map(t=><button key={t.k} onClick={()=>setView(t.k)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:view===t.k?"#0f172a":"#e2e8f0",color:view===t.k?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer"}}>{t.l}</button>)}
        </div>
      </div>

      {msg&&<div style={{padding:"12px",background:msg.t==="error"?"#fef2f2":"#ecfdf5",border:`1px solid ${msg.t==="error"?"#fecaca":"#a7f3d0"}`,borderRadius:10,color:msg.t==="error"?"#dc2626":"#065f46",fontSize:14,marginBottom:12,display:"flex",justifyContent:"space-between"}}><span>{msg.m}</span><button onClick={()=>setMsg(null)} style={{background:"none",border:"none",fontWeight:700,cursor:"pointer",color:"inherit"}}>&times;</button></div>}

      {/* ════ SCAN / ADD ════ */}
      {view==="scan"&&<div>
        {/* Scanner */}
        <div style={{...card,textAlign:"center",border:"2px dashed #cbd5e1",background:"#f8fafc"}}><div style={{fontSize:15,fontWeight:800,marginBottom:6}}>{scanning?"Scanning...":"\uD83D\uDCF7 Scan Nameplate"}</div><div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Auto-fills serial, model, mfr, voltage, amps</div><label style={{display:"inline-block",padding:"14px 28px",borderRadius:10,background:scanning?"#94a3b8":"#2563eb",color:"#fff",fontWeight:700,fontSize:15,cursor:scanning?"not-allowed":"pointer"}}>{scanning?"Processing...":"Take Photo"}<input type="file" accept="image/*" capture="environment" onChange={e=>handleScan(e.target.files?.[0])} style={{display:"none"}} disabled={scanning}/></label>{scanImg&&<div style={{marginTop:12}}><img src={scanImg} alt="" style={{maxHeight:100,borderRadius:8}}/></div>}</div>

        {/* Equipment */}
        <div style={card}><div style={{fontSize:15,fontWeight:800,marginBottom:12}}>Equipment</div>
          <div style={{marginBottom:10}}><label style={lbl}>Type *</label><select style={errs.equipmentType?inpE:inp} value={form.equipmentType} onChange={e=>uf("equipmentType",e.target.value)}><option value="">Select</option>{EQ.map(t=><option key={t}>{t}</option>)}</select>{errs.equipmentType&&<div style={{fontSize:12,color:"#ef4444",marginTop:3}}>{errs.equipmentType}</div>}</div>
          <div style={{marginBottom:10}}><label style={lbl}>Manufacturer</label><select style={inp} value={form.manufacturer} onChange={e=>uf("manufacturer",e.target.value)}><option value="">Select</option>{MFR.map(m=><option key={m}>{m}</option>)}</select></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}><div><label style={lbl}>Serial # *</label><input style={errs.serialNumber?inpE:inp} value={form.serialNumber} onChange={e=>uf("serialNumber",e.target.value)} placeholder="Serial"/>{errs.serialNumber&&<div style={{fontSize:12,color:"#ef4444",marginTop:3}}>{errs.serialNumber}</div>}</div><div><label style={lbl}>Model #</label><input style={inp} value={form.modelNumber} onChange={e=>uf("modelNumber",e.target.value)} placeholder="Model"/></div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={lbl}>Voltage</label><input style={inp} value={form.voltageRating} onChange={e=>uf("voltageRating",e.target.value)} placeholder="480V"/></div><div><label style={lbl}>Amperage</label><input style={inp} value={form.amperageRating} onChange={e=>uf("amperageRating",e.target.value)} placeholder="1200A"/></div></div>
        </div>

        {/* Unit Grade */}
        <div style={card}><div style={{fontSize:15,fontWeight:800,marginBottom:10}}>Unit Grade (Overall)</div><div style={{display:"flex",gap:6}}>{GRD.map(g=><button key={g.v} onClick={()=>uf("grade",g.v)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2.5px solid ${form.grade===g.v?g.c:"#e2e8f0"}`,background:form.grade===g.v?g.c+"12":"#fff",textAlign:"center",cursor:"pointer"}}><div style={{fontSize:18,fontWeight:800,color:form.grade===g.v?g.c:"#94a3b8"}}>{g.v}</div><div style={{fontSize:10,color:"#6b7280"}}>{g.d}</div></button>)}</div></div>

        {/* Location */}
        <div style={card}><div style={{fontSize:15,fontWeight:800,marginBottom:10}}>Location</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>{LOC.map(l=><button key={l.v} onClick={()=>uf("location",l.v)} style={{padding:12,borderRadius:10,border:`2px solid ${form.location===l.v?"#2563eb":"#e2e8f0"}`,background:form.location===l.v?"#2563eb12":"#fff",color:form.location===l.v?"#2563eb":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>{l.l}</button>)}</div>
          {(form.location==="job_site"||form.location==="new_location")&&<div style={{marginBottom:10}}><label style={lbl}>{form.location==="job_site"?"Site Name":"Location Name"}</label><input style={inp} value={form.locationDetail} onChange={e=>uf("locationDetail",e.target.value)}/></div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={lbl}>Job #</label><input style={inp} value={form.jobNumber} onChange={e=>uf("jobNumber",e.target.value)}/></div><div><label style={lbl}>Date Received</label><input style={inp} type="date" value={form.dateReceived} onChange={e=>uf("dateReceived",e.target.value)}/></div></div>
        </div>

        {/* Origin */}
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}><div><label style={lbl}>Source Site</label><input style={inp} value={form.sourceJobSite} onChange={e=>uf("sourceJobSite",e.target.value)}/></div><div><label style={lbl}>Customer</label><input style={inp} value={form.customerOrigin} onChange={e=>uf("customerOrigin",e.target.value)}/></div></div>
          <div><label style={lbl}>Scanned By *</label><input style={errs.scannedBy?inpE:inp} value={form.scannedBy} onChange={e=>uf("scannedBy",e.target.value)} placeholder="Your name"/>{errs.scannedBy&&<div style={{fontSize:12,color:"#ef4444",marginTop:3}}>{errs.scannedBy}</div>}</div>
        </div>

        {/* ══ SUBCOMPONENTS ══ */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <button onClick={()=>toggle("subs")} style={{width:"100%",padding:"14px 16px",border:"none",background:"#eff6ff",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <div><div style={{fontSize:15,fontWeight:800}}>Subcomponents ({totalSubs})</div><div style={{fontSize:11,color:"#1e40af"}}>Breakers, fuses, contactors inside this unit</div></div>
            <span style={{fontSize:18,color:"#94a3b8"}}>{openSec.subs!==false?"\u25B2":"\u25BC"}</span>
          </button>
          {openSec.subs!==false&&<div style={{padding:16}}>
            {/* Quick-add breakers */}
            <div style={{background:"#f0f9ff",borderRadius:10,padding:12,marginBottom:12,border:"1px solid #bae6fd"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#0369a1",marginBottom:8}}>QUICK ADD BREAKERS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                <div><label style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>Amps</label><select style={inpSm} value={qbAmp} onChange={e=>setQbAmp(e.target.value)}>{AMP_RATINGS.map(a=><option key={a}>{a}</option>)}</select></div>
                <div><label style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>Qty</label><input style={inpSm} type="number" min={1} max={100} value={qbQty} onChange={e=>setQbQty(parseInt(e.target.value)||1)}/></div>
                <div><label style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>Poles</label><select style={inpSm} value={qbPoles} onChange={e=>setQbPoles(e.target.value)}>{POLES.map(p=><option key={p}>{p}</option>)}</select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><label style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>Position</label><select style={inpSm} value={qbPos} onChange={e=>setQbPos(e.target.value)}><option value="">Any</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>Grade</label><div style={{display:"flex",gap:4}}>{GRD.map(g=><button key={g.v} onClick={()=>setQbGrade(g.v)} style={{flex:1,padding:"8px 0",borderRadius:6,border:`2px solid ${qbGrade===g.v?g.c:"#e2e8f0"}`,background:qbGrade===g.v?g.c+"15":"#fff",color:qbGrade===g.v?g.c:"#cbd5e1",fontWeight:800,fontSize:13,cursor:"pointer"}}>{g.v}</button>)}</div></div>
              </div>
              <div style={{marginBottom:8}}><label style={{fontSize:11,fontWeight:600,color:"#6b7280"}}>Type</label><div style={{display:"flex",gap:6}}>{[{v:"oem",l:"OEM",c:"#0369a1"},{v:"aftermarket",l:"Aftermarket",c:"#c026d3"}].map(o=><button key={o.v} onClick={()=>setQbOrigin(o.v)} style={{flex:1,padding:"8px 0",borderRadius:6,border:`2px solid ${qbOrigin===o.v?o.c:"#e2e8f0"}`,background:qbOrigin===o.v?o.c+"15":"#fff",color:qbOrigin===o.v?o.c:"#cbd5e1",fontWeight:700,fontSize:13,cursor:"pointer"}}>{o.l}</button>)}</div></div>
              <button onClick={()=>quickAddBreakers(qbAmp,qbQty,qbPoles,qbPos,qbGrade,qbOrigin)} style={{width:"100%",padding:12,borderRadius:8,border:"none",background:"#0369a1",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                Add {qbQty}x {qbAmp}A {qbPoles}P {qbOrigin==="aftermarket"?"AM ":""}Breaker{qbQty>1?"s":""} (Grade {qbGrade})
              </button>
            </div>

            {/* Individual subcomponents */}
            {subcomps.length>0&&<div style={{marginBottom:8}}>
              <div style={{display:"flex",gap:4,marginBottom:8}}>{GRD.map(g=>{const n=subsByGrade[g.v]||0;if(!n)return null;return<span key={g.v} style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:10,background:g.c+"18",color:g.c}}>{g.v}: {n}</span>;})}</div>
            </div>}

            {subcomps.map((s,i)=>(
              <div key={i} style={{background:s.isPresent?"#fff":"#fef2f2",borderRadius:10,padding:12,marginBottom:8,border:`1.5px solid ${gc[s.grade]||"#e5e7eb"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:700,color:gc[s.grade]||"#475569"}}>#{i+1} {s.componentType}</span>
                    {s.ampRating&&<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:6,background:"#f1f5f9",color:"#475569"}}>{s.ampRating}A {s.poles}P</span>}
                    {s.position&&<span style={{fontSize:10,color:"#94a3b8"}}>{s.position}</span>}
                  </div>
                  <button onClick={()=>rmSub(i)} style={{background:"none",border:"none",color:"#ef4444",fontSize:18,cursor:"pointer"}}>&times;</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                  <div><label style={{fontSize:10,fontWeight:600,color:"#6b7280"}}>Type</label><select style={inpSm} value={s.componentType} onChange={e=>uSub(i,"componentType",e.target.value)}>{COMP_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:"#6b7280"}}>Amps</label><select style={inpSm} value={s.ampRating} onChange={e=>uSub(i,"ampRating",e.target.value)}><option value="">N/A</option>{AMP_RATINGS.map(a=><option key={a}>{a}</option>)}</select></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:"#6b7280"}}>Poles</label><select style={inpSm} value={s.poles} onChange={e=>uSub(i,"poles",e.target.value)}>{POLES.map(p=><option key={p}>{p}</option>)}</select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                  <div><label style={{fontSize:10,fontWeight:600,color:"#6b7280"}}>Position</label><select style={inpSm} value={s.position} onChange={e=>uSub(i,"position",e.target.value)}><option value="">-</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></div>
                  <div><label style={{fontSize:10,fontWeight:600,color:"#6b7280"}}>Grade</label><div style={{display:"flex",gap:3}}>{GRD.map(g=><button key={g.v} onClick={()=>uSub(i,"grade",g.v)} style={{flex:1,padding:"8px 0",borderRadius:6,border:`2px solid ${s.grade===g.v?g.c:"#e2e8f0"}`,background:s.grade===g.v?g.c+"15":"#fff",color:s.grade===g.v?g.c:"#cbd5e1",fontWeight:800,fontSize:12,cursor:"pointer"}}>{g.v}</button>)}</div></div>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <button onClick={()=>uSub(i,"isPresent",!s.isPresent)} style={{padding:"8px 12px",borderRadius:6,border:`1.5px solid ${s.isPresent?"#16a34a":"#dc2626"}`,background:s.isPresent?"#16a34a15":"#dc262615",color:s.isPresent?"#16a34a":"#dc2626",fontWeight:700,fontSize:11,cursor:"pointer"}}>{s.isPresent?"Present":"MISSING"}</button>
                  <button onClick={()=>uSub(i,"originType",s.originType==="oem"?"aftermarket":"oem")} style={{padding:"8px 12px",borderRadius:6,border:`1.5px solid ${s.originType==="oem"?"#0369a1":"#c026d3"}`,background:s.originType==="oem"?"#0369a115":"#c026d315",color:s.originType==="oem"?"#0369a1":"#c026d3",fontWeight:700,fontSize:11,cursor:"pointer"}}>{s.originType==="oem"?"OEM":"Aftermarket"}</button>
                  <button onClick={()=>uSub(i,"salvageable",!s.salvageable)} style={{padding:"8px 12px",borderRadius:6,border:`1.5px solid ${s.salvageable?"#2563eb":"#6b7280"}`,background:s.salvageable?"#2563eb15":"#6b728015",color:s.salvageable?"#2563eb":"#6b7280",fontWeight:700,fontSize:11,cursor:"pointer"}}>{s.salvageable?"Salvageable":"Not Salv."}</button>
                </div>
                <input style={inpSm} value={s.conditionNotes} onChange={e=>uSub(i,"conditionNotes",e.target.value)} placeholder="Condition: pitting, weathering, corrosion..."/>
              </div>
            ))}

            <button onClick={addSub} style={{width:"100%",padding:12,borderRadius:10,border:"2px dashed #d1d5db",background:"#fff",color:"#2563eb",fontWeight:700,fontSize:14,cursor:"pointer"}}>+ Add Component Manually</button>
          </div>}
        </div>

        {/* Missing */}
        <div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:15,fontWeight:800}}>Missing / Damaged</div><button onClick={addM} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add</button></div>
          {missing.length===0&&<div style={{fontSize:13,color:"#94a3b8",textAlign:"center",padding:12}}>None noted</div>}
          {missing.map((m,i)=><div key={i} style={{background:"#fef2f2",borderRadius:10,padding:12,marginBottom:8,border:"1px solid #fecaca"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>#{i+1}</span><button onClick={()=>rmM(i)} style={{background:"none",border:"none",color:"#ef4444",fontSize:18,cursor:"pointer"}}>&times;</button></div><div style={{marginBottom:8}}><select style={inpSm} value={m.componentType} onChange={e=>uM(i,"componentType",e.target.value)}><option value="">Type</option>{MT.map(t=><option key={t}>{t}</option>)}</select></div><div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:8}}><input style={inpSm} value={m.description} onChange={e=>uM(i,"description",e.target.value)} placeholder="Details"/><input style={inpSm} type="number" min={1} value={m.quantity} onChange={e=>uM(i,"quantity",parseInt(e.target.value)||1)}/></div></div>)}
        </div>

        {/* Notes */}
        <div style={card}><label style={lbl}>Condition Notes</label><textarea style={{...inp,minHeight:80,resize:"vertical"}} value={form.conditionNotes} onChange={e=>uf("conditionNotes",e.target.value)} placeholder="Overall condition, damage, mods..."/></div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={sv} style={{width:"100%",padding:16,borderRadius:12,border:"none",background:sv?"#94a3b8":`linear-gradient(135deg,${gc[form.grade]},${gc[form.grade]}dd)`,color:"#fff",fontSize:17,fontWeight:800,cursor:sv?"not-allowed":"pointer",marginBottom:24,boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>{sv?"Saving...":`Add (Grade ${form.grade}) + ${totalSubs} components`}</button>
      </div>}

      {/* ════ LIST ════ */}
      {view==="list"&&<div>
        <div style={{...card,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:15,fontWeight:800}}>{items.length} Units</span><div style={{display:"flex",gap:4}}>{GRD.map(g=>{const n=byG[g.v]||0;if(!n)return null;return<span key={g.v} style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:10,background:g.c+"18",color:g.c}}>{g.v}:{n}</span>;})}</div></div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{LOC.map(l=>{const n=byL[l.v]||0;if(!n)return null;return<span key={l.v} style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:10,background:"#f1f5f9",color:"#475569"}}>{l.l}: {n}</span>;})}</div></div>

        <div style={{marginBottom:12}}><input style={inp} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search serial, model, mfr, job #..."/></div>
        <div style={{display:"flex",gap:4,marginBottom:8,overflowX:"auto",paddingBottom:4}}><button onClick={()=>setFLoc("all")} style={{padding:"6px 12px",borderRadius:20,border:"none",background:fLoc==="all"?"#0f172a":"#e2e8f0",color:fLoc==="all"?"#fff":"#64748b",fontWeight:600,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>All</button>{LOC.map(l=>{const n=byL[l.v]||0;if(!n)return null;return<button key={l.v} onClick={()=>setFLoc(l.v)} style={{padding:"6px 12px",borderRadius:20,border:"none",background:fLoc===l.v?"#0f172a":"#e2e8f0",color:fLoc===l.v?"#fff":"#64748b",fontWeight:600,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{l.l}</button>;})}</div>
        <div style={{display:"flex",gap:4,marginBottom:12}}>{["all","A","B","C","D"].map(g=><button key={g} onClick={()=>setFGrd(g)} style={{flex:1,padding:"8px 0",borderRadius:8,border:`2px solid ${fGrd===g?(gc[g]||"#0f172a"):"#e2e8f0"}`,background:fGrd===g?(gc[g]||"#0f172a")+"12":"#fff",color:fGrd===g?(gc[g]||"#0f172a"):"#94a3b8",fontWeight:700,fontSize:12,cursor:"pointer"}}>{g==="all"?"All":g}</button>)}</div>
        <div style={{display:"flex",gap:6,marginBottom:14}}><button onClick={exportCSV} style={{flex:1,padding:10,borderRadius:8,border:"1px solid #16a34a",background:"#fff",color:"#16a34a",fontWeight:700,fontSize:13,cursor:"pointer"}}>Export</button><button onClick={loadItems} style={{flex:1,padding:10,borderRadius:8,border:"1px solid #d1d5db",background:"#fff",color:"#475569",fontWeight:700,fontSize:13,cursor:"pointer"}}>{ld?"...":"Refresh"}</button></div>

        {fi.length===0?<div style={{textAlign:"center",padding:48,color:"#9ca3af"}}>No items</div>:fi.map(item=>{
          const isE=expId===item.id;const mc=item.missing||item.inventory_missing_components||[];const subs=item.subcomps||item.inventory_subcomponents||[];
          const subGrades={};subs.forEach(s=>{subGrades[s.grade]=(subGrades[s.grade]||0)+(s.quantity||1);});
          return(
            <div key={item.id} style={{...card,borderLeft:`4px solid ${gc[item.grade]||"#6b7280"}`,padding:14,cursor:"pointer"}} onClick={()=>setExpId(isE?null:item.id)}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div><div style={{fontWeight:800,fontSize:14}}>{item.id}</div><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{item.equipment_type}</div><div style={{fontSize:12,color:"#475569"}}>S/N: {item.serial_number}{item.model_number?` | ${item.model_number}`:""}</div>{item.manufacturer&&<div style={{fontSize:12,color:"#6b7280"}}>{item.manufacturer}{item.voltage_rating?` | ${item.voltage_rating}`:""}{item.amperage_rating?` / ${item.amperage_rating}`:""}</div>}</div>
                <div style={{textAlign:"right",flexShrink:0}}><span style={{padding:"3px 10px",borderRadius:10,fontSize:13,fontWeight:800,background:(gc[item.grade]||"#6b7280")+"18",color:gc[item.grade]}}>{item.grade}</span><div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>{LOC.find(l=>l.v===item.location)?.l}</div><div style={{fontSize:10,color:sc[item.status]||"#6b7280",fontWeight:600}}>{item.status}</div></div>
              </div>
              {/* Sub summary */}
              {subs.length>0&&<div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:10,fontWeight:700,color:"#0369a1"}}>{subs.length} components:</span>{GRD.map(g=>{const n=subGrades[g.v]||0;if(!n)return null;return<span key={g.v} style={{fontSize:10,padding:"2px 6px",borderRadius:6,background:g.c+"18",color:g.c,fontWeight:600}}>{g.v}:{n}</span>;})}</div>}
              {mc.length>0&&<div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:10,fontWeight:700,color:"#dc2626"}}>MISSING:</span>{mc.map((m,i)=><span key={i} style={{fontSize:10,padding:"2px 6px",borderRadius:6,background:"#fef2f2",color:"#dc2626",fontWeight:600}}>{m.component_type}</span>)}</div>}

              {isE&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #e5e7eb"}}>
                <div style={{fontSize:12,color:"#475569",lineHeight:1.8}}>{item.job_number&&<div><strong>Job #:</strong> {item.job_number}</div>}{item.source_job_site&&<div><strong>Source:</strong> {item.source_job_site}</div>}{item.customer_origin&&<div><strong>Customer:</strong> {item.customer_origin}</div>}<div><strong>Received:</strong> {item.date_received}</div><div><strong>By:</strong> {item.scanned_by}</div>{item.condition_notes&&<div style={{fontStyle:"italic",color:"#6b7280",marginTop:4}}>{item.condition_notes}</div>}</div>

                {/* Subcomponent detail */}
                {subs.length>0&&<div style={{marginTop:10}}><div style={{fontSize:12,fontWeight:800,color:"#0369a1",marginBottom:6}}>SUBCOMPONENTS</div>
                  {subs.map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                      <div><span style={{fontWeight:600}}>{s.component_type||s.componentType}</span>{(s.amp_rating||s.ampRating)&&<span style={{marginLeft:4,color:"#475569"}}>{s.amp_rating||s.ampRating}A</span>}<span style={{marginLeft:4,color:"#94a3b8"}}>{s.poles}P</span>{s.position&&<span style={{marginLeft:4,color:"#94a3b8"}}>({s.position})</span>}{(s.origin_type||s.originType)==="aftermarket"&&<span style={{marginLeft:4,padding:"1px 5px",borderRadius:4,background:"#c026d318",color:"#c026d3",fontSize:9,fontWeight:700}}>AM</span>}{s.is_present===false&&<span style={{marginLeft:4,color:"#dc2626",fontWeight:700}}>MISSING</span>}{s.salvageable===false&&<span style={{marginLeft:4,color:"#6b7280",fontWeight:600}}>Not salv.</span>}</div>
                      <span style={{fontWeight:800,color:gc[s.grade]||"#6b7280",fontSize:13}}>{s.grade}</span>
                    </div>
                  ))}
                </div>}

                {/* Status/Location/Grade controls */}
                <div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:4}}>Status</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{STS.map(s=><button key={s.v} onClick={e=>{e.stopPropagation();patch(item.id,{status:s.v});}} style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${item.status===s.v?s.c:"#e2e8f0"}`,background:item.status===s.v?s.c+"15":"#fff",color:item.status===s.v?s.c:"#94a3b8",fontWeight:600,fontSize:10,cursor:"pointer"}}>{s.l}</button>)}</div></div>
                <div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:4}}>Move</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{LOC.map(l=><button key={l.v} onClick={e=>{e.stopPropagation();patch(item.id,{location:l.v});}} style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${item.location===l.v?"#2563eb":"#e2e8f0"}`,background:item.location===l.v?"#2563eb15":"#fff",color:item.location===l.v?"#2563eb":"#94a3b8",fontWeight:600,fontSize:10,cursor:"pointer"}}>{l.l}</button>)}</div></div>
                <div style={{marginTop:10}}><div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:4}}>Grade</div><div style={{display:"flex",gap:6}}>{GRD.map(g=><button key={g.v} onClick={e=>{e.stopPropagation();patch(item.id,{grade:g.v});}} style={{flex:1,padding:"8px 0",borderRadius:8,border:`2px solid ${item.grade===g.v?g.c:"#e2e8f0"}`,background:item.grade===g.v?g.c+"15":"#fff",color:item.grade===g.v?g.c:"#94a3b8",fontWeight:800,fontSize:14,cursor:"pointer"}}>{g.v}</button>)}</div></div>
              </div>}
            </div>);
        })}
      </div>}
    </div>);
}
