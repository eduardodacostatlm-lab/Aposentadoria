// Simulador de aposentadoria — 15% a.a. líquidos (compostos) e renda passiva 0,6% ao mês.
const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>document.querySelectorAll(sel);

function toNumber(str){
  if(str==null) return 0;
  const only = String(str).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",","."); 
  const num = parseFloat(only);
  return isNaN(num) ? 0 : num;
}
function currencyFmt(v){ return isNaN(v) ? "—" : v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

// Taxas
const r_annual = 0.15;
const r_monthly = Math.pow(1 + r_annual, 1/12) - 1; // composição mensal
const passive_rate = 0.006; // 0,6% ao mês

function monthsUntil(ageNow, ageRetire){
  const y = Math.max(0, (ageRetire - ageNow));
  return Math.round(y * 12);
}

// FV com aportes no fim do período (PMT ordinary annuity)
function futureValue(pv, pmt, i, n){
  const fvpv = pv * Math.pow(1+i, n);
  const fvpm = i===0 ? pmt*n : pmt * ( (Math.pow(1+i, n) - 1) / i );
  return fvpv + fvpm;
}

// PMT necessário para atingir um FV alvo
function requiredPMT(targetFV, pv, i, n){
  if(n<=0) return NaN;
  const a = Math.pow(1+i, n);
  const numer = (targetFV - pv * a) * i;
  const denom = (a - 1);
  if(denom<=0) return NaN;
  return numer / denom;
}

// Máscara simples de R$
function maskCurrencyInput(input){
  function format(){
    const raw = input.value.replace(/[^\d]/g,"");
    const number = (parseInt(raw,10)||0)/100;
    input.value = number.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  input.addEventListener('focus',()=>{ if(!input.value) input.value = "R$ 0,00"; });
  input.addEventListener('input', format);
  input.addEventListener('blur',()=>{ if(toNumber(input.value)===0) input.value=""; });
}

function setupMasks(){ 
  ["pv","pmt","income_goal"].forEach(id=> maskCurrencyInput(document.getElementById(id)));
}

function calc(){
  const ageNow = Math.floor(toNumber($("#age_now").value));
  const ageRet = Math.floor(toNumber($("#age_retire").value));
  const pv = toNumber($("#pv").value);
  const pmt = toNumber($("#pmt").value);
  const incomeGoal = toNumber($("#income_goal").value);

  if(!ageNow || !ageRet || ageRet<=ageNow){
    alert("Preencha idades válidas (a aposentadoria deve ser maior que a idade atual).");
    return;
  }
  const n = monthsUntil(ageNow, ageRet);

  // Se o usuário informou PMT, calcule o FV e a renda passiva estimada
  const fvWithPMT = futureValue(pv, pmt, r_monthly, n);
  const passiveFromFV = fvWithPMT * passive_rate;
  const needForGoal = incomeGoal>0 ? Math.max(0, incomeGoal - passiveFromFV) : 0;

  // Se o usuário informou meta de renda, calcule PMT necessário (independente do pmt atual)
  let pmtNeeded = NaN;
  let targetFV = NaN;
  if(incomeGoal>0){
    targetFV = incomeGoal / passive_rate;
    pmtNeeded = requiredPMT(targetFV, pv, r_monthly, n);
    if(pmtNeeded<0) pmtNeeded = 0; // já daria com o PV atual
  }

  // Preenche UI
  $("#kpiMonths").textContent = n.toLocaleString('pt-BR');
  $("#kpiYears").textContent = (n/12).toLocaleString('pt-BR', {maximumFractionDigits:1}) + " anos";

  $("#kpiFV").textContent = currencyFmt(fvWithPMT);
  $("#kpiPassive").textContent = currencyFmt(passiveFromFV);
  $("#kpiPMTNeed").textContent = isNaN(pmtNeeded) ? "—" : currencyFmt(pmtNeeded);
  $("#kpiGap").textContent = incomeGoal>0 ? ("Meta: " + currencyFmt(incomeGoal) + " • Gap: " + currencyFmt(needForGoal)) : "Sem meta informada";

  const tips = [];
  tips.push(`Horizonte de ${Math.round(n/12)} anos (${n} meses).`);
  tips.push(`Com ${currencyFmt(pmt||0)} por mês a ${ (r_monthly*100).toFixed(2).replace('.',',') }% a.m. (~15% a.a.), você projeta ${currencyFmt(fvWithPMT)}.`);
  tips.push(`Renda de ${currencyFmt(passiveFromFV)} a 0,6% a.m.`);
  if(incomeGoal>0){
    tips.push(`Para atingir renda de ${currencyFmt(incomeGoal)} (capital alvo ${currencyFmt(targetFV)}), o aporte mensal necessário seria ${currencyFmt(pmtNeeded||0)}.`);
  }
  $("#tips").innerHTML = tips.map(t=>`<div class="tip">💡 <strong>Sugestão:</strong> ${t}</div>`).join("");

  $("#results").hidden = false;
  persistLocal();
}

// Persistência local
function collectState(){
  const ids = ["age_now","age_retire","pv","pmt","income_goal"];
  const obj = {}; ids.forEach(id=> obj[id] = document.getElementById(id).value );
  return obj;
}
function applyState(obj){
  if(!obj) return;
  Object.entries(obj).forEach(([k,v])=>{
    const el = document.getElementById(k);
    if(el) el.value = v;
  });
}
function persistLocal(){ localStorage.setItem("aposentadoria-sim", JSON.stringify(collectState())); }
function loadLocal(){ try{ applyState(JSON.parse(localStorage.getItem("aposentadoria-sim"))); }catch{} }

document.addEventListener('DOMContentLoaded', ()=>{
  setupMasks(); loadLocal();
  $("#calc").addEventListener('click', calc);
  $("#clear").addEventListener('click', ()=>{ ["age_now","age_retire","pv","pmt","income_goal"].forEach(id=> document.getElementById(id).value=""); localStorage.removeItem("aposentadoria-sim"); $("#results").hidden = true; });
  $("#save").addEventListener('click', ()=>{ persistLocal(); alert("Dados salvos neste aparelho."); });
  $("#print").addEventListener('click', ()=> window.print());
});
