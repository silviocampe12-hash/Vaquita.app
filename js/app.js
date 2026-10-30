/* La clave anon es pública; nunca pegues aquí la clave service_role. */
var SB_URL="https://iktaiszcpbhhgtbxlsbs.supabase.co",SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdGFpc3pjcGJoaGd0Ynhsc2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjA4NDksImV4cCI6MjEwODkzNjg0OX0.aAOmVyGd_MmmAWK7NRHXK1tz-LF03KY0CNgWuMtbsYw";
var SB_ANON_KEY=SB_KEY;
var S={groups:[]},cur=null,tab="gastos",draft=null,toastT=null,joining=null,pushT=null;
try{S=JSON.parse(localStorage.getItem("vq"))||S}catch(e){}
function local(){try{localStorage.setItem("vq",JSON.stringify(S))}catch(e){}}
function save(){local();push()}
function off() {
  return (
    !SB_URL ||
    SB_URL.includes("TU-") ||
    !SB_ANON_KEY ||
    SB_ANON_KEY === "******" ||
    SB_ANON_KEY.startsWith("PEGAR_")
  );
}
function secureToken(){
  if(!window.crypto||!window.crypto.getRandomValues)throw new Error("Este navegador no permite crear enlaces seguros. Abrí Yuntiva con HTTPS.");
  var bytes=new Uint8Array(32);window.crypto.getRandomValues(bytes);
  var raw="";bytes.forEach(function(b){raw+=String.fromCharCode(b)});
  return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")
}
function api(action,token,data){
  var body={action:action,token:token};if(data)body.data=data;
  return fetch(SB_URL.replace(/\/+$/,"")+"/functions/v1/groups",{
    method:"POST",
    headers:{apikey:SB_ANON_KEY,Authorization:"Bearer "+SB_ANON_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  }).then(function(r){
    return r.text().then(function(text){
      var result={};try{result=text?JSON.parse(text):{}}catch(e){result={error:text||"Respuesta inválida"}}
      if(!r.ok)throw new Error(result.error||("HTTP "+r.status));
      return result
    })
  })
}
function groupData(g){
  var data=JSON.parse(JSON.stringify(g));delete data.shareToken;delete data.remote;return data
}
function merge(a,b){
  var del=(a.del||[]).concat(b.del||[]),ms={},es={};
  b.members.concat(a.members).forEach(function(m){ms[m.id]=m});
  b.expenses.concat(a.expenses).forEach(function(e){es[e.id]=e});
  a.members=Object.keys(ms).map(function(k){return ms[k]});
  a.expenses=Object.keys(es).filter(function(k){return del.indexOf(k)<0}).map(function(k){return es[k]}).sort(function(x,y){return x.id<y.id?-1:1});
  a.del=del.filter(function(v,i){return del.indexOf(v)===i});return a}
function pull(){
  var g=G();if(!g||off()||!g.shareToken)return Promise.resolve();
  return api("load",g.shareToken).then(function(r){
    if(!r.data)return;var before=JSON.stringify(g);merge(g,r.data);g.remote=true;
    if(JSON.stringify(g)!==before){local();if(!draft&&!/INPUT|SELECT/.test(document.activeElement.tagName))render()}
  })}
function push(){
  if(off())return;var g=G();if(!g)return;
  try{if(!g.shareToken)g.shareToken=secureToken()}catch(e){console.error(e);toast(e.message);return}
  clearTimeout(pushT);
  pushT=setTimeout(function(){
    pull().then(function(){return api("save",g.shareToken,groupData(g))})
      .then(function(){g.remote=true;local()})
      .catch(function(e){console.error("No se pudo sincronizar el grupo con Supabase:",e);toast("No se pudo sincronizar: "+e.message)})
  },400)}
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
var LOGO = '<img src="./img/logo.png" alt="Yuntiva" style="width:40px;height:40px;object-fit:contain;vertical-align:middle;">';

function render(){
  var a=document.getElementById("app");
  a.innerHTML=cur&&G()?group():home();
  var s=document.getElementById("sheet");if(s)s.remove();
  if(draft)document.body.insertAdjacentHTML("beforeend",sheet());
}

function home(){
  var h='<div class="logo">'+LOGO+'Yuntiva</div><h1>Dividí gastos sin vueltas</h1><p class="mut">Creá un grupo, cargá lo que pagó cada uno y mirá quién le transfiere a quién.</p>';
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

  h+='<footer class="mut" style="text-align:center;margin-top:24px"><a class="mut" href="privacidad.html">Privacidad</a> · <a class="mut" href="terminos.html">Términos</a></footer>';
  return h;
}

function mk(){
  var n=document.getElementById("gn").value.trim(),
      m=document.getElementById("gm").value.trim();
  if(!n||!m){toast("Poné el nombre del grupo y tu apodo");return}
  var g;
  try{g={id:uid()+uid(),shareToken:secureToken(),name:n,members:[{id:"m"+uid(),name:m,alias:""}],expenses:[],del:[]}}
  catch(e){console.error(e);toast(e.message);return}
  S.groups.unshift(g);save();op(g.id)
}

function borrarGrupo(id){
  var grupo = S.groups.find(function(g){
    return g.id === id;
  });

  if(!grupo) return;

  var fondo = document.createElement("div");
  fondo.className = "confirm-overlay";

  var cartel = document.createElement("div");
  cartel.className = "confirm-box";

  cartel.innerHTML =
    '<div class="confirm-icon">🗑</div>' +
    '<h2>Eliminar grupo</h2>' +
    '<p class="confirm-question">¿Querés eliminar este grupo?</p>' +
    '<p class="confirm-name"></p>' +
    '<p class="confirm-warning">Se eliminarán sus integrantes y gastos. Esta acción no se puede deshacer.</p>' +
    '<div class="confirm-actions">' +
      '<button type="button" class="confirm-cancel">Cancelar</button>' +
      '<button type="button" class="confirm-delete">Eliminar grupo</button>' +
    '</div>';

  cartel.querySelector(".confirm-name").textContent = grupo.name;

  fondo.appendChild(cartel);
  document.body.appendChild(fondo);

  function cerrar(){
    fondo.remove();
  }

  cartel.querySelector(".confirm-cancel").onclick = cerrar;

  fondo.addEventListener("click", function(e){
    if(e.target === fondo) cerrar();
  });

  cartel.querySelector(".confirm-delete").onclick = function(){
    cerrar();

    function removeLocal(){
      S.groups = S.groups.filter(function(g){
        return g.id !== id;
      });
      local();
      render();
      toast("Grupo eliminado");
    }

    if(grupo.remote && off()){
      toast("Configurá Supabase para revocar el enlace y borrar la copia remota");
      return;
    }

    if(!off() && grupo.shareToken){
      api("delete", grupo.shareToken)
        .then(removeLocal)
        .catch(function(e){
          console.error("No se pudo borrar el grupo de Supabase:", e);
          toast("No se pudo borrar el grupo compartido: " + e.message);
        });
    } else {
      removeLocal();
    }
  };
}

function op(id){
  var g=S.groups.find(function(x){return x.id===id});
  try{if(g&&!g.shareToken)g.shareToken=secureToken()}catch(e){console.error(e);toast(e.message);return}
  cur=id;tab="gastos";if(g)location.hash=g.shareToken;render();window.scrollTo(0,0);push()
}
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
    h+=al?'<div class="row" style="margin-top:10px"><button class="pri g1" data-alias="'+esc(al)+'" onclick="copy(this.dataset.alias,\'Alias copiado\')">Copiar alias: '+esc(al)+'</button><a href="https://www.mercadopago.com.ar" target="_blank" rel="noopener"><button>Mercado Pago</button></a></div>':'<p class="mut" style="margin-top:6px">'+esc(M(g,x.to))+' todavía no cargó su alias.</p>';
    h+='</div>'});
  if(g.expenses.length)h+='<button class="pri full" style="margin-top:14px" onclick="wa()">Copiar resumen para WhatsApp</button>';
  return h}
function wa(){
  var g=G(),d=debts(balances(g)),t="Resumen de Yuntiva: ["+g.name+"]\nTotal gastado: "+money(total(g))+"\n\nSaldos finales:\n";
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

/* ==========================================================================
   OCR DE TICKETS v2  —  REEMPLAZA todo desde "/* === OCR DE TICKETS" hasta
   justo ANTES de "function lk(){...}" en app.js.
   - 2 zonas: nombres (solo letras) y precios (solo números)
   - Escaneo con cámara (pide permiso) o foto de la galería, con zoom
   - Un solo worker de Tesseract reutilizado
   - Empareja nombre/precio por altura en el ticket, no por orden
   ========================================================================== */
var TJS="https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";
function loadT(){return new Promise(function(ok,no){if(window.Tesseract)return ok();var s=document.createElement("script");s.src=TJS;s.onload=ok;s.onerror=function(){no(new Error("cdn"))};document.head.appendChild(s)})}

/* Worker único (se crea la primera vez y se reutiliza) */
var WK=null;
function getW(){
  if(!WK)WK=loadT().then(function(){
    return Tesseract.createWorker("spa",1,{logger:function(m){if(m.status==="recognizing text")stat("Reconociendo texto… "+Math.round(m.progress*100)+"%")}})
  }).catch(function(e){WK=null;throw e});
  return WK}

/* Preproceso: agranda recortes chicos, agrega margen blanco, gris + contraste */
function prep(file){return new Promise(function(ok,no){
  var im=new Image(),u=URL.createObjectURL(file);
  im.onload=function(){
    var W=im.naturalWidth,H=im.naturalHeight,s=W<1000?Math.min(3,1000/W):Math.min(1,1800/W);
    s=Math.min(s,4000/H);
    var pad=24,w=Math.max(1,Math.round(W*s)),h=Math.max(1,Math.round(H*s)),c=document.createElement("canvas");
    c.width=w+pad*2;c.height=h+pad*2;
    var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
    x.imageSmoothingQuality="high";x.drawImage(im,pad,pad,w,h);
    var d=x.getImageData(0,0,c.width,c.height),p=d.data,hist=new Array(256).fill(0),i,g,n=c.width*c.height,lo=0,hi=255,a=0;
    for(i=0;i<p.length;i+=4){g=Math.round(.299*p[i]+.587*p[i+1]+.114*p[i+2]);p[i]=g;hist[g]++}
    for(i=0;i<256;i++){a+=hist[i];if(a>n*.02){lo=i;break}}
    a=0;for(i=255;i>=0;i--){a+=hist[i];if(a>n*.02){hi=i;break}}
    var k=255/Math.max(1,hi-lo);
    for(i=0;i<p.length;i+=4){g=Math.max(0,Math.min(255,(p[i]-lo)*k));p[i]=p[i+1]=p[i+2]=g}
    x.putImageData(d,0,0);URL.revokeObjectURL(u);
    c._s=s;c._pad=pad;ok(c)};
  im.onerror=function(){URL.revokeObjectURL(u);no(new Error("img"))};im.src=u})}

function num(s){
  s=String(s||"").trim().replace(/\$/g,"").replace(/\s/g,"");
  if(!s)return 0;
  if(s.indexOf(",")>-1)s=s.replace(/\./g,"").replace(",",".");
  else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,"");
  var n=parseFloat(s);return isNaN(n)?0:Math.round(n*100)}

/* ---------- Interfaz: cámara + foto ---------- */

/* ---------- Interfaz: cámara + foto ---------- */
function scanUI(){
    return '<div class="row" style="margin-bottom:6px">' +
        '<button type="button" class="g1" onclick="abrirCamara()">' +
        '<img src="./img/camara-de-fotos.png" alt="" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:6px;">' +
        'Escanear</button>' +
        '<label class="btnl g1" style="margin:0">' +
        '<img src="./img/subir.png" alt="" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:6px;">' +
        'Elegir foto<input class="sr" type="file" accept="image/*" onchange="scan(this)"></label>' +
        '</div><p id="scs" class="mut" style="margin-bottom:8px">' +
        esc(draft.scan||"") + '</p>';
}
function stat(t){if(draft)draft.scan=t;var e=document.getElementById("scs");if(e)e.textContent=t}
function scan(inp){var f=inp.files&&inp.files[0];inp.value="";if(!f)return;showTicketCrop(f)}

/* ---------- Cámara (pide permiso al abrir) ---------- */
var camStream=null;
function cerrarCamara(){
  if(camStream){camStream.getTracks().forEach(function(t){t.stop()});camStream=null}
  var m=document.getElementById("camModal");if(m)m.remove()}
function abrirCamara(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){stat("Este navegador no permite usar la cámara. Usá «Elegir foto».");return}
  stat("Pidiendo permiso de cámara…");
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false}).then(function(s){
    camStream=s;stat("");
    var bs="padding:14px 18px;border-radius:99px;border:0;font-weight:800;font-size:16px";
    var m=document.createElement("div");m.id="camModal";
    m.style.cssText="position:fixed;inset:0;z-index:99998;background:#000;display:flex;flex-direction:column";
    m.innerHTML='<video id="camVideo" autoplay playsinline muted style="flex:1;min-height:0;width:100%;object-fit:contain;background:#000"></video>'+
      '<p style="color:#ddd;text-align:center;font-size:13px;margin:8px 12px 0">Poné el ticket recto, con buena luz y que se lea bien.</p>'+
      '<div style="display:flex;gap:12px;justify-content:center;align-items:center;padding:12px 14px calc(14px + env(safe-area-inset-bottom,0px))">'+
      '<button id="camCancel" type="button" style="'+bs+';background:#333;color:#fff">Cancelar</button>'+
      '<button id="camShot" type="button" style="'+bs+';background:#00E676;color:#06371f">● Sacar foto</button></div>';
    document.body.appendChild(m);
    var v=m.querySelector("#camVideo");v.srcObject=s;var pl=v.play();if(pl&&pl.catch)pl.catch(function(){});
    m.querySelector("#camCancel").onclick=cerrarCamara;
    m.querySelector("#camShot").onclick=function(){
      if(!v.videoWidth){return}
      var c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);
      c.toBlob(function(b){
        if(!b){stat("No se pudo sacar la foto. Probá de nuevo.");return}
        cerrarCamara();showTicketCrop(b)
      },"image/jpeg",.92)};
  }).catch(function(e){
    var n=e&&e.name;
    stat(n==="NotAllowedError"||n==="SecurityError"?"Permiso de cámara denegado. Habilitalo en los ajustes del navegador para este sitio, o usá «Elegir foto».":
         n==="NotFoundError"||n==="OverconstrainedError"?"No se encontró una cámara en este dispositivo. Usá «Elegir foto».":
         "No se pudo abrir la cámara. Usá «Elegir foto».")})}

/* ---------- Selección de zonas (2 pasos) con zoom ---------- */
function showTicketCrop(file){seleccionarZonaTicket({file:file,paso:0,nombres:[],precios:[]})}
function seleccionarZonaTicket(f){
  var old=document.getElementById("ticketCropModal");if(old)old.remove();
  var pasos=[
    {titulo:"1 de 2: nombres de productos",ayuda:"Marcá solo la columna de nombres. Se leen únicamente letras."},
    {titulo:"2 de 2: precios",ayuda:"Marcá solo la columna de precios de los productos, sin el total. Se leen únicamente números."}
  ];
  var paso=pasos[f.paso],bs="padding:10px 12px;border-radius:8px;border:1px solid #ccc;background:white;color:#222;font-weight:600";
  var modal=document.createElement("div");modal.id="ticketCropModal";
  modal.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;padding:10px;overflow:auto;";
  modal.innerHTML='<div style="background:white;color:#222;border-radius:14px;padding:15px;width:100%;max-width:760px;max-height:96vh;overflow:auto;box-sizing:border-box">'+
    '<h2 style="margin:0 0 6px;font-size:20px">'+paso.titulo+'</h2><p style="margin:0 0 10px;font-size:14px">'+paso.ayuda+'</p>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
      '<button id="tcMenos" type="button" style="'+bs+'" aria-label="Alejar">−</button>'+
      '<input id="tcZoom" type="range" min="1" max="4" step="0.1" value="1" aria-label="Zoom" style="flex:1;margin:0;padding:0;border:0;background:none;width:auto">'+
      '<button id="tcMas" type="button" style="'+bs+'" aria-label="Acercar">+</button>'+
      '<button id="tcModo" type="button" style="'+bs+'">✋ Mover</button></div>'+
    '<div id="tcScroll" style="overflow:auto;max-height:54vh;border:1px solid #ddd;border-radius:8px;background:#111;-webkit-overflow-scrolling:touch">'+
      '<div id="ticketCropWrap" style="position:relative;width:100%;line-height:0">'+
        '<img id="ticketCropImage" alt="Ticket para seleccionar" style="display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none">'+
        '<div id="ticketCropLayer" style="position:absolute;inset:0;touch-action:none;cursor:crosshair"></div>'+
        '<div id="ticketCropRect" style="display:none;position:absolute;border:2px solid #16a34a;background:rgba(22,163,74,.18);pointer-events:none;box-sizing:border-box"></div>'+
      '</div></div>'+
    '<p id="ticketCropHint" style="font-size:13px;color:#555;margin:10px 0">Acercá con el zoom si hace falta y marcá la zona arrastrando.</p>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
      (f.paso>0?'<button id="ticketCropBack" type="button" style="'+bs+'">← Nombres</button>':'')+
      '<button id="ticketCropRetry" type="button" style="'+bs+'">Volver a marcar</button>'+
      '<button id="ticketCropCancel" type="button" style="'+bs+'">Cancelar</button>'+
      '<button id="ticketCropNext" type="button" disabled style="padding:10px 14px;border:0;border-radius:8px;background:#15803d;color:white;font-weight:700;opacity:.55">'+(f.paso===1?'Leer y combinar':'Leer esta zona')+'</button>'+
    '</div></div>';
  document.body.appendChild(modal);
  var $=function(id){return modal.querySelector("#"+id)};
  var img=$("ticketCropImage"),layer=$("ticketCropLayer"),rect=$("ticketCropRect"),hint=$("ticketCropHint"),next=$("ticketCropNext"),wrap=$("ticketCropWrap"),zoom=$("tcZoom"),modoBtn=$("tcModo");
  var startX=0,startY=0,sel=null,dragging=false,modo="marcar",z=1,objectUrl=URL.createObjectURL(f.file);
  function close(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;modal.remove()}
  function pos(x1,y1,x2,y2){rect.style.display="block";rect.style.left=Math.min(x1,x2)+"px";rect.style.top=Math.min(y1,y2)+"px";rect.style.width=Math.abs(x2-x1)+"px";rect.style.height=Math.abs(y2-y1)+"px"}
  function showSel(){if(!sel)return;var b=layer.getBoundingClientRect();pos(sel.x*b.width,sel.y*b.height,(sel.x+sel.w)*b.width,(sel.y+sel.h)*b.height)}
  function point(e){var b=layer.getBoundingClientRect();return{x:Math.max(0,Math.min(b.width,e.clientX-b.left)),y:Math.max(0,Math.min(b.height,e.clientY-b.top))}}
  function enable(on){next.disabled=!on;next.style.opacity=on?"1":".55"}
  function reset(){sel=null;dragging=false;rect.style.display="none";enable(false);hint.textContent=modo==="marcar"?"Arrastrá sobre la imagen para marcar la zona.":"Modo mover: deslizá la imagen. Tocá «✏️ Marcar» para dibujar la zona."}
  function setZoom(v){z=Math.max(1,Math.min(4,v));zoom.value=z;wrap.style.width=(z*100)+"%";showSel()}
  function setModo(m){modo=m;layer.style.pointerEvents=m==="marcar"?"auto":"none";modoBtn.textContent=m==="marcar"?"✋ Mover":"✏️ Marcar";
    if(!sel)hint.textContent=m==="marcar"?"Arrastrá sobre la imagen para marcar la zona.":"Modo mover: deslizá la imagen. Tocá «✏️ Marcar» para dibujar la zona."}
  zoom.oninput=function(){setZoom(parseFloat(zoom.value))};
  $("tcMas").onclick=function(){setZoom(z+0.5)};
  $("tcMenos").onclick=function(){setZoom(z-0.5)};
  modoBtn.onclick=function(){setModo(modo==="marcar"?"mover":"marcar")};
  layer.addEventListener("pointerdown",function(e){if(modo!=="marcar"||!img.naturalWidth)return;e.preventDefault();var p=point(e);startX=p.x;startY=p.y;dragging=true;sel=null;enable(false);layer.setPointerCapture(e.pointerId);pos(startX,startY,startX,startY)});
  layer.addEventListener("pointermove",function(e){if(!dragging)return;e.preventDefault();var p=point(e);pos(startX,startY,p.x,p.y)});
  layer.addEventListener("pointercancel",function(){if(dragging)reset()});
  layer.addEventListener("pointerup",function(e){
    if(!dragging)return;dragging=false;
    var p=point(e),b=layer.getBoundingClientRect(),left=Math.min(startX,p.x),top=Math.min(startY,p.y),width=Math.abs(p.x-startX),height=Math.abs(p.y-startY);
    if(width<12||height<12){reset();hint.textContent="La zona es muy pequeña. Dibujá un rectángulo más grande.";return}
    sel={x:left/b.width,y:top/b.height,w:width/b.width,h:height/b.height};
    showSel();enable(true);hint.textContent="Zona marcada. Revisá que incluya solo la información de este paso."});
  img.onload=reset;img.onerror=function(){hint.textContent="No se pudo abrir la imagen. Probá con otra foto."};img.src=objectUrl;
  $("ticketCropRetry").onclick=reset;$("ticketCropCancel").onclick=close;
  var back=$("ticketCropBack");if(back)back.onclick=function(){f.paso=0;close();seleccionarZonaTicket(f)};
  next.onclick=function(){
    if(!sel||!img.naturalWidth)return;
    var NW=img.naturalWidth,NH=img.naturalHeight,
        sx=Math.max(0,Math.round(sel.x*NW)),sy=Math.max(0,Math.round(sel.y*NH)),
        sw=Math.max(1,Math.min(Math.round(sel.w*NW),NW-sx)),sh=Math.max(1,Math.min(Math.round(sel.h*NH),NH-sy));
    var cv=document.createElement("canvas");cv.width=sw;cv.height=sh;cv.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
    next.disabled=true;hint.textContent="Leyendo esta zona…";
    cv.toBlob(function(blob){
      if(!blob){hint.textContent="No se pudo recortar la imagen. Probá de nuevo.";next.disabled=false;return}
      close();
      var m=f.paso===0?"nombres":"precios";
      stat("Leyendo "+m+" del ticket…");
      leerZonaTicket(blob,m).then(function(ls){
        ls.forEach(function(l){if(l.y!=null)l.y+=sy});   /* y absoluta en la foto original */
        if(f.paso===0){f.nombres=extraerNombresTicket(ls);f.paso=1;seleccionarZonaTicket(f)}
        else{f.precios=extraerPreciosTicket(ls);finalizarLecturaTicket(f)}
      }).catch(function(err){console.error(err);stat("No se pudo leer esta zona. Revisá la conexión y volvé a escanear el ticket.")})
    },"image/png")};
}

/* ---------- OCR: solo letras / solo números, con posición vertical ---------- */
var LETRAS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÜÑáéíóúüñ ";
function leerZonaTicket(blob,modo){
  var wl=modo==="precios"?"0123456789.,$ ":LETRAS;
  return Promise.all([getW(),prep(blob)]).then(function(r){
    var w=r[0],c=r[1];
    return w.setParameters({tessedit_pageseg_mode:"6",tessedit_char_whitelist:wl,preserve_interword_spaces:"1"})
      .then(function(){return w.recognize(c)})
      .then(function(res){
        var d=res.data,ls=[];
        (d.lines||[]).forEach(function(l){var t=(l.text||"").trim();if(t&&l.bbox)ls.push({t:t,y:((l.bbox.y0+l.bbox.y1)/2-c._pad)/c._s})});
        if(!ls.length)(d.text||"").split(/\r?\n/).forEach(function(t){t=t.trim();if(t)ls.push({t:t,y:null})});
        return ls})})}

var NOPROD=/total|subtotal|\biva\b|cuit|cuil|fecha|hora|factura|ticket|comprobante|efectivo|tarjeta|d[eé]bito|cr[eé]dito|vuelto|cambio|descuento|mercado pago|punto de venta|ingresos brutos|responsable inscripto|gracias/i;
function limpiarNombre(t){return String(t||"").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g," ").replace(/\s+/g," ").trim()}
function extraerNombresTicket(ls){
  var out=[];
  ls.forEach(function(l){
    var t=limpiarNombre(l.t);
    if((t.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g)||[]).length<2)return;
    if(NOPROD.test(t))return;
    out.push({t:t,y:l.y})});
  return out}
function limpiarPrecio(t){
  t=String(t||"").replace(/[Oo]/g,"0").replace(/[lI|]/g,"1").replace(/S/g,"5").replace(/B/g,"8").replace(/[^0-9.,\s]/g,"").replace(/\s+/g," ").trim();
  var m=t.match(/^(\d[\d.]*)\s(\d{2})$/);          /* "1234 50" -> "1234,50" */
  if(m)return m[1]+","+m[2];
  var tk=t.split(" ");return tk[tk.length-1]||""}
function extraerPreciosTicket(ls){
  var out=[];
  ls.forEach(function(l){var v=num(limpiarPrecio(l.t));if(v>0&&v<100000000)out.push({v:v,y:l.y})});
  return out}

/* ---------- Combinar: empareja por altura (o por orden si no hay posiciones) ---------- */
function combinar(nom,pre){
  var items=[],sinPrecio=0,sinNombre=0;
  var conY=nom.length&&pre.length&&nom.every(function(n){return n.y!=null})&&pre.every(function(p){return p.y!=null});
  if(conY){
    var ys=nom.map(function(n){return n.y}).sort(function(a,b){return a-b}),df=[];
    for(var i=1;i<ys.length;i++)df.push(ys[i]-ys[i-1]);
    df.sort(function(a,b){return a-b});
    var med=df.length?df[Math.floor(df.length/2)]:40,tol=Math.max(12,med*.6),pairs=[];
    nom.forEach(function(n,a){pre.forEach(function(p,b){var d=Math.abs(n.y-p.y);if(d<=tol)pairs.push([d,a,b])})});
    pairs.sort(function(x,y){return x[0]-y[0]});
    var np={},pn={};
    pairs.forEach(function(q){if(np[q[1]]===undefined&&pn[q[2]]===undefined){np[q[1]]=q[2];pn[q[2]]=q[1]}});
    nom.forEach(function(n,a){var ok=np[a]!==undefined;if(!ok)sinPrecio++;items.push({name:n.t,price:ok?pre[np[a]].v:0,y:n.y})});
    pre.forEach(function(p,b){if(pn[b]===undefined){sinNombre++;items.push({name:"Ítem",price:p.v,y:p.y})}});
    items.sort(function(a,b){return a.y-b.y})}
  else{
    var n=Math.max(nom.length,pre.length);
    for(var k=0;k<n;k++){
      var a=nom[k],b=pre[k];
      if(!a)sinNombre++;if(!b)sinPrecio++;
      items.push({name:a?a.t:"Ítem",price:b?b.v:0})}}
  return{items:items,sinPrecio:sinPrecio,sinNombre:sinNombre,porAltura:!!conY}}

function finalizarLecturaTicket(f){
  if(!f.nombres.length){stat("No pudimos reconocer nombres de productos. Probá con otra foto, acercando más la zona, o cargalos manualmente.");return}
  if(!f.precios.length){stat("No pudimos reconocer precios. Volvé a escanear y marcá bien la columna de precios.");return}
  var r=combinar(f.nombres,f.precios),items=r.items,quitado=false;
  /* Si el precio más alto es la suma de los demás, es el total del ticket: se descarta */
  if(items.length>2){
    var tot=0,mx=0,mi=-1;
    items.forEach(function(x,i){tot+=x.price;if(x.price>mx){mx=x.price;mi=i}});
    if(mi>-1&&Math.abs(mx*2-tot)<=100){items.splice(mi,1);quitado=true}}
  if(!items.length){stat("No se pudieron combinar nombres y precios. Probá con otra foto.");return}
  draft.mode="items";
  draft.items=items.map(function(x){return{name:x.name,price:x.price?(x.price/100).toFixed(2).replace(".",","):"",to:[]}});
  var av=[];
  if(r.sinPrecio)av.push(r.sinPrecio+" producto(s) quedaron sin precio: completalos");
  if(r.sinNombre)av.push(r.sinNombre+" precio(s) quedaron como «Ítem»: ponele nombre");
  if(!r.porAltura)av.push("se combinaron por orden, revisá que cada precio corresponda a su producto");
  if(quitado)av.push("se descartó el total del ticket");
  draft.scan="Leímos "+items.length+" ítems"+(av.length?". ATENCIÓN: "+av.join(". "):"")+". Revisá nombres y precios antes de guardar.";
  render()}


function lk(){
  var g=G();if(!g)return;
  if(off()){toast("Supabase todavía no está configurado; no se puede compartir el grupo");return}
  try{if(!g.shareToken)g.shareToken=secureToken()}catch(e){console.error(e);toast(e.message);return}
  clearTimeout(pushT);
  pull().then(function(){return api("save",g.shareToken,groupData(g))})
    .then(function(){g.remote=true;local();copy(location.href.split("#")[0]+"#"+g.shareToken,"Link copiado")})
    .catch(function(e){console.error("No se pudo preparar el enlace compartido:",e);toast("No se pudo guardar el grupo: "+e.message)})
}
function renderJoin(){document.getElementById("app").innerHTML='<div class="logo">'+LOGO+'Yuntiva</div><h1>'+esc(joining.name)+'</h1><p class="mut">Te invitaron a este grupo. ¿Cómo te llamamos?</p><div class="card"><input id="jn" placeholder="Tu nombre o apodo"><button class="pri full" onclick="join()">Entrar al grupo</button></div>'}
function join(){var n=document.getElementById("jn").value.trim();if(!n)return;var g=joining;g.members.push({id:"m"+uid(),name:n,alias:""});S.groups.unshift(g);cur=g.id;save();render()}
function boot(){
  var token=location.hash.slice(1);
  if(!token){render();return}
  var existing=S.groups.find(function(g){return g.shareToken===token});
  if(!existing){
    existing=S.groups.find(function(g){return g.id===token&&!g.shareToken});
    if(existing){
      try{existing.shareToken=secureToken()}catch(e){console.error(e);toast(e.message);render();return}
      location.hash=existing.shareToken;cur=existing.id;render();push();return
    }
  }
  if(existing){cur=existing.id;render();pull().catch(function(e){console.error("No se pudo actualizar el grupo:",e);toast("No se pudo sincronizar: "+e.message)});return}
  if(off()){render();toast("Supabase no está configurado para abrir enlaces compartidos");return}
  api("load",token).then(function(r){
    if(!r.data){toast("No encontramos ese grupo o el enlace fue revocado");render();return}
    joining=r.data;joining.shareToken=token;joining.remote=true;renderJoin()
  }).catch(function(e){console.error("No se pudo abrir el grupo compartido:",e);toast("No se pudo abrir el grupo: "+e.message);render()})}
boot();
setInterval(function(){if(cur&&!draft)pull().catch(function(e){console.error("No se pudo actualizar el grupo:",e)})},5000);
