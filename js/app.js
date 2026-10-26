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
var LOGO='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 6h30v28l-3.75-3-3.75 3-3.75-3L20 34l-3.75-3-3.75 3-3.75-3L5 34z" fill="#00E676"/><circle cx="14" cy="17" r="2" fill="#06371f"/><circle cx="26" cy="17" r="2" fill="#06371f"/><ellipse cx="20" cy="24" rx="7" ry="4.5" fill="#06371f"/><circle cx="17.5" cy="24" r="1.2" fill="#00E676"/><circle cx="22.5" cy="24" r="1.2" fill="#00E676"/><path d="M8 9l4 4M32 9l-4 4" stroke="#06371f" stroke-width="2.4" stroke-linecap="round"/></svg>';

function render(){
  var a=document.getElementById("app");
  a.innerHTML=cur&&G()?group():home();
  var s=document.getElementById("sheet");if(s)s.remove();
  if(draft)document.body.insertAdjacentHTML("beforeend",sheet());
}
function home(){
  var h='<div class="logo">'+LOGO+'Vaquita</div><h1>Dividí gastos sin vueltas</h1><p class="mut">Creá un grupo, cargá lo que pagó cada uno y mirá quién le transfiere a quién.</p>';
  h+='<div class="card"><h2>Nuevo grupo</h2><input id="gn" placeholder="Nombre (ej. Asado del sábado)"><input id="gm" placeholder="Tu apodo"><button class="pri full" onclick="mk()">Crear grupo</button></div>';
  if(S.groups.length){h+='<h2 style="margin-top:20px">Tus grupos</h2>';S.groups.forEach(function(g){h+='<div class="card row sp" onclick="op(\''+g.id+'\')" style="cursor:pointer"><div class="g1"><b>'+esc(g.name)+'</b><p class="mut">'+g.members.length+' personas, '+g.expenses.length+' gastos</p></div><span class="amt">'+money(total(g))+'</span></div>'})}
  return h}
function mk(){
  var n=document.getElementById("gn").value.trim(),m=document.getElementById("gm").value.trim();
  if(!n||!m){toast("Falta el nombre del grupo o tu apodo");return}
  var g={id:uid()+uid(),name:n,created:new Date().toISOString(),members:[{id:"m"+uid(),name:m,alias:""}],expenses:[]};
  S.groups.unshift(g);save();op(g.id)}
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
  d.forEach(function(x,i){
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
/* === OCR de tickets (Tesseract.js, corre en el navegador) === */
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
function num(s){var n=parseFloat(s.replace(/[\s.]/g,"").replace(",","."));return isNaN(n)?0:Math.round(n*100)}
function parseTicket(t){
  var items=[],tot=0,re=/(\d{1,3}(?:[. ]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*$/;
  t.split("\n").forEach(function(l){
    l=l.replace(/[$€]/g," ").replace(/\s+/g," ").trim();
    var m=l.match(re);if(!m)return;var v=num(m[1]);if(v<=0)return;
    if(/total/i.test(l)&&!/sub/i.test(l)){tot=v;return}
    if(/subtotal|iva|cuit|fecha|tel[.: ]|factura|ticket|cambio|vuelto|efectivo|tarjeta|propina|descuento|punto de venta|cuota/i.test(l))return;
    var nm=l.slice(0,m.index).replace(/^\d+([.,]\d+)?\s*(x|u|un)?\s+/i,"").replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑüÜ0-9 .\-\/%]/g," ").replace(/\s+/g," ").trim();
    if((nm.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]/g)||[]).length<2)return;
    items.push({name:nm,price:v})});
  return{items:items,total:tot}}
function scanUI(){return '<label class="btnl">📷 Escanear ticket con la cámara<input class="sr" type="file" accept="image/*" onchange="scan(this)"></label><p id="scs" class="mut" style="margin-bottom:8px">'+esc(draft.scan||"")+'</p>'}
function stat(t){if(draft)draft.scan=t;var e=document.getElementById("scs");if(e)e.textContent=t}
function scan(inp){
  var f=inp.files[0];inp.value="";if(!f)return;
  stat("Preparando imagen…");
  Promise.all([loadT(),prep(f)]).then(function(r){
    stat("Leyendo ticket… (la primera vez descarga el idioma)");
    return Tesseract.recognize(r[1],"spa",{logger:function(m){if(m.status==="recognizing text")stat("Leyendo ticket… "+Math.round(m.progress*100)+"%")}})})
  .then(function(r){
    var o=parseTicket(r.data.text);
    if(!o.items.length){stat("No pudimos leer ítems. Probá con más luz y el ticket bien plano, o cargalo a mano.");return}
    var sum=o.items.reduce(function(a,x){return a+x.price},0);
    draft.mode="items";
    draft.items=o.items.map(function(x){return{name:x.name,price:(x.price/100).toFixed(2).replace(".",","),to:[]}});
    draft.scan=o.total&&o.total!==sum?"Leímos "+o.items.length+" ítems por "+money(sum)+" y el ticket dice "+money(o.total)+". Revisá los precios.":"Leímos "+o.items.length+" ítems. Revisá nombres y precios antes de guardar.";
    render()})
  .catch(function(){stat("No se pudo leer la foto. Revisá tu conexión y probá de nuevo.")})}

function lk(){copy(location.href.split("#")[0]+"#"+cur,"Link copiado")}
function renderJoin(){document.getElementById("app").innerHTML='<div class="logo">'+LOGO+'Vaquita</div><h1>'+esc(joining.name)+'</h1><p class="mut">Te invitaron a este grupo. ¿Cómo te llamamos?</p><div class="card"><input id="jn" placeholder="Tu nombre o apodo"><button class="pri full" onclick="join()">Entrar al grupo</button></div>'}
function join(){var n=document.getElementById("jn").value.trim();if(!n)return;var g=joining;g.members.push({id:"m"+uid(),name:n,alias:""});S.groups.unshift(g);cur=g.id;save();render()}
function boot(){
  var id=location.hash.slice(1);
  if(!id||off()){render();return}
  if(S.groups.some(function(g){return g.id===id})){cur=id;render();pull();return}
  api("groups?id=eq."+encodeURIComponent(id)).then(function(r){
    if(!r[0]){toast("No encontramos ese grupo");render();return}
    joining=r[0].data;renderJoin()}).catch(function(){toast("No se pudo abrir el grupo");render()})}
boot();
setInterval(function(){if(cur&&!draft)pull()},5000);
