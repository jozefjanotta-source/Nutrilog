
const DB=[
  {name:'Oats (rolled)',cal:389,prot:16.9,carb:66.3,fat:6.9,fiber:10.6,piece:null},
  {name:'Oat bran',cal:246,prot:17.3,carb:66.2,fat:7.0,fiber:15.4,piece:null},
  {name:'Instant oats',cal:374,prot:13.7,carb:67.7,fat:7.0,fiber:9.7,piece:null},
  {name:'Muesli',cal:363,prot:10.0,carb:65.0,fat:7.0,fiber:7.0,piece:null},
  {name:'Granola',cal:471,prot:10.0,carb:64.0,fat:20.0,fiber:5.0,piece:null},
  {name:'White rice (cooked)',cal:130,prot:2.7,carb:28.2,fat:0.3,fiber:0.4,piece:null},
  {name:'Brown rice (cooked)',cal:123,prot:2.7,carb:25.6,fat:0.9,fiber:1.8,piece:null},
  {name:'Pasta (cooked)',cal:158,prot:5.8,carb:30.9,fat:0.9,fiber:1.8,piece:null},
  {name:'Whole wheat pasta (cooked)',cal:149,prot:5.9,carb:29.0,fat:0.9,fiber:3.7,piece:null},
  {name:'White bread',cal:265,prot:9.0,carb:49.0,fat:3.2,fiber:2.7,piece:35},
  {name:'Whole wheat bread',cal:247,prot:13.0,carb:41.3,fat:3.4,fiber:6.0,piece:35},
  {name:'Rye bread',cal:259,prot:8.5,carb:48.3,fat:3.3,fiber:6.2,piece:32},
  {name:'Bagel',cal:257,prot:9.8,carb:50.0,fat:1.6,fiber:2.3,piece:98},
  {name:'Croissant',cal:406,prot:8.2,carb:45.0,fat:21.0,fiber:2.0,piece:57},
  {name:'Cornflakes',cal:357,prot:7.5,carb:84.0,fat:0.4,fiber:3.0,piece:null},
  {name:'Buckwheat (cooked)',cal:92,prot:3.4,carb:20.0,fat:0.6,fiber:2.7,piece:null},
  {name:'Quinoa (cooked)',cal:120,prot:4.4,carb:21.3,fat:1.9,fiber:2.8,piece:null},
  {name:'Couscous (cooked)',cal:112,prot:3.8,carb:23.2,fat:0.2,fiber:1.4,piece:null},
  {name:'Potato (boiled)',cal:87,prot:1.9,carb:20.1,fat:0.1,fiber:1.8,piece:150},
  {name:'Sweet potato (cooked)',cal:90,prot:2.0,carb:20.7,fat:0.1,fiber:3.3,piece:130},
  {name:'Potato chips',cal:547,prot:6.6,carb:52.9,fat:35.0,fiber:4.4,piece:null},
  {name:'Chicken breast (cooked)',cal:165,prot:31.0,carb:0.0,fat:3.6,fiber:0.0,piece:150},
  {name:'Chicken thigh (cooked)',cal:209,prot:26.0,carb:0.0,fat:10.9,fiber:0.0,piece:100},
  {name:'Chicken drumstick',cal:172,prot:28.3,carb:0.0,fat:5.7,fiber:0.0,piece:110},
  {name:'Turkey breast (cooked)',cal:135,prot:30.1,carb:0.0,fat:1.0,fiber:0.0,piece:null},
  {name:'Beef (lean, cooked)',cal:215,prot:26.1,carb:0.0,fat:11.8,fiber:0.0,piece:null},
  {name:'Ground beef 80/20 (cooked)',cal:254,prot:26.1,carb:0.0,fat:17.0,fiber:0.0,piece:null},
  {name:'Pork tenderloin (cooked)',cal:166,prot:29.9,carb:0.0,fat:4.5,fiber:0.0,piece:null},
  {name:'Pork chop (cooked)',cal:250,prot:28.0,carb:0.0,fat:14.0,fiber:0.0,piece:120},
  {name:'Bacon (cooked)',cal:541,prot:37.0,carb:1.4,fat:42.0,fiber:0.0,piece:8},
  {name:'Ham (cooked)',cal:145,prot:21.6,carb:1.5,fat:5.5,fiber:0.0,piece:30},
  {name:'Salami',cal:407,prot:22.6,carb:1.6,fat:34.4,fiber:0.0,piece:15},
  {name:'Salmon (cooked)',cal:208,prot:20.4,carb:0.0,fat:13.4,fiber:0.0,piece:150},
  {name:'Tuna (canned in water)',cal:116,prot:25.5,carb:0.0,fat:1.0,fiber:0.0,piece:null},
  {name:'Cod (cooked)',cal:105,prot:22.8,carb:0.0,fat:0.9,fiber:0.0,piece:null},
  {name:'Sardines (canned in oil)',cal:208,prot:24.6,carb:0.0,fat:11.5,fiber:0.0,piece:null},
  {name:'Shrimp (cooked)',cal:99,prot:24.0,carb:0.0,fat:0.3,fiber:0.0,piece:10},
  {name:'Egg (whole, large)',cal:155,prot:13.0,carb:1.1,fat:11.0,fiber:0.0,piece:60},
  {name:'Egg white',cal:52,prot:11.0,carb:0.7,fat:0.2,fiber:0.0,piece:33},
  {name:'Egg yolk',cal:322,prot:15.9,carb:3.6,fat:26.5,fiber:0.0,piece:17},
  {name:'Milk (3.5% fat)',cal:64,prot:3.3,carb:4.8,fat:3.5,fiber:0.0,piece:null},
  {name:'Skim milk (0.5% fat)',cal:35,prot:3.5,carb:5.0,fat:0.5,fiber:0.0,piece:null},
  {name:'Greek yogurt (0%)',cal:59,prot:10.3,carb:3.6,fat:0.4,fiber:0.0,piece:null},
  {name:'Greek yogurt (2%)',cal:73,prot:9.9,carb:3.6,fat:1.9,fiber:0.0,piece:null},
  {name:'Plain yogurt (3.5%)',cal:61,prot:3.5,carb:4.7,fat:3.3,fiber:0.0,piece:null},
  {name:'Cottage cheese (low fat)',cal:98,prot:11.1,carb:3.4,fat:4.3,fiber:0.0,piece:null},
  {name:'Ricotta cheese',cal:174,prot:11.3,carb:3.0,fat:13.0,fiber:0.0,piece:null},
  {name:'Cheddar cheese',cal:402,prot:25.0,carb:1.3,fat:33.1,fiber:0.0,piece:25},
  {name:'Mozzarella cheese',cal:280,prot:28.0,carb:3.1,fat:17.0,fiber:0.0,piece:30},
  {name:'Parmesan cheese',cal:431,prot:38.0,carb:4.1,fat:29.0,fiber:0.0,piece:null},
  {name:'Edam cheese',cal:357,prot:24.9,carb:1.4,fat:27.8,fiber:0.0,piece:25},
  {name:'Cream cheese',cal:342,prot:6.2,carb:4.1,fat:34.0,fiber:0.0,piece:null},
  {name:'Sour cream',cal:193,prot:2.1,carb:4.6,fat:19.4,fiber:0.0,piece:null},
  {name:'Heavy cream',cal:340,prot:2.1,carb:3.0,fat:36.0,fiber:0.0,piece:null},
  {name:'Whey protein powder',cal:370,prot:80.0,carb:6.0,fat:4.0,fiber:0.5,piece:30},
  {name:'Casein protein powder',cal:360,prot:80.0,carb:4.0,fat:2.0,fiber:1.0,piece:30},
  {name:'Banana',cal:89,prot:1.1,carb:22.8,fat:0.3,fiber:2.6,piece:118},
  {name:'Apple',cal:52,prot:0.3,carb:13.8,fat:0.2,fiber:2.4,piece:182},
  {name:'Orange',cal:47,prot:0.9,carb:11.8,fat:0.1,fiber:2.4,piece:131},
  {name:'Pear',cal:57,prot:0.4,carb:15.2,fat:0.1,fiber:3.1,piece:166},
  {name:'Grapes',cal:69,prot:0.7,carb:18.1,fat:0.2,fiber:0.9,piece:null},
  {name:'Strawberries',cal:32,prot:0.7,carb:7.7,fat:0.3,fiber:2.0,piece:12},
  {name:'Blueberries',cal:57,prot:0.7,carb:14.5,fat:0.3,fiber:2.4,piece:null},
  {name:'Raspberries',cal:52,prot:1.2,carb:11.9,fat:0.7,fiber:6.5,piece:null},
  {name:'Mango',cal:60,prot:0.8,carb:15.0,fat:0.4,fiber:1.6,piece:200},
  {name:'Kiwi',cal:61,prot:1.1,carb:14.7,fat:0.5,fiber:3.0,piece:76},
  {name:'Watermelon',cal:30,prot:0.6,carb:7.6,fat:0.2,fiber:0.4,piece:null},
  {name:'Peach',cal:39,prot:0.9,carb:9.5,fat:0.3,fiber:1.5,piece:150},
  {name:'Avocado',cal:160,prot:2.0,carb:8.5,fat:14.7,fiber:6.7,piece:200},
  {name:'Broccoli',cal:34,prot:2.8,carb:6.6,fat:0.4,fiber:2.6,piece:null},
  {name:'Spinach',cal:23,prot:2.9,carb:3.6,fat:0.4,fiber:2.2,piece:null},
  {name:'Kale',cal:49,prot:4.3,carb:8.8,fat:0.9,fiber:3.6,piece:null},
  {name:'Carrot',cal:41,prot:0.9,carb:9.6,fat:0.2,fiber:2.8,piece:61},
  {name:'Tomato',cal:18,prot:0.9,carb:3.9,fat:0.2,fiber:1.2,piece:123},
  {name:'Cucumber',cal:15,prot:0.7,carb:3.6,fat:0.1,fiber:0.5,piece:300},
  {name:'Red bell pepper',cal:31,prot:1.0,carb:6.0,fat:0.3,fiber:2.1,piece:119},
  {name:'Onion',cal:40,prot:1.1,carb:9.3,fat:0.1,fiber:1.7,piece:110},
  {name:'Garlic clove',cal:149,prot:6.4,carb:33.1,fat:0.5,fiber:2.1,piece:4},
  {name:'Mushrooms (white)',cal:22,prot:3.1,carb:3.3,fat:0.3,fiber:1.0,piece:18},
  {name:'Cauliflower',cal:25,prot:1.9,carb:5.0,fat:0.3,fiber:2.0,piece:null},
  {name:'Zucchini',cal:17,prot:1.2,carb:3.1,fat:0.3,fiber:1.0,piece:null},
  {name:'Corn (cooked)',cal:108,prot:4.0,carb:25.0,fat:1.3,fiber:2.7,piece:null},
  {name:'Lentils (cooked)',cal:116,prot:9.0,carb:20.1,fat:0.4,fiber:7.9,piece:null},
  {name:'Chickpeas (cooked)',cal:164,prot:8.9,carb:27.4,fat:2.6,fiber:7.6,piece:null},
  {name:'Black beans (cooked)',cal:132,prot:8.9,carb:23.7,fat:0.5,fiber:8.7,piece:null},
  {name:'Kidney beans (cooked)',cal:127,prot:8.7,carb:22.8,fat:0.5,fiber:7.4,piece:null},
  {name:'Edamame (cooked)',cal:122,prot:11.0,carb:9.9,fat:5.2,fiber:5.2,piece:null},
  {name:'Tofu (firm)',cal:144,prot:17.3,carb:2.8,fat:8.7,fiber:0.3,piece:null},
  {name:'Almonds',cal:579,prot:21.2,carb:21.6,fat:49.9,fiber:12.5,piece:1},
  {name:'Walnuts',cal:654,prot:15.2,carb:13.7,fat:65.2,fiber:6.7,piece:4},
  {name:'Cashews',cal:553,prot:18.2,carb:30.2,fat:43.8,fiber:3.3,piece:2},
  {name:'Peanuts',cal:567,prot:25.8,carb:16.1,fat:49.2,fiber:8.5,piece:1},
  {name:'Peanut butter',cal:598,prot:22.2,carb:21.6,fat:51.4,fiber:6.0,piece:null},
  {name:'Almond butter',cal:614,prot:21.0,carb:18.8,fat:55.5,fiber:10.3,piece:null},
  {name:'Chia seeds',cal:486,prot:16.5,carb:42.1,fat:30.7,fiber:34.4,piece:null},
  {name:'Flaxseeds',cal:534,prot:18.3,carb:28.9,fat:42.2,fiber:27.3,piece:null},
  {name:'Sunflower seeds',cal:584,prot:20.8,carb:20.0,fat:51.5,fiber:8.6,piece:null},
  {name:'Olive oil',cal:884,prot:0.0,carb:0.0,fat:100.0,fiber:0.0,piece:null},
  {name:'Coconut oil',cal:862,prot:0.0,carb:0.0,fat:100.0,fiber:0.0,piece:null},
  {name:'Butter',cal:717,prot:0.9,carb:0.1,fat:81.1,fiber:0.0,piece:null},
  {name:'Orange juice',cal:45,prot:0.7,carb:10.4,fat:0.2,fiber:0.2,piece:null},
  {name:'Apple juice',cal:46,prot:0.1,carb:11.4,fat:0.1,fiber:0.2,piece:null},
  {name:'Whole milk',cal:64,prot:3.3,carb:4.8,fat:3.5,fiber:0.0,piece:null},
  {name:'Oat milk',cal:47,prot:1.0,carb:8.0,fat:1.5,fiber:0.3,piece:null},
  {name:'Almond milk (unsweetened)',cal:15,prot:0.6,carb:0.6,fat:1.2,fiber:0.3,piece:null},
  {name:'Coffee (black)',cal:2,prot:0.3,carb:0.0,fat:0.0,fiber:0.0,piece:null},
  {name:'Espresso',cal:9,prot:0.6,carb:1.7,fat:0.2,fiber:0.0,piece:null},
  {name:'Beer (lager)',cal:43,prot:0.5,carb:3.6,fat:0.0,fiber:0.0,piece:null},
  {name:'Red wine',cal:85,prot:0.1,carb:2.6,fat:0.0,fiber:0.0,piece:null},
  {name:'White wine',cal:82,prot:0.1,carb:2.6,fat:0.0,fiber:0.0,piece:null},
  {name:'Bryndza (sheep cheese)',cal:270,prot:16.0,carb:3.0,fat:22.0,fiber:0.0,piece:null},
  {name:'Ostiepok (smoked cheese)',cal:360,prot:27.0,carb:0.5,fat:27.0,fiber:0.0,piece:null},
  {name:'Kapustnica soup',cal:55,prot:3.5,carb:4.5,fat:2.5,fiber:1.5,piece:null},
  {name:'Bryndzove halusky',cal:188,prot:8.5,carb:22.0,fat:7.5,fiber:1.0,piece:null},
  {name:'Sisky (doughnuts)',cal:340,prot:6.5,carb:46.0,fat:14.5,fiber:1.2,piece:70},
  {name:'Parenica cheese',cal:300,prot:25.0,carb:1.0,fat:21.0,fiber:0.0,piece:null},
  {name:'Klobasa (sausage)',cal:310,prot:15.0,carb:2.0,fat:27.0,fiber:0.0,piece:80},
  {name:'Jaternica (sausage)',cal:240,prot:11.0,carb:8.0,fat:18.0,fiber:0.5,piece:80},
  {name:'Tlacenka (head cheese)',cal:220,prot:15.0,carb:1.0,fat:17.0,fiber:0.0,piece:null},
  {name:'Segedinsky gulas',cal:130,prot:9.0,carb:5.0,fat:8.0,fiber:1.5,piece:null},
  {name:'Svickova (beef in sauce)',cal:175,prot:14.0,carb:10.0,fat:8.5,fiber:0.5,piece:null},
  {name:'Vyprazany syr (fried cheese)',cal:290,prot:16.0,carb:20.0,fat:16.0,fiber:0.5,piece:null},
  {name:'Dark chocolate (70%)',cal:598,prot:7.8,carb:45.9,fat:42.6,fiber:10.9,piece:5},
  {name:'Milk chocolate',cal:535,prot:7.7,carb:59.4,fat:29.7,fiber:3.4,piece:5},
  {name:'Honey',cal:304,prot:0.3,carb:82.4,fat:0.0,fiber:0.2,piece:null},
  {name:'Jam / marmalade',cal:278,prot:0.5,carb:68.9,fat:0.1,fiber:1.0,piece:null},
  {name:'Protein bar (generic)',cal:380,prot:30.0,carb:40.0,fat:10.0,fiber:5.0,piece:60},
  {name:'Rice cake',cal:387,prot:7.9,carb:81.5,fat:2.8,fiber:3.3,piece:9},
  {name:'Cream cracker',cal:440,prot:8.3,carb:69.0,fat:15.0,fiber:2.8,piece:7},
  {name:'Hummus',cal:177,prot:7.9,carb:14.3,fat:9.6,fiber:6.0,piece:null},
  {name:'Mayonnaise',cal:680,prot:1.0,carb:0.6,fat:74.8,fiber:0.0,piece:null},
  {name:'Ketchup',cal:112,prot:1.5,carb:27.0,fat:0.1,fiber:0.5,piece:null},
  {name:'Mustard',cal:66,prot:4.4,carb:5.8,fat:3.3,fiber:3.2,piece:null},
  {name:'Soy sauce',cal:60,prot:10.5,carb:5.6,fat:0.1,fiber:0.8,piece:null},
];

const SK={targets:'nl_targets',log:'nl_log',custom:'nl_custom',weight:'nl_weight'};
function lsGet(k,fb){try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb}catch(e){return fb}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function todayISO(){return new Date().toISOString().slice(0,10)}
function fmt(n){return Math.round(n*10)/10}
function fmtI(n){return Math.round(n)}

const state={
  targets:lsGet(SK.targets,{cal:2200,prot:150,carb:200,fat:80,fiber:30}),
  log:lsGet(SK.log,{}),
  customFoods:lsGet(SK.custom,[]),
  weight:lsGet(SK.weight,{}),
  currentDate:todayISO(),
  pendingFood:null,
  unitMode:'grams',
  chartRange:7
};
function persist(k){lsSet(SK[k],state[k])}

let chartCal=null,chartMacro=null,chartWeight=null,ringChart=null;

const VIEWS=['log','add','summary','custom','targets'];
function switchView(v){
  VIEWS.forEach(id=>{
    document.getElementById('view-'+id).style.display=id===v?'block':'none';
    document.getElementById('tab-'+id).classList.toggle('active',id===v);
  });
  if(v==='log')renderLog();
  if(v==='summary')renderSummaryPage();
  if(v==='custom')renderCustomList();
  if(v==='targets')loadTargetsForm();
}

function changeDay(d){
  const dt=new Date(state.currentDate);dt.setDate(dt.getDate()+d);
  state.currentDate=dt.toISOString().slice(0,10);renderLog();
}
function dayLabel(iso){
  const today=todayISO();
  const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(iso===today)return'Today';if(iso===yest)return'Yesterday';
  return new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}
function getDateRange(n){
  const dates=[];
  for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(d.toISOString().slice(0,10));}
  return dates;
}
function getTotals(date){
  return(state.log[date]||[]).reduce((a,e)=>({cal:a.cal+e.cal,prot:a.prot+e.prot,carb:a.carb+e.carb,fat:a.fat+e.fat,fiber:a.fiber+e.fiber}),{cal:0,prot:0,carb:0,fat:0,fiber:0});
}
function getMealTotals(date){
  const meals=['Breakfast','Lunch','Dinner','Snack'];const r={};
  meals.forEach(m=>{r[m]=(state.log[date]||[]).filter(e=>e.meal===m).reduce((a,e)=>a+e.cal,0);});
  return r;
}

function renderSummaryCards(totals){
  const t=state.targets;
  const ms=[{lbl:'Calories',val:fmtI(totals.cal),tgt:t.cal,unit:'kcal',color:'#e4880a'},{lbl:'Protein',val:fmt(totals.prot),tgt:t.prot,unit:'g',color:'#1a5fa8'},{lbl:'Carbs',val:fmt(totals.carb),tgt:t.carb,unit:'g',color:'#1d9e75'},{lbl:'Fat',val:fmt(totals.fat),tgt:t.fat,unit:'g',color:'#c0392b'}];
  document.getElementById('summary').innerHTML=ms.map(m=>{
    const pct=m.tgt?Math.min(100,m.val/m.tgt*100):0;const over=m.tgt&&m.val>m.tgt;
    return`<div class="macro-card"><div class="lbl">${m.lbl}</div><div class="val ${over?'val-over':''}">${m.val}</div><div class="tgt">${m.tgt?'/ '+m.tgt+' '+m.unit:'-'}</div>${m.tgt?`<div class="bar"><div class="bar-fill" style="width:${pct}%;background:${over?'var(--danger)':m.color}"></div></div>`:''}</div>`;
  }).join('');
}

function renderRing(totals){
  const t=state.targets;const over=totals.cal>t.cal;
  const rem=Math.max(0,t.cal-totals.cal);
  const pct=t.cal?Math.min(100,totals.cal/t.cal*100):0;
  document.getElementById('ring-val').textContent=fmtI(over?totals.cal-t.cal:rem);
  document.getElementById('ring-lbl').textContent=over?'over':'left';
  document.getElementById('ring-val').style.color=over?'var(--danger)':'var(--accent)';
  const color=over?'#e57373':'#52b788';
  try{
    const ctx=document.getElementById('ring-canvas').getContext('2d');
    if(ringChart)ringChart.destroy();
    ringChart=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[pct,100-pct],backgroundColor:[color,'rgba(128,128,128,0.15)'],borderWidth:0,borderRadius:4}]},options:{cutout:'72%',plugins:{legend:{display:false},tooltip:{enabled:false}},animation:{duration:400}}});
  }catch(e){}
  const macros=[{lbl:'Protein',val:fmt(totals.prot),tgt:t.prot,over:totals.prot>t.prot},{lbl:'Carbs',val:fmt(totals.carb),tgt:t.carb,over:totals.carb>t.carb},{lbl:'Fat',val:fmt(totals.fat),tgt:t.fat,over:totals.fat>t.fat},{lbl:'Fiber',val:fmt(totals.fiber),tgt:t.fiber,over:totals.fiber>t.fiber}];
  document.getElementById('remain-macros').innerHTML=macros.map(m=>`<div class="rm-item"><div class="rm-lbl">${m.lbl}</div><div class="rm-val ${m.over?'over':''}">${m.val}${m.tgt?' / '+m.tgt:''}g</div></div>`).join('');
}

function renderMealBars(date){
  const mt=getMealTotals(date);const t=state.targets.cal||2200;
  const meals=['Breakfast','Lunch','Dinner','Snack'];const colors=['#e4880a','#1d9e75','#1a5fa8','#9b59b6'];
  document.getElementById('meal-bars').innerHTML=meals.map((m,i)=>{
    const cal=mt[m]||0;if(!cal)return'';
    const pct=Math.min(100,cal/t*100);
    return`<div class="meal-bar-item"><div class="meal-bar-label">${m}</div><div class="meal-bar-track"><div class="meal-bar-fill" style="width:${pct}%;background:${colors[i]}"></div></div><div class="meal-bar-cal">${fmtI(cal)}</div></div>`;
  }).join('');
}

function renderMicroStrip(totals){
  const t=state.targets;
  const items=[{lbl:'Fiber',val:fmt(totals.fiber),tgt:t.fiber,color:'#1d9e75'},{lbl:'Protein',val:fmt(totals.prot),tgt:t.prot,color:'#1a5fa8'}];
  document.getElementById('micro-strip').innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
  items.map(m=>{const pct=m.tgt?Math.min(100,parseFloat(m.val)/m.tgt*100):0;const over=m.tgt&&parseFloat(m.val)>m.tgt;
    return`<div class="micro-item"><div class="mi-lbl">${m.lbl}</div><div class="mi-val" style="color:${over?'var(--danger)':m.color}">${m.val}g</div><div class="mi-tgt">${m.tgt?'Target: '+m.tgt+'g':'No target'}</div>${m.tgt?`<div class="bar"><div class="bar-fill" style="width:${pct}%;background:${over?'var(--danger)':m.color}"></div></div>`:''}</div>`;
  }).join('')+'</div>';
}

function renderLog(){
  document.getElementById('date-label').textContent=dayLabel(state.currentDate);
  const totals=getTotals(state.currentDate);
  renderSummaryCards(totals);renderRing(totals);renderMealBars(state.currentDate);renderMicroStrip(totals);
  const entries=state.log[state.currentDate]||[];
  const meals=['Breakfast','Lunch','Dinner','Snack'];let html='';
  meals.forEach(meal=>{
    const items=entries.filter(e=>e.meal===meal);if(!items.length)return;
    html+=`<div class="log-section"><div class="meal-header">${meal}</div>`;
    items.forEach(e=>{
      const idx=entries.indexOf(e);
      html+=`<div class="food-item"><div class="food-item-info"><div class="food-item-name">${e.name}</div><div class="food-item-meta">${e.amountLabel} - P ${fmt(e.prot)}g - C ${fmt(e.carb)}g - F ${fmt(e.fat)}g</div></div><div class="food-item-cal">${fmtI(e.cal)} kcal</div><button class="del-btn" onclick="removeEntry('${state.currentDate}',${idx})">x</button></div>`;
    });
    html+='</div>';
  });
  const body=document.getElementById('log-body');
  if(!entries.length){body.innerHTML=`<div class="empty-log">Nothing logged ${dayLabel(state.currentDate).toLowerCase()==='today'?'today':'for '+dayLabel(state.currentDate).toLowerCase()}.<br>Tap Add food to start.</div>`;}
  else{html+=`<div class="day-total"><span>Fiber: ${fmt(totals.fiber)}g</span><span>Total: ${fmtI(totals.cal)} kcal - P ${fmt(totals.prot)}g - C ${fmt(totals.carb)}g - F ${fmt(totals.fat)}g</span></div>`;body.innerHTML=html;}
}

function removeEntry(date,idx){state.log[date].splice(idx,1);persist('log');renderLog();}

function setRange(n){
  state.chartRange=n;
  document.getElementById('btn-7').classList.toggle('active',n===7);
  document.getElementById('btn-30').classList.toggle('active',n===30);
  renderSummaryPage();
}

function renderSummaryPage(){
  const dates=getDateRange(state.chartRange);
  const calData=dates.map(d=>fmtI(getTotals(d).cal));
  const protData=dates.map(d=>fmt(getTotals(d).prot));
  const carbData=dates.map(d=>fmt(getTotals(d).carb));
  const fatData=dates.map(d=>fmt(getTotals(d).fat));
  const labels=dates.map(d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
  const daysLogged=dates.filter(d=>(state.log[d]||[]).length>0).length;
  const avgCal=daysLogged?Math.round(dates.reduce((a,d)=>a+getTotals(d).cal,0)/daysLogged):0;
  const avgProt=daysLogged?fmt(dates.reduce((a,d)=>a+getTotals(d).prot,0)/daysLogged):0;
  const avgCarb=daysLogged?fmt(dates.reduce((a,d)=>a+getTotals(d).carb,0)/daysLogged):0;
  document.getElementById('avg-grid').innerHTML=`
    <div class="week-stat"><div class="ws-lbl">Avg calories</div><div class="ws-val">${avgCal}</div><div class="ws-sub">kcal / logged day</div></div>
    <div class="week-stat"><div class="ws-lbl">Avg protein</div><div class="ws-val">${avgProt}g</div><div class="ws-sub">target: ${state.targets.prot}g</div></div>
    <div class="week-stat"><div class="ws-lbl">Avg carbs</div><div class="ws-val">${avgCarb}g</div><div class="ws-sub">target: ${state.targets.carb}g</div></div>
    <div class="week-stat"><div class="ws-lbl">Days logged</div><div class="ws-val">${daysLogged}</div><div class="ws-sub">of last ${state.chartRange}</div></div>`;
  const isDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
  const gc=isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)';
  const tc=isDark?'#606058':'#9e9e97';
  const bo={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:10},maxRotation:45}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10}}}}};
  if(typeof Chart==='undefined'||!Chart){document.getElementById('chart-cal').parentElement.innerHTML='<p style="color:var(--text3);font-size:13px;padding:20px 0;text-align:center">Charts unavailable offline</p>';return;}
  if(chartCal)chartCal.destroy();
  chartCal=new Chart(document.getElementById('chart-cal').getContext('2d'),{type:'bar',data:{labels,datasets:[{data:calData,backgroundColor:calData.map(v=>v>state.targets.cal?'rgba(192,57,43,0.7)':'rgba(45,106,79,0.7)'),borderRadius:4}]},options:{...bo,plugins:{...bo.plugins,tooltip:{callbacks:{label:ctx=>`${ctx.raw} kcal`}}},scales:{...bo.scales,y:{...bo.scales.y,suggestedMax:state.targets.cal*1.2}}}});
  if(chartMacro)chartMacro.destroy();
  chartMacro=new Chart(document.getElementById('chart-macro').getContext('2d'),{type:'bar',data:{labels,datasets:[{label:'Protein',data:protData,backgroundColor:'rgba(26,95,168,0.8)',stack:'s'},{label:'Carbs',data:carbData,backgroundColor:'rgba(29,158,117,0.8)',stack:'s'},{label:'Fat',data:fatData,backgroundColor:'rgba(192,57,43,0.8)',stack:'s'}]},options:{...bo,plugins:{legend:{display:true,position:'bottom',labels:{color:tc,font:{size:11},boxWidth:12}},tooltip:{mode:'index',intersect:false}},scales:{x:{...bo.scales.x,stacked:true},y:{...bo.scales.y,stacked:true}}}});
  renderWeightChart(labels,dates);renderWeightList();
}

function renderWeightChart(labels,dates){
  const isDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
  const gc=isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)';
  const tc=isDark?'#606058':'#9e9e97';
  const wData=dates.map(d=>state.weight[d]||null);
  const hasData=wData.some(v=>v!==null);
  document.getElementById('weight-chart-wrap').style.display=hasData?'block':'none';
  if(hasData){
    if(chartWeight)chartWeight.destroy();
    chartWeight=new Chart(document.getElementById('chart-weight').getContext('2d'),{type:'line',data:{labels,datasets:[{data:wData,borderColor:'rgba(45,106,79,0.9)',backgroundColor:'rgba(45,106,79,0.1)',borderWidth:2,pointRadius:4,pointBackgroundColor:'rgba(45,106,79,0.9)',tension:0.3,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.raw} kg`}}},scales:{x:{grid:{color:gc},ticks:{color:tc,font:{size:10},maxRotation:45}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10}}}}}});
  }
}

function addWeight(){
  const d=document.getElementById('w-date').value;const v=parseFloat(document.getElementById('w-val').value);
  if(!d||isNaN(v))return;
  state.weight[d]=v;persist('weight');
  document.getElementById('w-val').value='';
  renderWeightList();renderSummaryPage();
}
function renderWeightList(){
  const entries=Object.entries(state.weight).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5);
  const list=document.getElementById('weight-list');
  if(!entries.length){list.innerHTML='<div style="font-size:13px;color:var(--text3);padding:8px 0">No weight entries yet.</div>';return;}
  list.innerHTML=entries.map(([d,v])=>`<div class="weight-entry"><span class="weight-entry-date">${dayLabel(d)}</span><div style="display:flex;align-items:center;gap:10px"><span class="weight-entry-val">${v} kg</span><button class="btn-sm-danger" onclick="deleteWeight('${d}')">x</button></div></div>`).join('');
}
function deleteWeight(d){delete state.weight[d];persist('weight');renderWeightList();renderSummaryPage();}

function handleSearch(q){
  document.getElementById('search-clear').style.display=q?'flex':'none';
  const ql=q.trim().toLowerCase();
  document.getElementById('add-panel').style.display='none';state.pendingFood=null;
  if(!ql){document.getElementById('search-results').innerHTML='';document.getElementById('search-status').textContent='';return;}
  const all=[...state.customFoods.filter(f=>f.name.toLowerCase().includes(ql)).map(f=>({...f,_src:'custom'})),...DB.filter(f=>f.name.toLowerCase().includes(ql)).map(f=>({...f,_src:'builtin'}))];
  if(!all.length){document.getElementById('search-results').innerHTML=`<div class="no-results">No results for "${q}". Add it under My foods.</div>`;document.getElementById('search-status').textContent='';return;}
  document.getElementById('search-status').textContent=`${all.length} result${all.length!==1?'s':''}`;
  document.getElementById('search-results').innerHTML=`<div class="results-list">${all.map(f=>`<div class="result-item" onclick='pickFood(${JSON.stringify(f).replace(/'/g,"&#39;")})'><div style="flex:1;min-width:0"><div class="result-name">${f.name}<span class="tag ${f._src==='custom'?'tag-custom':'tag-builtin'}">${f._src}</span></div><div class="result-meta">per 100g - P ${fmt(f.prot)}g - C ${fmt(f.carb)}g - F ${fmt(f.fat)}g${f.piece?' - 1pc='+f.piece+'g':''}</div></div><div class="result-cal">${fmtI(f.cal)}</div></div>`).join('')}</div>`;
}
function clearSearch(){document.getElementById('search-input').value='';handleSearch('');}

function setUnitMode(mode){
  state.unitMode=mode;
  document.querySelectorAll('.unit-tab').forEach((t,i)=>t.classList.toggle('active',['grams','pieces','spoons'][i]===mode));
  const f=state.pendingFood;const ai=document.getElementById('af-amount');
  if(mode==='grams'){document.getElementById('amount-label').textContent='Amount (g)';document.getElementById('field-unit').style.display='none';ai.value=100;ai.step=1;}
  else if(mode==='pieces'){document.getElementById('amount-label').textContent='Pieces'+(f&&f.piece?' (1pc='+f.piece+'g)':'');document.getElementById('field-unit').style.display='none';ai.value=1;ai.step=0.5;}
  else{document.getElementById('amount-label').textContent='Count';document.getElementById('field-unit').style.display='';ai.value=1;ai.step=0.5;}
  updatePreview();
}
function getEffectiveGrams(){
  const f=state.pendingFood;const count=parseFloat(document.getElementById('af-amount').value)||0;
  if(state.unitMode==='grams')return count;
  if(state.unitMode==='pieces')return count*(f&&f.piece?f.piece:100);
  return count*(parseFloat(document.getElementById('af-unit').value)||15);
}
function getAmountLabel(){
  const count=parseFloat(document.getElementById('af-amount').value)||0;
  if(state.unitMode==='grams')return count+'g';
  if(state.unitMode==='pieces')return count+' pc';
  const sel=document.getElementById('af-unit');return count+' '+sel.options[sel.selectedIndex].text.split(' ')[0].toLowerCase();
}
function pickFood(food){
  state.pendingFood=food;
  document.getElementById('add-panel').style.display='block';
  document.getElementById('af-name').textContent=food.name;
  const hp=food.piece&&food.piece>0;
  document.querySelectorAll('.unit-tab')[1].style.opacity=hp?'':'.35';
  document.querySelectorAll('.unit-tab')[1].style.pointerEvents=hp?'':'none';
  setUnitMode('grams');
  document.getElementById('add-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function updatePreview(){
  if(!state.pendingFood)return;
  const f=state.pendingFood;const r=getEffectiveGrams()/100;
  document.getElementById('af-preview').innerHTML=`<div class="preview-item"><div class="pv">${fmtI(f.cal*r)}</div><div class="pl">kcal</div></div><div class="preview-item"><div class="pv">${fmt(f.prot*r)}g</div><div class="pl">protein</div></div><div class="preview-item"><div class="pv">${fmt(f.carb*r)}g</div><div class="pl">carbs</div></div>`;
}
function addToLog(){
  const f=state.pendingFood;if(!f)return;
  const g=getEffectiveGrams();const r=g/100;const meal=document.getElementById('af-meal').value;
  if(!state.log[state.currentDate])state.log[state.currentDate]=[];
  state.log[state.currentDate].push({name:f.name,meal,amountLabel:getAmountLabel(),cal:f.cal*r,prot:f.prot*r,carb:f.carb*r,fat:f.fat*r,fiber:(f.fiber||0)*r});
  persist('log');state.pendingFood=null;clearSearch();
  document.getElementById('add-panel').style.display='none';switchView('log');
}

function saveCustomFood(){
  const name=document.getElementById('cf-name').value.trim();if(!name)return;
  state.customFoods.push({name,cal:parseFloat(document.getElementById('cf-cal').value)||0,prot:parseFloat(document.getElementById('cf-prot').value)||0,carb:parseFloat(document.getElementById('cf-carb').value)||0,fat:parseFloat(document.getElementById('cf-fat').value)||0,fiber:parseFloat(document.getElementById('cf-fiber').value)||0,piece:parseFloat(document.getElementById('cf-piece').value)||null});
  persist('custom');['cf-name','cf-cal','cf-prot','cf-carb','cf-fat','cf-fiber','cf-piece'].forEach(id=>document.getElementById(id).value='');renderCustomList();
}
function renderCustomList(){
  const list=document.getElementById('custom-list');
  if(!state.customFoods.length){list.innerHTML='<div class="empty-log">No custom foods yet.</div>';return;}
  list.innerHTML=state.customFoods.map((f,i)=>`<div class="custom-item"><div class="custom-item-info"><div class="custom-item-name">${f.name}</div><div class="custom-item-meta">${fmtI(f.cal)} kcal - P ${fmt(f.prot)}g - C ${fmt(f.carb)}g - F ${fmt(f.fat)}g${f.piece?' - 1pc='+f.piece+'g':''}</div></div><button class="btn-sm-danger" onclick="deleteCustom(${i})">Delete</button></div>`).join('');
}
function deleteCustom(i){state.customFoods.splice(i,1);persist('custom');renderCustomList();}

function loadTargetsForm(){['cal','prot','carb','fat','fiber'].forEach(k=>document.getElementById('t-'+k).value=state.targets[k]);}
function saveTargets(){
  ['cal','prot','carb','fat','fiber'].forEach(k=>state.targets[k]=parseFloat(document.getElementById('t-'+k).value)||0);
  persist('targets');const m=document.getElementById('save-msg');m.style.display='block';setTimeout(()=>m.style.display='none',2000);
}

function exportData(){
  const payload=JSON.stringify({v:2,targets:state.targets,log:state.log,customFoods:state.customFoods,weight:state.weight});
  const encoded=btoa(unescape(encodeURIComponent(payload)));
  navigator.clipboard.writeText(encoded).then(()=>{const m=document.getElementById('export-msg');m.style.display='block';setTimeout(()=>m.style.display='none',4000);}).catch(()=>prompt('Copy this code:',encoded));
}
function importData(){
  const raw=document.getElementById('import-input').value.trim();
  const msg=document.getElementById('import-msg');
  if(!raw){msg.style.display='block';msg.style.color='var(--danger)';msg.textContent='Please paste an export code first.';return;}
  try{
    const p=JSON.parse(decodeURIComponent(escape(atob(raw))));
    if(!p.targets)throw new Error();
    state.targets=p.targets;state.log=p.log||{};state.customFoods=p.customFoods||[];state.weight=p.weight||{};
    persist('targets');persist('log');persist('custom');persist('weight');
    document.getElementById('import-input').value='';
    msg.style.display='block';msg.style.color='var(--accent)';msg.textContent='Imported - all data updated.';
    setTimeout(()=>msg.style.display='none',4000);loadTargetsForm();
  }catch(e){msg.style.display='block';msg.style.color='var(--danger)';msg.textContent='Invalid code - make sure you copied the full export.';}
}

function showDebug(msg){
  const d=document.getElementById('debug');
  if(d){d.style.display='block';d.textContent='DEBUG: '+msg;}
}
function initApp(){
  try{
    showDebug('starting init...');
    VIEWS.forEach(id=>{
      const el=document.getElementById('view-'+id);
      if(!el){showDebug('missing element: view-'+id);return;}
      el.style.display='none';
    });
    showDebug('views hidden, setting date...');
    document.getElementById('w-date').value=todayISO();
    showDebug('loading targets...');
    loadTargetsForm();
    showDebug('switching to log view...');
    switchView('log');
    showDebug('done - if you see this tell Claude');
  }catch(e){
    showDebug('ERROR: '+e.message+' at '+e.stack);
  }
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initApp);}else{initApp();}
