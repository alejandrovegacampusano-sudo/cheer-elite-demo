const categories = [
  {id:'mini', icon:'⭐', name:'Mini', description:'4 a 6 años · nivel iniciación.', ageMin:4, ageMax:6, price:22000, tag:'Iniciación'},
  {id:'youth', icon:'🎀', name:'Youth', description:'7 a 10 años · nivel 1.', ageMin:7, ageMax:10, price:26000},
  {id:'junior', icon:'🤸', name:'Junior', description:'11 a 14 años · nivel 2-3.', ageMin:11, ageMax:14, price:30000},
  {id:'senior', icon:'🏆', name:'Senior', description:'15 a 18 años · nivel 4-5, competitivo.', ageMin:15, ageMax:18, price:34000, tag:'Competitivo'}
];

const teamsByCategory = {
  mini:[{id:'mini-a',name:'Mini A',schedule:'Mar y Jue 17:00'}],
  youth:[{id:'youth-a',name:'Youth A',schedule:'Lun, Mié y Vie 17:30'},{id:'youth-b',name:'Youth B',schedule:'Mar y Jue 18:00'}],
  junior:[{id:'junior-a',name:'Junior A',schedule:'Lun a Vie 18:30'},{id:'junior-b',name:'Junior B',schedule:'Mar, Jue y Sáb 10:00'}],
  senior:[{id:'senior-elite',name:'Senior Elite',schedule:'Lun a Vie 19:30'}]
};

const enrollmentFee = 15000;

const state = {category:null, team:null, athlete:null, enrollment:null};
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);

function renderCategories(){
  $('#category-grid').innerHTML = categories.map(cat => `
    <button type="button" class="category-card ${state.category?.id===cat.id?'selected':''}" data-category="${cat.id}">
      ${cat.tag?`<span class="popular">${cat.tag}</span>`:''}
      <div class="cat-top"><span class="cat-icon">${cat.icon}</span></div>
      <h3>${cat.name}</h3><p>${cat.description}</p>
      <div class="cat-meta"><span>${cat.ageMin}-${cat.ageMax} años</span><strong>${money(cat.price)}/mes</strong></div>
    </button>`).join('');
  $$('.category-card').forEach(card => card.addEventListener('click', () => {
    state.category = categories.find(c => c.id === card.dataset.category);
    state.team = null;
    $$('.category-card').forEach(x => x.classList.toggle('selected', x === card));
    renderTeams();
    updateToFicha();
  }));
}

function renderTeams(){
  if(!state.category){ $('#team-subsection').hidden = true; return; }
  $('#team-subsection').hidden = false;
  const teams = teamsByCategory[state.category.id];
  $('#team-row').innerHTML = teams.map(team => `
    <button type="button" class="team-chip ${state.team?.id===team.id?'selected':''}" data-team="${team.id}">
      <strong>${team.name}</strong><span>${team.schedule}</span>
    </button>`).join('');
  $$('.team-chip').forEach(chip => chip.addEventListener('click', () => {
    state.team = teams.find(t => t.id === chip.dataset.team);
    $$('.team-chip').forEach(x => x.classList.toggle('selected', x === chip));
    updateToFicha();
  }));
}

function updateToFicha(){
  $('#to-ficha').disabled = !(state.category && state.team);
}

let currentStep = 1;
function go(step){
  currentStep = step;
  $$('.panel').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.panel) === step));
  $$('.step').forEach((item, index) => {
    item.classList.toggle('active', index + 1 === Math.min(step, 3));
    item.classList.toggle('done', index + 1 < step);
  });
  $('#enroll-shell').scrollIntoView({behavior:'smooth', block:'start'});
}

function escapeHtml(value){const div=document.createElement('div');div.textContent=value;return div.innerHTML}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}

function validateAthlete(){
  const name=$('#athlete-name').value.trim();
  const birth=$('#athlete-birth').value;
  const parentName=$('#parent-name').value.trim();
  const parentPhone=$('#parent-phone').value.replace(/\D/g,'');
  const medical=$('#athlete-medical').value.trim();
  const emergency=$('#emergency-contact').value.trim();
  if(name.length<3){showToast('Escribe el nombre de la deportista.');return false}
  if(!birth){showToast('Ingresa la fecha de nacimiento.');return false}
  if(parentName.length<3){showToast('Escribe el nombre del apoderado.');return false}
  if(parentPhone.length<8){showToast('Revisa el WhatsApp del apoderado.');return false}
  if(!$('#terms').checked){showToast('Debes autorizar la participación.');return false}
  state.athlete={name,birth,parentName,parentPhone,medical,emergency};
  return true;
}

function renderReview(){
  const total = state.category.price + enrollmentFee;
  $('#review-card').innerHTML = `
    <div class="review-row"><span>Deportista</span><strong>${escapeHtml(state.athlete.name)}</strong></div>
    <div class="review-row"><span>Categoría</span><strong>${state.category.name} · ${state.team.name}</strong></div>
    <div class="review-row"><span>Horario</span><strong>${state.team.schedule}</strong></div>
    <div class="review-row"><span>Apoderado</span><strong>${escapeHtml(state.athlete.parentName)} · +56 ${escapeHtml(state.athlete.parentPhone)}</strong></div>
    <div class="review-row"><span>Matrícula</span><strong>${money(enrollmentFee)} (única vez)</strong></div>
    <div class="review-row"><span>Mensualidad</span><strong>${money(state.category.price)}</strong></div>
    <div class="review-row"><span>Total hoy</span><strong>${money(total)}</strong></div>
  `;
}

function confirmEnrollment(){
  state.enrollment = {
    id:`CE-${Date.now().toString().slice(-6)}`,
    createdAt:new Date().toISOString(),
    category:state.category, team:state.team, athlete:state.athlete,
    monthly:state.category.price, enrollmentFee
  };
  const enrollments = JSON.parse(localStorage.getItem('cheer-enrollments')||'[]');
  enrollments.push(state.enrollment);
  localStorage.setItem('cheer-enrollments', JSON.stringify(enrollments));
  $('#success-name').textContent = state.athlete.name.split(' ')[0];
  $('#success-summary').innerHTML = `<strong>${state.category.name} · ${state.team.name}</strong><span>${state.team.schedule} · ${money(state.category.price)}/mes</span>`;
  $('#enroll-code').textContent = `Código de inscripción ${state.enrollment.id}`;
  go(4);
}

function resetEnroll(){
  state.category=null; state.team=null; state.athlete=null; state.enrollment=null;
  $('#athlete-form').reset();
  renderCategories(); renderTeams(); updateToFicha();
  go(1);
}

const sampleAthletes = [
  {name:'Martina Vega', category:'Junior', team:'Junior A', status:'ok'},
  {name:'Antonella Rojas', category:'Youth', team:'Youth A', status:'ok'},
  {name:'Fernanda Soto', category:'Senior', team:'Senior Elite', status:'pending'},
  {name:'Josefa Muñoz', category:'Mini', team:'Mini A', status:'ok'},
  {name:'Valentina Díaz', category:'Junior', team:'Junior B', status:'pending'},
  {name:'Camila Pérez', category:'Youth', team:'Youth B', status:'ok'}
];

function allAthletes(){
  const stored = JSON.parse(localStorage.getItem('cheer-enrollments')||'[]').map(e => ({
    name:e.athlete.name, category:e.category.name, team:e.team.name, status:'ok', isNew:true
  }));
  return [...stored, ...sampleAthletes];
}

let activeTeamFilter = 'all';

function renderDashboard(){
  const athletes = allAthletes();
  const okCount = athletes.filter(a=>a.status==='ok').length;
  const pendingCount = athletes.length - okCount;
  const income = athletes.filter(a=>a.status==='ok').reduce((sum,a)=>{
    const cat = categories.find(c=>c.name===a.category);
    return sum + (cat?cat.price:0);
  },0);
  $('#metric-total').textContent = athletes.length;
  $('#metric-total-detail').textContent = `${okCount} al día · ${pendingCount} pendientes`;
  $('#metric-income').textContent = money(income);
  $('#metric-new').textContent = athletes.filter(a=>a.isNew).length;

  const teamNames = ['all', ...new Set(athletes.map(a=>a.team))];
  $('#team-tabs').innerHTML = teamNames.map(team => `
    <button type="button" class="team-tab ${activeTeamFilter===team?'active':''}" data-team="${team}">${team==='all'?'Todos los equipos':team}</button>`).join('');
  $$('.team-tab').forEach(tab => tab.addEventListener('click', () => {
    activeTeamFilter = tab.dataset.team;
    renderDashboard();
  }));

  const filtered = activeTeamFilter==='all' ? athletes : athletes.filter(a=>a.team===activeTeamFilter);
  $('#athlete-table').innerHTML = filtered.map(a => `
    <div class="athlete-row">
      <span class="athlete-avatar">${a.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span>
      <div><strong>${escapeHtml(a.name)}</strong><span>${a.category} · ${a.team}</span></div>
      <span class="tag ${a.status==='ok'?'ok':'pending'}">${a.status==='ok'?'Al día':'Pendiente'}</span>
      <span></span>
    </div>`).join('');
}

function showView(view){
  $('#enroll-view').hidden = view!=='enroll';
  $('#dashboard-view').hidden = view!=='dashboard';
  $('#view-toggle').textContent = view==='dashboard' ? 'Ver inscripciones' : 'Panel del club';
  if(view==='dashboard') renderDashboard();
  window.scrollTo({top:0, behavior:'smooth'});
}

renderCategories(); renderTeams(); updateToFicha();
$('#to-ficha').addEventListener('click', () => go(2));
$('#to-confirm').addEventListener('click', () => { if(validateAthlete()){ renderReview(); go(3); } });
$('#confirm-enroll').addEventListener('click', confirmEnrollment);
$$('[data-back]').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.back))));
$('#new-enroll').addEventListener('click', resetEnroll);
$('#go-dashboard').addEventListener('click', () => showView('dashboard'));
$('#enroll-button').addEventListener('click', () => showView('enroll'));
$('#view-toggle').addEventListener('click', () => showView($('#dashboard-view').hidden ? 'dashboard' : 'enroll'));
$('#back-to-enroll').addEventListener('click', () => showView('enroll'));
$$('.step').forEach((step, index) => step.addEventListener('click', () => {
  if(index+1<currentStep && currentStep<4) go(index+1);
}));
