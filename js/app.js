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

function mk(){
  var n=document.getElementById("gn").value.trim(),
      m=document.getElementById("gm").value.trim();
  if(!n||!m){toast("Poné el nombre del grupo y tu apodo");return}
  var g={id:uid()+uid(),name:n,members:[{id:"m"+uid(),name:m,alias:""}],expenses:[],del:[]};
  S.groups.unshift(g);save();op(g.id)
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

/* ==========================================================
   OCR DE TICKETS — VAQUITA
   Reconocimiento español + inglés.
   Mejora de contraste, lectura de precios y asociación
   de productos por posición vertical.
   ========================================================== */

var TJS = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";

function loadT() {
  return new Promise(function (ok, no) {
    if (window.Tesseract) return ok();

    var s = document.createElement("script");
    s.src = TJS;
    s.onload = ok;
    s.onerror = function () {
      no(new Error("No se pudo cargar Tesseract.js"));
    };

    document.head.appendChild(s);
  });
}

/* Reutiliza un único worker para evitar crearlo en cada lectura. */
var WK = null;

function getW() {
  if (!WK) {
    WK = loadT()
      .then(function () {
        return Tesseract.createWorker("spa+eng", 1, {
          logger: function (m) {
            if (m.status === "recognizing text") {
              stat(
                "Reconociendo texto… " +
                Math.round(m.progress * 100) +
                "%"
              );
            }
          }
        });
      })
      .catch(function (e) {
        WK = null;
        throw e;
      });
  }

  return WK;
}

/* Agranda la imagen y mejora el contraste antes de leerla. */
function prep(file) {
  return new Promise(function (ok, no) {
    var im = new Image();
    var u = URL.createObjectURL(file);

    im.onload = function () {
      try {
        var W = im.naturalWidth;
        var H = im.naturalHeight;

        var s = W < 1000
          ? Math.min(3, 1000 / W)
          : Math.min(1, 1800 / W);

        s = Math.min(s, 4000 / H);

        var pad = 24;
        var w = Math.max(1, Math.round(W * s));
        var h = Math.max(1, Math.round(H * s));

        var c = document.createElement("canvas");
        c.width = w + pad * 2;
        c.height = h + pad * 2;

        var x = c.getContext("2d");
        x.fillStyle = "#fff";
        x.fillRect(0, 0, c.width, c.height);

        x.imageSmoothingQuality = "high";
        x.drawImage(im, pad, pad, w, h);

        var d = x.getImageData(0, 0, c.width, c.height);
        var p = d.data;
        var hist = new Array(256).fill(0);
        var i, g;
        var n = c.width * c.height;
        var lo = 0, hi = 255, a = 0;

        /* Convertir a escala de grises y calcular histograma. */
        for (i = 0; i < p.length; i += 4) {
          g = Math.round(
            0.299 * p[i] +
            0.587 * p[i + 1] +
            0.114 * p[i + 2]
          );

          p[i] = g;
          hist[g]++;
        }

        /* Buscar límites de contraste evitando valores extremos. */
        for (i = 0; i < 256; i++) {
          a += hist[i];

          if (a > n * 0.02) {
            lo = i;
            break;
          }
        }

        a = 0;

        for (i = 255; i >= 0; i--) {
          a += hist[i];

          if (a > n * 0.02) {
            hi = i;
            break;
          }
        }

        var k = 255 / Math.max(1, hi - lo);

        for (i = 0; i < p.length; i += 4) {
          g = Math.max(
            0,
            Math.min(255, (p[i] - lo) * k)
          );

          p[i] = g;
          p[i + 1] = g;
          p[i + 2] = g;
        }

        x.putImageData(d, 0, 0);

        c._s = s;
        c._pad = pad;

        URL.revokeObjectURL(u);
        ok(c);

      } catch (e) {
        URL.revokeObjectURL(u);
        no(e);
      }
    };

    im.onerror = function () {
      URL.revokeObjectURL(u);
      no(new Error("No se pudo abrir la imagen"));
    };

    im.src = u;
  });
}

/*
  Convierte precios a centavos.

  Ejemplos:
  "1250"     -> 125000
  "1.250"    -> 125000
  "1.250,50" -> 125050
  "1250,50"  -> 125050
  "12,50"    -> 1250

  IMPORTANTE:
  El punto seguido de tres cifras se interpreta como separador
  de miles, habitual en tickets argentinos.
*/
function num(s) {
  s = String(s || "")
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/[^0-9.,-]/g, "");

  if (!s || !/[0-9]/.test(s)) return 0;

  var negativo = s.charAt(0) === "-";
  s = s.replace(/-/g, "");

  var coma = s.lastIndexOf(",");
  var punto = s.lastIndexOf(".");
  var decimal = "";
  var entero = "";

  if (coma >= 0) {
    var despues = s.length - coma - 1;

    if (despues === 3 && punto < 0) {
      entero = s.replace(/,/g, "");
    } else {
      entero = s.slice(0, coma).replace(/[.,]/g, "");
      decimal = s.slice(coma + 1)
        .replace(/[^0-9]/g, "")
        .slice(0, 2);
    }

  } else if (punto >= 0) {
    var dp = s.length - punto - 1;
    var puntos = (s.match(/\./g) || []).length;

    if (dp === 3 || puntos > 1) {
      entero = s.replace(/\./g, "");
    } else {
      entero = s.slice(0, punto).replace(/\./g, "");
      decimal = s.slice(punto + 1)
        .replace(/[^0-9]/g, "")
        .slice(0, 2);
    }

  } else {
    entero = s.replace(/[^0-9]/g, "");
  }

  var n = parseInt(entero || "0", 10);

  if (!isFinite(n)) return 0;

  var cent = parseInt((decimal + "00").slice(0, 2), 10) || 0;
  var total = n * 100 + cent;

  return negativo ? -total : total;
}

/* Lee una zona seleccionada del ticket. */
function leerZonaTicket(blob, modo) {
  var wl = modo === "precios"
    ? "0123456789.,$OoIl|SB "
    : "";

  return Promise.all([
    getW(),
    prep(blob)
  ]).then(function (r) {
    var w = r[0];
    var c = r[1];

    return w.setParameters({
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist: wl,
      preserve_interword_spaces: "1"
    }).then(function () {
      return w.recognize(c);
    }).then(function (res) {
      var d = res.data;
      var ls = [];

      (d.lines || []).forEach(function (l) {
        var t = (l.text || "").trim();

        if (t && l.bbox) {
          ls.push({
            t: t,
            y: (
              (l.bbox.y0 + l.bbox.y1) / 2 - c._pad
            ) / c._s
          });
        }
      });

      if (!ls.length) {
        (d.text || "").split(/\r?\n/).forEach(function (t) {
          t = t.trim();

          if (t) {
            ls.push({
              t: t,
              y: null
            });
          }
        });
      }

      return ls;
    });
  });
}

/* Palabras que suelen pertenecer al encabezado o pie del ticket. */
var NOPROD =
  /total|subtotal|\biva\b|cuit|cuil|fecha|hora|factura|ticket|comprobante|efectivo|tarjeta|d[eé]bito|cr[eé]dito|vuelto|cambio|descuento|mercado pago|punto de venta|ingresos brutos|responsable inscripto|gracias/i;

function limpiarNombre(t) {
  return String(t || "")
    .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ&+.'’\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerNombresTicket(ls) {
  var out = [];

  ls.forEach(function (l) {
    var t = limpiarNombre(l.t);

    if (
      (t.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length < 2
    ) {
      return;
    }

    if (NOPROD.test(t)) return;

    out.push({
      t: t,
      y: l.y
    });
  });

  return out;
}

/*
  Corrige algunos errores frecuentes del OCR en precios:
  O -> 0
  I, l, | -> 1
  S -> 5
  B -> 8
*/
function limpiarPrecio(t) {
  t = String(t || "")
    .replace(/[$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return "";

  var tokens = t.match(
    /[0-9OoIl|SB][0-9OoIl|SB., ]*[0-9OoIl|SB]|[0-9OoIl|SB]+(?:[.,][0-9OoIl|SB]{1,3})?/g
  ) || [];

  var candidatos = [];

  tokens.forEach(function (token) {
    token = token.trim();

    if (!/[0-9]/.test(token)) return;

    token = token
      .replace(/[Oo]/g, "0")
      .replace(/[Il|]/g, "1")
      .replace(/S/g, "5")
      .replace(/B/g, "8")
      .replace(/\s/g, "");

    if (/[0-9]/.test(token)) {
      candidatos.push(token);
    }
  });

  return candidatos.length
    ? candidatos[candidatos.length - 1]
    : "";
}

function extraerPreciosTicket(ls) {
  var out = [];

  ls.forEach(function (l) {
    var v = num(limpiarPrecio(l.t));

    if (v > 0 && v < 100000000) {
      out.push({
        v: v,
        y: l.y
      });
    }
  });

  return out;
}

/*
  Empareja nombres y precios usando su posición vertical.

  Si no hay posiciones fiables, evita inventar asociaciones:
  deja los datos separados para que el usuario los revise.
*/
function combinar(nom, pre) {
  var items = [];
  var sinPrecio = 0;
  var sinNombre = 0;

  var conY =
    nom.length > 0 &&
    pre.length > 0 &&
    nom.every(function (n) {
      return Number.isFinite(n.y);
    }) &&
    pre.every(function (p) {
      return Number.isFinite(p.y);
    });

  if (!conY) {
    nom.forEach(function (n) {
      items.push({
        name: n.t,
        price: 0
      });

      sinPrecio++;
    });

    pre.forEach(function (p) {
      items.push({
        name: "Ítem",
        price: p.v
      });

      sinNombre++;
    });

    return {
      items: items,
      sinPrecio: sinPrecio,
      sinNombre: sinNombre,
      porAltura: false
    };
  }

  var ns = nom.slice().sort(function (a, b) {
    return a.y - b.y;
  });

  var ps = pre.slice().sort(function (a, b) {
    return a.y - b.y;
  });

  var ys = ns.map(function (n) {
    return n.y;
  });

  var df = [];

  for (var k = 1; k < ys.length; k++) {
    var delta = ys[k] - ys[k - 1];

    if (delta > 0) df.push(delta);
  }

  df.sort(function (a, b) {
    return a - b;
  });

  var med = df.length
    ? df[Math.floor(df.length / 2)]
    : 36;

  var maxPair = Math.max(14, Math.min(100, med * 0.9));
  var skipCost = maxPair * 0.85;

  var n = ns.length;
  var m = ps.length;
  var dp = [];
  var act = [];

  for (var i = 0; i <= n; i++) {
    dp[i] = [];
    act[i] = [];

    for (var j = 0; j <= m; j++) {
      dp[i][j] = Infinity;
      act[i][j] = "";
    }
  }

  dp[0][0] = 0;

  /*
    Programación dinámica:
    evalúa las asociaciones posibles y evita depender únicamente
    del orden en que el OCR haya devuelto las líneas.
  */
  for (var i = 0; i <= n; i++) {
    for (var j = 0; j <= m; j++) {
      var base = dp[i][j];

      if (!isFinite(base)) continue;

      if (
        i < n &&
        base + skipCost < dp[i + 1][j]
      ) {
        dp[i + 1][j] = base + skipCost;
        act[i + 1][j] = "n";
      }

      if (
        j < m &&
        base + skipCost < dp[i][j + 1]
      ) {
        dp[i][j + 1] = base + skipCost;
        act[i][j + 1] = "p";
      }

      if (i < n && j < m) {
        var dist = Math.abs(ns[i].y - ps[j].y);

        if (
          dist <= maxPair &&
          base + dist < dp[i + 1][j + 1]
        ) {
          dp[i + 1][j + 1] = base + dist;
          act[i + 1][j + 1] = "x";
        }
      }
    }
  }

  var matches = [];
  var usedN = {};
  var usedP = {};
  var i = n;
  var j = m;

  while (i > 0 || j > 0) {
    var op = act[i][j];

    if (op === "x") {
      matches.push([i - 1, j - 1]);
      usedN[i - 1] = true;
      usedP[j - 1] = true;
      i--;
      j--;

    } else if (op === "n") {
      i--;

    } else if (op === "p") {
      j--;

    } else {
      if (i > 0) i--;
      else if (j > 0) j--;
    }
  }

  matches.forEach(function (pair) {
    var ni = pair[0];
    var pi = pair[1];
    var dist = Math.abs(ns[ni].y - ps[pi].y);

    items.push({
      name: ns[ni].t,
      price: ps[pi].v,
      y: ns[ni].y,
      revision: dist > maxPair * 0.65
    });
  });

  ns.forEach(function (x, k) {
    if (!usedN[k]) {
      items.push({
        name: x.t,
        price: 0,
        y: x.y
      });

      sinPrecio++;
    }
  });

  ps.forEach(function (x, k) {
    if (!usedP[k]) {
      items.push({
        name: "Ítem",
        price: x.v,
        y: x.y
      });

      sinNombre++;
    }
  });

  items.sort(function (a, b) {
    return (a.y == null ? Infinity : a.y) -
      (b.y == null ? Infinity : b.y);
  });

  return {
    items: items,
    sinPrecio: sinPrecio,
    sinNombre: sinNombre,
    porAltura: true
  };
}

/* Pasa los resultados al formulario de revisión de Vaquita. */
function finalizarLecturaTicket(f) {
  if (!f.nombres.length) {
    stat(
      "No pudimos reconocer nombres de productos. " +
      "Probá con otra foto, acercando más la zona, " +
      "o cargalos manualmente."
    );

    return;
  }

  if (!f.precios.length) {
    stat(
      "No pudimos reconocer precios. Volvé a escanear " +
      "y marcá bien la columna de precios."
    );

    return;
  }

  var r = combinar(f.nombres, f.precios);
  var items = r.items;

  /*
    No se elimina automáticamente el precio más alto.
    Podría ser el importe legítimo de un producto.
  */
  var suma = items.reduce(function (a, x) {
    return a + (x.price || 0);
  }, 0);

  var maximo = items.reduce(function (a, x) {
    return Math.max(a, x.price || 0);
  }, 0);

  var posibleTotal =
    items.length > 2 &&
    maximo > 0 &&
    Math.abs(maximo * 2 - suma) <= 100;

  if (!items.length) {
    stat(
      "No se pudieron combinar nombres y precios. " +
      "Probá con otra foto."
    );

    return;
  }

  draft.mode = "items";

  draft.items = items.map(function (x) {
    return {
      name: x.name,
      price: x.price
        ? (x.price / 100).toFixed(2).replace(".", ",")
        : "",
      to: []
    };
  });

  var av = [];

  if (r.sinPrecio) {
    av.push(
      r.sinPrecio +
      " producto(s) quedaron sin precio: completalos"
    );
  }

  if (r.sinNombre) {
    av.push(
      r.sinNombre +
      " precio(s) quedaron como «Ítem»: ponele nombre"
    );
  }

  if (!r.porAltura) {
    av.push(
      "se combinaron sin posiciones fiables; revisá " +
      "que cada precio corresponda a su producto"
    );
  }

  if (posibleTotal) {
    av.push(
      "hay un importe que podría ser el total del ticket; " +
      "no se eliminó automáticamente, revisalo"
    );
  }

  if (items.some(function (x) {
    return x.revision;
  })) {
    av.push(
      "algunas asociaciones nombre/precio tienen " +
      "una diferencia de altura mayor; revisalas"
    );
  }

  draft.scan =
    "Leímos " +
    items.length +
    " ítems" +
    (av.length
      ? ". ATENCIÓN: " + av.join(". ")
      : "") +
    ". Revisá nombres y precios antes de guardar.";

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
