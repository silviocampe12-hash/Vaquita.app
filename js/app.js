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
function scanUI(){return '<div class="row" style="margin-bottom:6px"><button type="button" class="g1" onclick="abrirCamara()">📷 Escanear</button><label class="btnl g1" style="margin:0">🖼 Elegir foto<input class="sr" type="file" accept="image/*" onchange="scan(this)"></label></div><p id="scs" class="mut" style="margin-bottom:8px">'+esc(draft.scan||"")+'</p>'}
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