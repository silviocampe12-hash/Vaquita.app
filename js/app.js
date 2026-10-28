/* === CONFIG SUPABASE: pegá acá tus datos (Project Settings > API) === */
var SB_URL="https://TU-PROYECTO.supabase.co",SB_KEY="TU_ANON_KEY";
var S={groups:[]},cur=null,tab="gastos",draft=null,toastT=null,joining=null,pushT=null;
try{S=JSON.parse(localStorage.getItem("vq"))||S}catch(e){}
function local(){try{localStorage.setItem("vq",JSON.stringify(S))}catch(e){}}
function save(){local();push()}
function off(){return SB_URL.indexOf("TU-")>-1}
function api(path,opt){opt=opt||{};opt.headers={apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"};return fetch(SB_URL+"/rest/v1/"+path,opt).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function merge(a,b){
  var del=(a.del||[]).concat(b.del||[]),ms={},es={};
  b.members.concat(a.members).forEach(function(m){ms[m.id]=m});
  b.expenses.concat(a.expenses).forEach(function(e){es[e.id]=e});
  a.members=Object.keys(ms).map(function(k){return ms[k]});
  a.expenses=Object.keys(es).filter(function(k){return del.indexOf(k)<0}).map(function(k){return es[k]}).sort(function(x,y){return x.id<y.id?-1:1});
  a.del=del.filter(function(v,i){return del.indexOf(v)===i});return a}
function pull(){
  var g=G();if(!g||off())return Promise.resolve();
  return api("groups?id=eq."+g.id).then(function(r){
    if(!r[0])return;var before=JSON.stringify(g);merge(g,r[0].data);
    if(JSON.stringify(g)!==before){local();if(!draft&&!/INPUT|SELECT/.test(document.activeElement.tagName))render()}
  }).catch(function(){})}
function push(){
  if(off())return;clearTimeout(pushT);
  pushT=setTimeout(function(){var g=G();if(!g)return;
    pull().then(function(){return api("groups?on_conflict=id",{method:"POST",body:JSON.stringify({id:g.id,data:g,updated_at:new Date().toISOString()})})})
    .catch(function(){toast("Sin conexión: no se sincronizó")})},400)}
function uid(){return Math.random().toString(36).slice(2,7)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function money(c){var n=c/100;return"$"+n.toLocaleString("es-AR",{minimumFractionDigits:c%100?2:0,maximumFractionDigits:2})}
function G(){return S.groups.find(function(g){return g.id===cur})}
function M(g,id){var m=g.members.find(function(x){return x.id===id});return m?m.name:"?"}
function parse(v){var n=parseFloat(String(v).replace(/\./g,"").replace(",","."));return isNaN(n)?0:Math.round(n*100)}
function shares(c,ids){var n=ids.length,b=Math.floor(c/n),r=c-b*n,o={};ids.forEach(function(id,i){o[id]=b+(i<r?1:0)});return o}
function total(g){return g.expenses.reduce(function(a,e){return a+e.amount},0)}
function balances(g){
  var b={};g.members.forEach(function(m){b[m.id]=0});
  g.expenses.forEach(function(e){
    b[e.paid]+=e.amount;
    if(e.items&&e.items.length){e.items.forEach(function(it){var ids=it.to.length?it.to:e.split;var s=shares(it.price,ids);for(var k in s)b[k]-=s[k]})}
    else{var s=shares(e.amount,e.split);for(var k in s)b[k]-=s[k]}
  });return b}
function debts(b){
  var cr=[],de=[],out=[];
  for(var k in b){if(b[k]>0)cr.push([k,b[k]]);else if(b[k]<0)de.push([k,-b[k]])}
  cr.sort(function(a,b){return b[1]-a[1]});de.sort(function(a,b){return b[1]-a[1]});
  var i=0,j=0;
  while(i<cr.length&&j<de.length){var t=Math.min(cr[i][1],de[j][1]);out.push({from:de[j][0],to:cr[i][0],amt:t});cr[i][1]-=t;de[j][1]-=t;if(!cr[i][1])i++;if(!de[j][1])j++}
  return out}
function toast(t){clearTimeout(toastT);var d=document.getElementById("toast");if(d)d.remove();d=document.createElement("div");d.id="toast";d.className="toast";d.textContent=t;document.body.appendChild(d);toastT=setTimeout(function(){d.remove()},1800)}
function copy(t,msg){
  function fb(){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy")}catch(e){}a.remove()}
  try{navigator.clipboard.writeText(t).catch(fb)}catch(e){fb()}
  toast(msg||"Copiado")}
var LOGO = '<img src="./img/logo.png" alt="Vaquita" style="width:40px;height:40px;object-fit:contain;vertical-align:middle;">';

function render(){
  var a=document.getElementById("app");
  a.innerHTML=cur&&G()?group():home();
  var s=document.getElementById("sheet");if(s)s.remove();
  if(draft)document.body.insertAdjacentHTML("beforeend",sheet());
}

function home(){
  var h='<div class="logo">'+LOGO+'Vaquita</div><h1>Dividí gastos sin vueltas</h1><p class="mut">Creá un grupo, cargá lo que pagó cada uno y mirá quién le transfiere a quién.</p>';
  h+='<div class="card"><h2>Nuevo grupo</h2><input id="gn" placeholder="Nombre (ej. Asado del sábado)"><input id="gm" placeholder="Tu apodo"><button class="pri full" onclick="mk()">Crear grupo</button></div>';

  if(S.groups.length){
    h+='<h2 style="margin-top:20px">Tus grupos</h2>';

    S.groups.forEach(function(g){
      h+='<div class="card row sp" style="align-items:center;gap:10px">';
      h+='<div class="g1" onclick="op(\''+g.id+'\')" style="cursor:pointer;min-width:0">';
      h+='<b>'+esc(g.name)+'</b>';
      h+='<p class="mut">'+g.members.length+' personas, '+g.expenses.length+' gastos</p>';
      h+='</div>';
      h+='<span class="amt">'+money(total(g))+'</span>';
      h+='<button class="del" onclick="event.stopPropagation();borrarGrupo(\''+g.id+'\')" title="Eliminar grupo" aria-label="Eliminar grupo">🗑</button>';
      h+='</div>';
    });
  }

  return h;
}


function borrarGrupo(id){
  var grupo = S.groups.find(function(g){
    return g.id === id;
  });

  if(!grupo) return;

  var confirmar = confirm(
    '¿Seguro que querés eliminar el grupo "'+
    grupo.name+
    '"?\n\nSe eliminarán sus integrantes y gastos. Esta acción no se puede deshacer.'
  );

  if(!confirmar) return;

  S.groups = S.groups.filter(function(g){
    return g.id !== id;
  });

  if(typeof save === 'function'){
    save();
  }

  render();
}

function op(id){cur=id;tab="gastos";location.hash=id;render();window.scrollTo(0,0);push()}
function back(){cur=null;history.replaceState(null,"",location.pathname);render()}
function group(){
  var g=G();
  var h='<div class="row sp"><button class="ghost" onclick="back()">‹ Grupos</button><span class="logo" style="font-size:16px">'+LOGO+'</span></div><h1>'+esc(g.name)+'</h1><p class="mut">Total gastado: <b>'+money(total(g))+'</b></p>';
  h+='<div class="tabs">'+[["gastos","Gastos"],["saldos","Saldos"],["gente","Personas"]].map(function(t){return'<button class="'+(tab===t[0]?"on":"")+'" onclick="tb(\''+t[0]+'\')">'+t[1]+'</button>'}).join("")+'</div>';
  if(tab==="gastos"){
    if(!g.expenses.length)h+='<div class="card mut">Todavía no hay gastos. Tocá “Agregar gasto” para cargar el primero.</div>';
    g.expenses.slice().reverse().forEach(function(e){
      h+='<div class="card row sp"><div class="g1"><b>'+esc(e.title)+'</b><p class="mut">Pagó '+esc(M(g,e.paid))+(e.items&&e.items.length?", "+e.items.length+" ítems":", entre "+e.split.length)+'</p></div><span class="amt">'+money(e.amount)+'</span><button class="ghost x" aria-label="Borrar gasto" onclick="del(\''+e.id+'\')">✕</button></div>'})
  }
  if(tab==="saldos")h+=saldos(g);
  if(tab==="gente")h+=gente(g);
  if(tab==="gastos")h+='<button class="pri fab" onclick="nw()">+ Agregar gasto</button>';
  return h}
function tb(t){tab=t;render()}
function del(id){var g=G();if(confirm("¿Borrar este gasto?")){(g.del=g.del||[]).push(id);g.expenses=g.expenses.filter(function(e){return e.id!==id});save();render()}}
function saldos(g){
  var b=balances(g),d=debts(b),h='<h2>Saldos</h2>';
  g.members.forEach(function(m){var v=b[m.id];h+='<div class="card row sp"><span>'+esc(m.name)+'</span><span class="amt '+(v>0?"pos":v<0?"neg":"")+'">'+(v>0?"+":"")+money(v)+'</span></div>'});
  h+='<h2 style="margin-top:22px">Quién le paga a quién</h2>';
  if(!d.length)h+='<div class="card mut">Está todo saldado.</div>';
  d.forEach(function(x){
    var al=g.members.find(function(m){return m.id===x.to}).alias;
    h+='<div class="card"><div class="row sp"><span><b>'+esc(M(g,x.from))+'</b> le paga a <b>'+esc(M(g,x.to))+'</b></span><span class="amt">'+money(x.amt)+'</span></div>';
    h+=al?'<div class="row" style="margin-top:10px"><button class="pri g1" onclick="copy(\''+esc(al)+'\',\'Alias copiado\')">Copiar alias: '+esc(al)+'</button><a href="https://www.mercadopago.com.ar" target="_blank" rel="noopener"><button>Mercado Pago</button></a></div>':'<p class="mut" style="margin-top:6px">'+esc(M(g,x.to))+' todavía no cargó su alias.</p>';
    h+='</div>'});
  if(g.expenses.length)h+='<button class="pri full" style="margin-top:14px" onclick="wa()">Copiar resumen para WhatsApp</button>';
  return h}
function wa(){
  var g=G(),d=debts(balances(g)),t="Resumen de Vaquita: ["+g.name+"]\nTotal gastado: "+money(total(g))+"\n\nSaldos finales:\n";
  if(!d.length)t+="• Todo saldado\n";
  d.forEach(function(x){var al=g.members.find(function(m){return m.id===x.to}).alias;t+="• "+M(g,x.from)+" le debe a "+M(g,x.to)+": "+money(x.amt)+(al?" (Alias: "+al+")":"")+"\n"});
  copy(t.trim(),"Resumen copiado")}
function gente(g){
  var h='<h2>Personas</h2><p class="mut">Cada uno puede guardar su alias o CBU para que le transfieran.</p>';
  g.members.forEach(function(m){
    var used=g.expenses.some(function(e){return e.paid===m.id||e.split.indexOf(m.id)>-1||(e.items||[]).some(function(i){return i.to.indexOf(m.id)>-1})});
    h+='<div class="card"><div class="row sp"><b>'+esc(m.name)+'</b>'+(used||g.members.length<2?'':'<button class="ghost x" aria-label="Quitar persona" onclick="rm(\''+m.id+'\')">✕</button>')+'</div><input placeholder="Alias o CBU" value="'+esc(m.alias)+'" onchange="al(\''+m.id+'\',this.value)"></div>'});
  h+='<div class="card"><input id="nm" placeholder="Nombre o apodo"><button class="full" onclick="am()">Sumar persona</button></div>';
  h+='<div class="card"><p class="mut">Cualquiera que abra este link puede sumarse al grupo:</p><button class="full" style="margin-top:8px" onclick="lk()">Copiar link</button></div>';
  return h}
function al(id,v){var m=G().members.find(function(x){return x.id===id});m.alias=v.trim();save();toast("Alias guardado")}
function rm(id){var g=G();g.members=g.members.filter(function(m){return m.id!==id});save();render()}
function am(){var v=document.getElementById("nm").value.trim();if(!v)return;G().members.push({id:"m"+uid(),name:v,alias:""});save();render()}

function nw(){var g=G();draft={mode:"manual",title:"",amount:"",paid:g.members[0].id,split:g.members.map(function(m){return m.id}),items:[{name:"",price:"",to:[]}]};render()}
function tg(arr,id,i){var l=i===undefined?draft[arr]:draft.items[i].to;var k=l.indexOf(id);if(k>-1)l.splice(k,1);else l.push(id);render()}
function chips(g,list,call){return'<div class="chips">'+g.members.map(function(m){return'<button class="chip '+(list.indexOf(m.id)>-1?"on":"")+'" onclick="'+call.replace("ID",m.id)+'">'+esc(m.name)+'</button>'}).join("")+'</div>'}
function sheet(){
  var g=G(),d=draft,it=d.mode==="items";
  var h='<div id="sheet" class="sheet"><div><div class="row sp"><h2>Nuevo gasto</h2><button class="ghost" onclick="draft=null;render()">Cerrar</button></div>';
  h+=scanUI();h+='<div class="tabs"><button class="'+(!it?"on":"")+'" onclick="draft.mode=\'manual\';render()">Carga rápida</button><button class="'+(it?"on":"")+'" onclick="draft.mode=\'items\';render()">Ticket por ítems</button></div>';
  h+='<input placeholder="Concepto (ej. Carnicería)" value="'+esc(d.title)+'" oninput="draft.title=this.value">';
  if(!it)h+='<input inputmode="decimal" placeholder="Monto ($)" value="'+esc(d.amount)+'" oninput="draft.amount=this.value">';
  h+='<p class="mut" style="margin-top:8px">Quién pagó</p><select onchange="draft.paid=this.value">'+g.members.map(function(m){return'<option value="'+m.id+'"'+(m.id===d.paid?" selected":"")+'>'+esc(m.name)+'</option>'}).join("")+'</select>';
  if(it){
    d.items.forEach(function(x,i){
      h+='<div class="item"><div class="row"><input class="g1" placeholder="Ítem" value="'+esc(x.name)+'" oninput="draft.items['+i+'].name=this.value"><input style="width:110px" inputmode="decimal" placeholder="$" value="'+esc(x.price)+'" oninput="draft.items['+i+'].price=this.value"><button class="ghost x" aria-label="Quitar ítem" onclick="draft.items.splice('+i+',1);render()">✕</button></div>';
      h+='<p class="mut">Quién lo consumió (vacío = todos los elegidos abajo)</p>'+chips(g,x.to,"tg('to','ID',"+i+")")+'</div>'});
    h+='<button class="full" style="margin-top:8px" onclick="draft.items.push({name:\'\',price:\'\',to:[]});render()">+ Otro ítem</button>';
    h+='<p class="mut" style="margin-top:10px">Los ítems sin asignar se dividen entre:</p>'}
  else h+='<p class="mut" style="margin-top:10px">Se divide entre:</p>';
  h+=chips(g,d.split,"tg('split','ID')");
  h+='<button class="pri full" style="margin-top:12px" onclick="sv()">Guardar gasto</button></div></div>';
  return h}
function sv(){
  var g=G(),d=draft,e={id:"e"+uid(),paid:d.paid,title:d.title.trim()||"Gasto",split:d.split.slice()};
  if(!e.split.length){toast("Elegí entre quiénes se divide");return}
  if(d.mode==="items"){
    var its=d.items.map(function(x){return{name:x.name.trim()||"Ítem",price:parse(x.price),to:x.to.slice()}}).filter(function(x){return x.price>0});
    if(!its.length){toast("Cargá al menos un ítem con precio");return}
    e.items=its;e.amount=its.reduce(function(a,x){return a+x.price},0)}
  else{e.amount=parse(d.amount);if(e.amount<=0){toast("Ingresá un monto válido");return}}
  g.expenses.push(e);save();draft=null;render();toast("Gasto guardado")}

/* === OCR DE TICKETS: selección independiente de nombres, cantidades y precios === */
var TJS="https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";
function loadT(){return new Promise(function(ok,no){if(window.Tesseract)return ok();var s=document.createElement("script");s.src=TJS;s.onload=ok;s.onerror=function(){no(new Error("cdn"))};document.head.appendChild(s)})}
function prep(file){return new Promise(function(ok,no){
  var im=new Image();
  im.onload=function(){
    var w=Math.min(1800,im.naturalWidth),h=Math.round(im.naturalHeight*w/im.naturalWidth),c=document.createElement("canvas");
    c.width=w;c.height=h;var x=c.getContext("2d");x.drawImage(im,0,0,w,h);
    var d=x.getImageData(0,0,w,h),p=d.data,hist=new Array(256).fill(0),i,g,n=w*h,lo=0,hi=255,a=0;
    for(i=0;i<p.length;i+=4){g=Math.round(.299*p[i]+.587*p[i+1]+.114*p[i+2]);p[i]=g;hist[g]++}
    for(i=0;i<256;i++){a+=hist[i];if(a>n*.02){lo=i;break}}
    a=0;for(i=255;i>=0;i--){a+=hist[i];if(a>n*.02){hi=i;break}}
    var k=255/Math.max(1,hi-lo);
    for(i=0;i<p.length;i+=4){g=Math.max(0,Math.min(255,(p[i]-lo)*k));p[i]=p[i+1]=p[i+2]=g}
    x.putImageData(d,0,0);URL.revokeObjectURL(im.src);ok(c)};
  im.onerror=function(){no(new Error("img"))};im.src=URL.createObjectURL(file)})}
function num(s){
  s=String(s||"").trim().replace(/\$/g,"").replace(/\s/g,"");
  if(!s)return 0;
  if(s.indexOf(",")>-1)s=s.replace(/\./g,"").replace(",",".");
  else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,"");
  var n=parseFloat(s);return isNaN(n)?0:Math.round(n*100)}
function scanUI(){return '<label class="btnl">📷 Elegir foto del ticket<input class="sr" type="file" accept="image/*" onchange="scan(this)"></label><p id="scs" class="mut" style="margin-bottom:8px">'+esc(draft.scan||"")+'</p>'}
function stat(t){if(draft)draft.scan=t;var e=document.getElementById("scs");if(e)e.textContent=t}
function scan(inp){var f=inp.files&&inp.files[0];inp.value="";if(!f)return;showTicketCrop(f)}

function showTicketCrop(file){
  var flujo={file:file,paso:0,nombres:[],cantidades:[],precios:[],cantidadOmitida:false};
  seleccionarZonaTicket(flujo);
}
function seleccionarZonaTicket(flujo){
  var old=document.getElementById("ticketCropModal");if(old)old.remove();
  var pasos=[
    {titulo:"1 de 3: nombres de productos",ayuda:"Marcá solo la columna o zona donde aparecen los nombres de los productos."},
    {titulo:"2 de 3: cantidades (opcional)",ayuda:"Marcá la zona de cantidades. Si el ticket no tiene cantidades, tocá «No hay cantidades»."},
    {titulo:"3 de 3: precios",ayuda:"Marcá la zona donde aparecen los precios. Incluí los importes de los productos y excluí el total del ticket."}
  ];
  var paso=pasos[flujo.paso];
  var modal=document.createElement("div");modal.id="ticketCropModal";
  modal.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;padding:10px;overflow:auto;";
  modal.innerHTML='<div style="background:white;color:#222;border-radius:14px;padding:15px;width:100%;max-width:760px;max-height:96vh;overflow:auto;box-sizing:border-box">'+
    '<h2 style="margin:0 0 8px;font-size:20px">'+paso.titulo+'</h2><p style="margin:0 0 12px;font-size:14px">'+paso.ayuda+'</p>'+
    '<div id="ticketCropWrap" style="position:relative;display:block;width:max-content;max-width:100%;margin:auto;line-height:0;touch-action:none;cursor:crosshair">'+
    '<img id="ticketCropImage" alt="Ticket para seleccionar" style="display:block;max-width:100%;max-height:58vh;width:auto;height:auto">'+
    '<div id="ticketCropLayer" style="position:absolute;inset:0;touch-action:none"></div><div id="ticketCropRect" style="display:none;position:absolute;border:2px solid #16a34a;background:rgba(22,163,74,.18);pointer-events:none;box-sizing:border-box"></div></div>'+
    '<p id="ticketCropHint" style="font-size:13px;color:#555;margin:10px 0">Marcá una zona arrastrando sobre la imagen.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+
    (flujo.paso===1?'<button id="ticketCropSkip" type="button" style="padding:10px 12px;border-radius:8px;border:1px solid #ccc;background:white">No hay cantidades</button>':'')+
    '<button id="ticketCropRetry" type="button" style="padding:10px 12px;border-radius:8px;border:1px solid #ccc;background:white">Volver a marcar</button><button id="ticketCropCancel" type="button" style="padding:10px 12px;border-radius:8px;border:1px solid #ccc;background:white">Cancelar</button><button id="ticketCropNext" type="button" disabled style="padding:10px 14px;border:0;border-radius:8px;background:#15803d;color:white;opacity:.55">'+(flujo.paso===2?'Leer y combinar':'Leer esta zona')+'</button></div></div>';
  document.body.appendChild(modal);
  var img=modal.querySelector("#ticketCropImage"),layer=modal.querySelector("#ticketCropLayer"),rect=modal.querySelector("#ticketCropRect"),hint=modal.querySelector("#ticketCropHint"),next=modal.querySelector("#ticketCropNext");
  var startX=0,startY=0,selection=null,dragging=false,objectUrl=URL.createObjectURL(flujo.file);
  function close(){if(objectUrl)URL.revokeObjectURL(objectUrl);modal.remove()}
  function pos(x1,y1,x2,y2){rect.style.display="block";rect.style.left=Math.min(x1,x2)+"px";rect.style.top=Math.min(y1,y2)+"px";rect.style.width=Math.abs(x2-x1)+"px";rect.style.height=Math.abs(y2-y1)+"px"}
  function point(e){var b=layer.getBoundingClientRect();return{x:Math.max(0,Math.min(b.width,e.clientX-b.left)),y:Math.max(0,Math.min(b.height,e.clientY-b.top))}}
  function reset(){selection=null;dragging=false;rect.style.display="none";next.disabled=true;next.style.opacity=".55";hint.textContent="Arrastrá sobre la imagen para marcar la zona correcta."}
  layer.addEventListener("pointerdown",function(e){if(!img.naturalWidth)return;e.preventDefault();var p=point(e);startX=p.x;startY=p.y;dragging=true;selection=null;layer.setPointerCapture(e.pointerId);pos(startX,startY,startX,startY);next.disabled=true;next.style.opacity=".55"});
  layer.addEventListener("pointermove",function(e){if(!dragging)return;e.preventDefault();var p=point(e);pos(startX,startY,p.x,p.y)});
  layer.addEventListener("pointerup",function(e){if(!dragging)return;dragging=false;var p=point(e),left=Math.min(startX,p.x),top=Math.min(startY,p.y),width=Math.abs(p.x-startX),height=Math.abs(p.y-startY);if(width<12||height<12){reset();hint.textContent="La zona es muy pequeña. Dibujá un rectángulo más grande.";return}selection={left:left,top:top,width:width,height:height};pos(startX,startY,p.x,p.y);next.disabled=false;next.style.opacity="1";hint.textContent="Zona marcada. Revisá que incluya solo la información de este paso."});
  img.onload=reset;img.onerror=function(){hint.textContent="No se pudo abrir la imagen. Probá con otra foto."};img.src=objectUrl;
  modal.querySelector("#ticketCropRetry").onclick=reset;modal.querySelector("#ticketCropCancel").onclick=close;
  var skip=modal.querySelector("#ticketCropSkip");if(skip)skip.onclick=function(){flujo.cantidades=[];flujo.cantidadOmitida=true;flujo.paso=2;close();seleccionarZonaTicket(flujo)};
  next.onclick=function(){if(!selection||!img.naturalWidth)return;var b=img.getBoundingClientRect();if(!b.width||!b.height)return;
    var scaleX=img.naturalWidth/b.width,scaleY=img.naturalHeight/b.height,sx=Math.max(0,Math.round(selection.left*scaleX)),sy=Math.max(0,Math.round(selection.top*scaleY));
    var sw=Math.max(1,Math.min(Math.round(selection.width*scaleX),img.naturalWidth-sx)),sh=Math.max(1,Math.min(Math.round(selection.height*scaleY),img.naturalHeight-sy));
    var canvas=document.createElement("canvas");canvas.width=sw;canvas.height=sh;canvas.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    next.disabled=true;hint.textContent="Leyendo esta zona…";
    canvas.toBlob(function(blob){if(!blob){hint.textContent="No se pudo recortar la imagen. Probá de nuevo.";next.disabled=false;return}close();stat("Leyendo "+(flujo.paso===0?"nombres":flujo.paso===1?"cantidades":"precios")+" del ticket…");leerZonaTicket(blob).then(function(texto){
      if(flujo.paso===0)flujo.nombres=extraerNombresTicket(texto);
      else if(flujo.paso===1)flujo.cantidades=extraerCantidadesTicket(texto);
      else flujo.precios=extraerPreciosTicket(texto);
      if(flujo.paso<2){flujo.paso++;seleccionarZonaTicket(flujo)}else finalizarLecturaTicket(flujo);
    }).catch(function(err){console.error(err);stat("No se pudo leer esta zona. Revisá la conexión y volvé a escanear el ticket.")})},"image/png")
  };
}
function leerZonaTicket(blob){return Promise.all([loadT(),prep(blob)]).then(function(r){return Tesseract.recognize(r[1],"spa",{logger:function(m){if(m.status==="recognizing text")stat("Reconociendo texto… "+Math.round(m.progress*100)+"%")}})}).then(function(r){return r.data.text||""})}
function limpiarLineaTicket(s){return String(s||"").replace(/[|]/g," ").replace(/\s+/g," ").trim()}
function extraerNombresTicket(texto){
  return texto.split(/\r?\n/).map(limpiarLineaTicket).filter(function(l){if(!l)return false;var letras=(l.match(/[A-Za-zÁÉÍÓÚáéíóúñÑüÜ]/g)||[]).length;if(letras<2)return false;if(/total|subtotal|iva\b|cuit|cuil|fecha|hora|factura|ticket|comprobante|efectivo|tarjeta|débito|credito|crédito|vuelto|cambio|descuento|mercado pago|punto de venta|ingresos brutos|responsable inscripto/i.test(l))return false;return true}).map(function(l){return l.replace(/^\s*[0-9]+[.,]?[0-9]*\s*(?:x|u|un|kg)?\s*/i,"").replace(/\s+/g," ").trim()}).filter(Boolean)
}
function extraerCantidadesTicket(texto){
  var out=[];texto.split(/\r?\n/).map(limpiarLineaTicket).forEach(function(l){if(!l)return;var m=l.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:x|×|un(?:idad(?:es)?)?|u\b|kg\b|gr\b|g\b|lt\b|l\b|ml\b)\s*(?:$|\s)/i);if(!m)m=l.match(/^\s*(\d+(?:[.,]\d+)?)\s+/);if(m){var q=parseFloat(m[1].replace(",","."));if(isFinite(q)&&q>0&&q<10000)out.push(q)}});return out
}
function extraerPreciosTicket(texto){
  var out=[];var re=/(?:\$\s*)?(\d{1,3}(?:[. ]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*$/;
  texto.split(/\r?\n/).map(limpiarLineaTicket).forEach(function(l){if(!l)return;if(/total|subtotal|iva\b|cuit|cuil|fecha|hora|factura|ticket|comprobante|efectivo|tarjeta|débito|credito|crédito|vuelto|cambio|descuento|mercado pago|punto de venta|ingresos brutos|responsable inscripto/i.test(l))return;var m=l.match(re);if(!m)return;var n=num(m[1]);if(n>0)out.push(n)});return out
}
function finalizarLecturaTicket(flujo){
  var nombres=flujo.nombres||[],precios=flujo.precios||[],cantidades=flujo.cantidadOmitida?[]:(flujo.cantidades||[]);
  if(!nombres.length){stat("No pudimos reconocer nombres de productos. Probá otra foto o cargalos manualmente.");return}
  if(!precios.length){stat("No pudimos reconocer precios. Volvé a escanear y seleccioná mejor la columna de precios.");return}
  var n=Math.min(nombres.length,precios.length),items=[];
  for(var i=0;i<n;i++){var q=cantidades[i]||1;items.push({name:nombres[i],price:precios[i],quantity:q,to:[]})}
  if(!items.length){stat("No se pudieron combinar nombres y precios. Probá otra foto.");return}
  draft.mode="items";draft.items=items.map(function(x){return{name:x.name,price:(x.price/100).toFixed(2).replace(".",","),to:[]}});
  var avisos=[];if(nombres.length!==precios.length)avisos.push("nombres detectados: "+nombres.length+", precios: "+precios.length+"; se combinaron "+n+" por orden");
  if(!flujo.cantidadOmitida&&cantidades.length&&cantidades.length!==n)avisos.push("cantidades detectadas: "+cantidades.length+"; revisá las cantidades, que por ahora no modifican los importes");
  draft.scan="Leímos "+n+" ítems"+(avisos.length?". ATENCIÓN: "+avisos.join(". "):". Revisá nombres y precios antes de guardar")+". La cantidad no se multiplica por el precio automáticamente.";
  render();
}

function lk(){copy(location.href.split("#")[0]+"#"+cur,"Link copiado")}
function renderJoin(){document.getElementById("app").innerHTML='<div class="logo">'+LOGO+'Vaquita</div><h1>'+esc(joining.name)+'</h1><p class="mut">Te invitaron a este grupo. ¿Cómo te llamamos?</p><div class="card"><input id="jn" placeholder="Tu nombre o apodo"><button class="pri full" onclick="join()">Entrar al grupo</button></div>'}
function join(){var n=document.getElementById("jn").value.trim();if(!n)return;var g=joining;g.members.push({id:"m"+uid(),name:n,alias:""});S.groups.unshift(g);cur=g.id;save();render()}
function boot(){
  var id=location.hash.slice(1);
  if(!id||off()){render();return}
  if(S.groups.some(function(g){return g.id===id})){cur=id;render();pull();return}
  api("groups?id=eq."+encodeURIComponent(id)).then(function(r){if(!r[0]){toast("No encontramos ese grupo");render();return}joining=r[0].data;renderJoin()}).catch(function(){toast("No se pudo abrir el grupo");render()})}
boot();
setInterval(function(){if(cur&&!draft)pull()},5000);