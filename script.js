const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const today = new Date();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const faDate = d => new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'fa-IR',{day:'numeric',month:'short'}).format(d);
const weekDaysFa = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const weekDaysEn = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const weekDayName = i => document.documentElement.lang==='en'?weekDaysEn[i]:weekDaysFa[i];
const dayColors = ['#d6eff0','#fbe2dc','#f9d9e8','#fce9bd','#e8e3fa','#dcefe5','#f5e4cf'];
const habitColors = ['#55b7cf','#65c49d','#b18bdd','#e1a84d','#dc7e88'];
const defaultAssignments = [];
const defaultHabits = [];
const makeEmptyWeek = (anchor = today) => {
 const start = new Date(anchor); const offset = (start.getDay()+1)%7; start.setDate(start.getDate()-offset);
 return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return {day:weekDayName(i),date:iso(d),focus:'',tasks:[]};});
};
function load(key, fallback){try{const v=JSON.parse(localStorage.getItem('littlePlanner_'+key));return v??fallback}catch{return fallback}}
function save(key,val){localStorage.setItem('littlePlanner_'+key,JSON.stringify(val))}
let assignments=load('assignments',defaultAssignments), habits=load('habits',defaultHabits), weekly=load('weekly',makeEmptyWeek());
let selectedCalendarDate=iso(today);
let displayedMonth=new Date(today.getFullYear(),today.getMonth(),1);
let habitLogs=load('habitLogs',{});
let editing={type:null,id:null};
const statusNames={todo:'شروع نشده',doing:'در حال انجام',done:'انجام شده'};
const priorityNames={'بالا':'بالا','متوسط':'متوسط','کم':'کم'};
const daysDiff = date => Math.ceil((new Date(date+'T12:00:00')-new Date(iso(today)+'T12:00:00'))/86400000);
function setView(view){
 $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));
 $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 const config={assignments:['STUDY SPACE / 01','تکالیف','همه‌ی کارهای درسی، یک‌جا و مرتب.','＋ افزودن تکلیف'],habits:['DAILY RHYTHM / 02','ردیاب عادت‌ها','تداوم‌های کوچک، تغییرهای بزرگ می‌سازند.','＋ عادت جدید'],weekly:['WEEK AT A GLANCE / 03','پلنر هفتگی','برای هفته‌ات جا باز کن، نه فقط برای کارها.','＋ افزودن کار']};
 $('#top-eyebrow').textContent=config[view][0];$('#page-title').textContent=config[view][1];$('#page-subtitle').textContent=config[view][2];$('#main-add').textContent=config[view][3];
 $('#main-add').onclick=()=> view==='assignments'?openModal('assignment'):view==='habits'?openModal('habit'):openModal('weekly');
 if(document.documentElement.lang==='en'){config.assignments=['STUDY SPACE / 01','Assignments','All your schoolwork, organized in one place.','＋ Add assignment'];config.habits=['DAILY RHYTHM / 02','Habit Tracker','Small consistent steps create big changes.','＋ Add habit'];config.weekly=['WEEK AT A GLANCE / 03','Weekly Planner','Make room for your week, not just your tasks.','＋ Add task'];$('#top-eyebrow').textContent=config[view][0];$('#page-title').textContent=config[view][1];$('#page-subtitle').textContent=config[view][2];$('#main-add').textContent=config[view][3];}
}
$$('.nav-link').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#today-label').textContent=new Intl.DateTimeFormat('fa-IR',{weekday:'long',day:'numeric',month:'long'}).format(today);
function renderAssignments(){
 const filtered=assignments.filter(a=>{const q=$('#assignment-search').value.trim().toLowerCase();const f=$('#assignment-filter').value;return (!q||[a.course,a.type,a.desc,a.note].join(' ').toLowerCase().includes(q))&&(f==='all'||a.status===f)});
 $('#assignments-body').innerHTML=filtered.map(a=>`<tr data-id="${a.id}">
 <td><input data-key="course" value="${esc(a.course)}" aria-label="نام درس"></td>
 <td><select data-key="type">${['تمرین','گزارش','پروژه','مطالعه','امتحان'].map(x=>`<option ${a.type===x?'selected':''}>${x}</option>`).join('')}</select></td>
 <td><input data-key="desc" value="${esc(a.desc)}" aria-label="توضیحات"></td>
 <td><select data-key="priority" class="priority-select">${['بالا','متوسط','کم'].map(x=>`<option ${a.priority===x?'selected':''}>${x}</option>`).join('')}</select></td>
 <td><select data-key="status">${Object.entries(statusNames).map(([k,v])=>`<option value="${k}" ${a.status===k?'selected':''}>${v}</option>`).join('')}</select></td>
 <td><input type="date" data-key="date" value="${a.date}"></td>
 <td style="text-align:center;color:${daysDiff(a.date)<0&&a.status!=='done'?'#d16f7c':'#7f8795'}">${a.status==='done'?'✓':daysDiff(a.date)<0?`${Math.abs(daysDiff(a.date))} روز گذشته`:daysDiff(a.date)===0?'امروز':daysDiff(a.date)}</td>
 <td><input data-key="note" value="${esc(a.note||'')}" aria-label="یادداشت"></td>
 <td><button type="button" class="icon-btn delete-assignment" title="حذف این تکلیف">🗑</button></td></tr>`).join('');
 $('#assignments-empty').hidden=filtered.length>0;
 $('#assignments-body').onchange=e=>{const key=e.target.dataset.key;if(!key)return;const tr=e.target.closest('tr');const a=assignments.find(x=>x.id===+tr.dataset.id);a[key]=e.target.value;save('assignments',assignments);renderAssignments()};

 const done=assignments.filter(a=>a.status==='done').length,total=assignments.length,pct=total?Math.round(done/total*100):0;
 $('#assignment-progress').textContent=pct;$('#assignment-progress-bar').style.width=pct+'%';$('#assignment-progress-copy').textContent=`${done} مورد از ${total} تکلیف کامل شده`;
 $('#remaining-count').textContent=total-done;$('#completed-count').textContent=done;
 const p=['بالا','متوسط','کم'].map(k=>({k,n:assignments.filter(a=>a.priority===k&&a.status!=='done').length,c:{بالا:'#d99ba8',متوسط:'#f0c987',کم:'#a9d8ca'}[k]}));
 $('#priority-bars').innerHTML=p.map(x=>`<div class="mini-bar-wrap"><div class="mini-bar" style="height:${Math.max(5,(x.n/Math.max(1,...p.map(z=>z.n)))*45)}px;background:${x.c}"></div><span>${x.n}</span><span>${x.k}</span></div>`).join('');
 const todo=assignments.filter(a=>a.status==='todo').length,doing=assignments.filter(a=>a.status==='doing').length,finished=done;
 const deg1=total?todo/total*100:0,deg2=total?(todo+doing)/total*100:0;
 $('#assignment-donut').style.background=`conic-gradient(#91d1bf 0 ${pct}%,#f2cbd8 ${pct}% ${pct+ (total?doing/total*100:0)}%,#f5dca5 ${pct+(total?doing/total*100:0)}% 100%)`;
 $('#assignment-legend').innerHTML=`<div class="legend-item"><i style="background:#91d1bf"></i>انجام‌شده ${finished}</div><div class="legend-item"><i style="background:#f2cbd8"></i>در حال انجام ${doing}</div><div class="legend-item"><i style="background:#f5dca5"></i>شروع نشده ${todo}</div>`;
}
document.addEventListener('click',e=>{
 const del=e.target.closest('.delete-assignment'); if(!del)return;
 const row=del.closest('tr'); if(!row)return;
 assignments=assignments.filter(a=>a.id!==Number(row.dataset.id)); save('assignments',assignments); renderAll();
});
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function logKey(hid,date){return `${hid}_${date}`}
function isHabitDone(hid,date){return !!habitLogs[logKey(hid,date)]}
function renderHabits(){
 const lastDates=Array.from({length:30},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-29+i);return iso(d)});
 const values=lastDates.map(date=>habits.reduce((n,h)=>n+(isHabitDone(h.id,date)?1:0),0));
 const max=Math.max(1,...values),w=600,h=135,points=values.map((v,i)=>`${i/(values.length-1)*w},${h-8-(v/max)*(h-25)}`).join(' ');
 const polygon=`0,${h} ${points} ${w},${h}`;
 $('#habit-area-chart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#a9a0ff" stop-opacity=".55"/><stop offset="100%" stop-color="#a9a0ff" stop-opacity=".12"/></linearGradient></defs><polygon points="${polygon}" fill="url(#areaFill)"/><polyline points="${points}" fill="none" stroke="#8b83f5" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
 const todayDone=habits.filter(h=>isHabitDone(h.id,iso(today))).length,pct=habits.length?Math.round(todayDone/habits.length*100):0;
 $('#today-habit-percent').textContent=pct+'%';$('#today-habit-bar').style.width=pct+'%';$('#today-habit-done').textContent=`${todayDone} از ${habits.length}`;
 $('#habit-mini-list').innerHTML=habits.slice(0,5).map((h,i)=>{const n=lastDates.filter(d=>isHabitDone(h.id,d)).length;return `<div class="habit-mini-row"><span>${h.emoji} ${esc(h.name)}</span><b>${n}/30</b><div class="mini-track"><span style="width:${n/30*100}%;background:${habitColors[h.color%habitColors.length]}"></span></div></div>`}).join('')||'<span class="muted">هنوز عادتی اضافه نشده.</span>';
 const dates=Array.from({length:35},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-34+i);return iso(d)});
 let table='<thead><tr><th>عادت روزانه</th>'+dates.map(d=>`<th title="${d}">${new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'fa-IR',{day:'numeric'}).format(new Date(d+'T12:00:00'))}</th>`).join('')+'</tr></thead><tbody>';
 table+=habits.map(h=>`<tr><td>${h.emoji} ${esc(h.name)}</td>${dates.map(d=>`<td><input class="habit-check" type="checkbox" data-habit="${h.id}" data-date="${d}" style="--habit-color:${habitColors[h.color%habitColors.length]}" ${isHabitDone(h.id,d)?'checked':''} aria-label="${esc(h.name)} ${d}"></td>`).join('')}</tr>`).join('');
 $('#habit-calendar').innerHTML=table+'</tbody>';
 $$('.habit-check').forEach(ch=>ch.addEventListener('change',()=>{const k=logKey(+ch.dataset.habit,ch.dataset.date);if(ch.checked)habitLogs[k]=true;else delete habitLogs[k];save('habitLogs',habitLogs);renderHabits();renderWeekly()}));
 $('#habit-cards').innerHTML=habits.map(h=>{const count=lastDates.filter(d=>isHabitDone(h.id,d)).length;return `<article class="habit-card"><div class="habit-card-head"><div class="habit-emoji">${h.emoji}</div><b>${esc(h.name)}</b><button class="icon-btn edit-habit" data-id="${h.id}" title="ویرایش">✎</button><button type="button" class="icon-btn delete-habit" data-id="${h.id}" title="حذف این عادت">🗑</button></div><p>${esc(h.category)} · هدف: ${h.goal}${h.category==='سلامت'&&h.goal>1?' لیوان/دقیقه':''}</p><div class="progress-track"><span style="width:${count/30*100}%;background:${habitColors[h.color%habitColors.length]}"></span></div><div class="habit-card-foot"><span>${count} روز از ۳۰ روز</span><b>${Math.round(count/30*100)}%</b></div></article>`}).join('');
 $$('.edit-habit').forEach(b=>b.onclick=()=>openModal('habit',+b.dataset.id));$$('.delete-habit').forEach(b=>b.onclick=()=>{habits=habits.filter(h=>h.id!==+b.dataset.id);save('habits',habits);renderAll()});
}
function renderMiniCalendar(){
 const year=displayedMonth.getFullYear(),month=displayedMonth.getMonth();
 const first=new Date(year,month,1),last=new Date(year,month+1,0);
 $('#mini-month-title').textContent=new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'fa-IR',{month:'long',year:'numeric'}).format(first);
 $('#selected-date-label').textContent=(document.documentElement.lang==='en'?'Selected date: ':'تاریخ انتخاب‌شده: ')+new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-US':'fa-IR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(selectedCalendarDate+'T12:00:00'));
 const offset=(first.getDay()+1)%7;
 let out=(document.documentElement.lang==='en'?['S','M','T','W','T','F','S']:['ش','ی','د','س','چ','پ','ج']).map(x=>`<span class="weekday">${x}</span>`).join('');
 for(let i=0;i<offset;i++)out+='<span class="muted-day"></span>';
 for(let n=1;n<=last.getDate();n++){const d=new Date(year,month,n),key=iso(d);const cls=[key===selectedCalendarDate?'selected':'',key===iso(today)?'today-date':''].filter(Boolean).join(' ');out+=`<button type="button" class="calendar-day ${cls}" data-date="${key}">${new Intl.NumberFormat(document.documentElement.lang==='en'?'en-US':'fa-IR').format(n)}</button>`;}
 $('#mini-calendar').innerHTML=out;
 $$('#mini-calendar .calendar-day').forEach(btn=>btn.addEventListener('click',()=>{selectedCalendarDate=btn.dataset.date;renderWeekly();}));
}
$('#month-prev').addEventListener('click',()=>{displayedMonth=new Date(displayedMonth.getFullYear(),displayedMonth.getMonth()-1,1);renderMiniCalendar()});
$('#month-next').addEventListener('click',()=>{displayedMonth=new Date(displayedMonth.getFullYear(),displayedMonth.getMonth()+1,1);renderMiniCalendar()});
$('#month-today').addEventListener('click',()=>{selectedCalendarDate=iso(today);displayedMonth=new Date(today.getFullYear(),today.getMonth(),1);renderWeekly()});
function renderWeekly(){
 const anchor=new Date(selectedCalendarDate+'T12:00:00');const offset=(anchor.getDay()+1)%7;const weekStart=new Date(anchor);weekStart.setDate(anchor.getDate()-offset);
 const visibleWeek=Array.from({length:7},(_,i)=>{const date=new Date(weekStart);date.setDate(weekStart.getDate()+i);const key=iso(date);let item=weekly.find(d=>d.date===key);if(!item){item={day:weekDayName(i),date:key,focus:'',tasks:[]};weekly.push(item)}item.day=weekDayName(i);return item;});
 save('weekly',weekly);renderMiniCalendar();
 const all=visibleWeek.flatMap(d=>d.tasks),done=all.filter(t=>t[2]).length,pct=all.length?Math.round(done/all.length*100):0;
 $('#week-progress').textContent=pct+'%';$('#week-progress-bar').style.width=pct+'%';
 $('#week-bars').innerHTML=visibleWeek.map((d,i)=>{const n=d.tasks.filter(t=>t[2]).length,p=d.tasks.length?n/d.tasks.length*100:0;return `<div class="week-bar-wrap"><div class="week-bar" style="height:${Math.max(5,p*.65)}px;background:${dayColors[i]}" title="${d.day}: ${p}%"></div><span>${d.day.slice(0,1)}</span></div>`}).join('');
 $('#weekly-habits').innerHTML=habits.slice(0,5).map(h=>`<label class="focus-item"><input type="checkbox" ${isHabitDone(h.id,selectedCalendarDate)?'checked':''} data-week-habit="${h.id}"><span>${h.emoji} ${esc(h.name)}</span></label>`).join('')||'<span class="muted">عادت‌ها اینجا نمایش داده می‌شن.</span>';
 $$('#weekly-habits input').forEach(c=>c.onchange=()=>{const k=logKey(+c.dataset.weekHabit,selectedCalendarDate);if(c.checked)habitLogs[k]=true;else delete habitLogs[k];save('habitLogs',habitLogs);renderHabits();renderWeekly()});
 $('#weekly-days').innerHTML=visibleWeek.map((d,i)=>{const doneN=d.tasks.filter(t=>t[2]).length,total=d.tasks.length,p=total?Math.round(doneN/total*100):0;return `<article class="day-card" style="--day-color:${dayColors[i]}"><header class="day-header"><h3>${d.day}</h3><span>${faDate(new Date(d.date+'T12:00:00'))}${d.date===selectedCalendarDate?' · انتخاب‌شده':''}</span></header><div class="day-stats"><div class="day-stat"><b>${doneN}</b><span>انجام‌شده</span></div><div class="day-stat"><b>${total-doneN}</b><span>باقی‌مانده</span></div><div class="day-stat"><b>${total}</b><span>کل وظایف</span></div></div><div class="day-focus">تمرکز اصلی: <b>${esc(d.focus||'تعیین نشده')}</b> · ${p}%</div><div class="day-task-list">${d.tasks.map((t,j)=>`<label class="day-task ${t[2]?'done':''}"><input type="checkbox" data-date="${d.date}" data-task="${j}" ${t[2]?'checked':''}><span class="task-name">${esc(t[0])}</span><span class="task-priority">${esc(t[1])}</span></label>`).join('')}<button type="button" class="add-day-task" data-add-date="${d.date}">＋ افزودن کار برای ${d.day}</button></div></article>`}).join('');
 $$('#weekly-days input[type=checkbox]').forEach(c=>c.onchange=()=>{const day=weekly.find(d=>d.date===c.dataset.date);if(day)day.tasks[+c.dataset.task][2]=c.checked;save('weekly',weekly);renderWeekly()});
 $$('[data-add-date]').forEach(btn=>btn.onclick=()=>openModal('weekly',null,btn.dataset.addDate));
}
function renderAll(){renderAssignments();renderHabits();renderWeekly()}
$('#assignment-search').addEventListener('input',renderAssignments);$('#assignment-filter').addEventListener('change',renderAssignments);
$('#add-habit').onclick=()=>openModal('habit');
const dialog=$('#item-dialog'),fields=$('#modal-fields');
function field(label,name,type='text',value='',opts=null,full=false){let input=type==='textarea'?`<textarea name="${name}" ${full?'':' '}>${esc(value)}</textarea>`:type==='select'?`<select name="${name}">${opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===value?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="1"':''} required>`;return `<div class="field ${full?'full':''}"><label>${label}</label>${input}</div>`}
function openModal(type,id=null,dayIndex=null){
 editing={type,id,dayIndex};let item=null;
 if(type==='assignment')item=id?assignments.find(x=>x.id===id):{course:'',type:'تمرین',desc:'',priority:'متوسط',status:'todo',date:iso(today),note:''};
 if(type==='habit')item=id?habits.find(x=>x.id===id):{name:'',emoji:'✨',category:'یادگیری',goal:1,color:1};
 if(type==='weekly')item={name:'',priority:'متوسط'};
 $('#modal-title').textContent=({assignment:id?'ویرایش تکلیف':'افزودن تکلیف',habit:id?'ویرایش عادت':'افزودن عادت',weekly:'افزودن کار به برنامه'})[type];
 let html='';
 if(type==='assignment')html=field('نام درس','course','text',item.course)+field('نوع تکلیف','type','select',item.type,[['تمرین','تمرین'],['گزارش','گزارش'],['پروژه','پروژه'],['مطالعه','مطالعه'],['امتحان','امتحان']])+field('توضیحات','desc','text',item.desc,null,true)+field('اولویت','priority','select',item.priority,[['بالا','بالا'],['متوسط','متوسط'],['کم','کم']])+field('وضعیت','status','select',item.status,[['todo','شروع نشده'],['doing','در حال انجام'],['done','انجام شده']])+field('ددلاین','date','date',item.date)+field('یادداشت','note','textarea',item.note,null,true);
 if(type==='habit')html=field('نام عادت','name','text',item.name)+field('ایموجی / نشانه','emoji','text',item.emoji)+field('دسته‌بندی','category','select',item.category,[['سلامت','سلامت'],['یادگیری','یادگیری'],['سبک زندگی','سبک زندگی'],['شخصی','شخصی']])+field('هدف عددی','goal','number',item.goal)+field('رنگ','color','select',String(item.color),[['0','آبی'],['1','سبز'],['2','بنفش'],['3','نارنجی'],['4','صورتی']]);
 if(type==='weekly')html=field('عنوان کار','name','text','',null,true)+field('اولویت','priority','select','متوسط',[['کم','کم'],['متوسط','متوسط'],['زیاد','زیاد']]);
 fields.innerHTML=html;dialog.showModal();
}
function closeModal(){dialog.close();editing={type:null,id:null}}
$('#modal-close').onclick=closeModal;$('#modal-cancel').onclick=closeModal;
$('#item-form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());const {type,id,dayIndex}=editing;
 if(type==='assignment'){if(id){Object.assign(assignments.find(a=>a.id===id),data)}else assignments.unshift({...data,id:Date.now()});save('assignments',assignments)}
 if(type==='habit'){data.goal=+data.goal;data.color=+data.color;if(id)Object.assign(habits.find(h=>h.id===id),data);else habits.push({...data,id:Date.now()});save('habits',habits)}
 if(type==='weekly'){let day=weekly.find(d=>d.date===dayIndex);if(!day){const dt=new Date((dayIndex||selectedCalendarDate)+'T12:00:00');const off=(dt.getDay()+1)%7;dt.setDate(dt.getDate()-off);for(let i=0;i<7;i++){const d=new Date(dt);d.setDate(dt.getDate()+i);const key=iso(d);if(!weekly.some(x=>x.date===key))weekly.push({day:weekDayName(i),date:key,focus:'',tasks:[]});}day=weekly.find(d=>d.date===dayIndex)}if(day)day.tasks.push([data.name,data.priority,false]);save('weekly',weekly)}
 closeModal();renderAll();
};
renderAll();setView('assignments');


// Per-day cleanup: only data attached to the currently selected date is removed.
$('#clear-day-data').addEventListener('click',()=>{
 if(!confirm(`فقط اطلاعات مربوط به ${selectedCalendarDate} پاک شود؟ عادت‌های تعریف‌شده حذف نمی‌شوند؛ فقط ثبت‌های همان روز پاک می‌شوند.`))return;
 assignments=assignments.filter(a=>a.date!==selectedCalendarDate);
 const prefix='_'+selectedCalendarDate;
 Object.keys(habitLogs).forEach(k=>{if(k.endsWith(prefix))delete habitLogs[k]});
 const day=weekly.find(d=>d.date===selectedCalendarDate); if(day)day.tasks=[];
 save('assignments',assignments);save('habitLogs',habitLogs);save('weekly',weekly);renderAll();
});
// Theme preference
const savedTheme=localStorage.getItem('littlePlanner_theme')||'light';
function applyTheme(theme){document.body.classList.toggle('dark-mode',theme==='dark');$('#theme-toggle').textContent=theme==='dark'?'☀ لایت':'☾ دارک';localStorage.setItem('littlePlanner_theme',theme)}
applyTheme(savedTheme);
$('#theme-toggle').addEventListener('click',()=>applyTheme(document.body.classList.contains('dark-mode')?'light':'dark'));
// Full interface localization. All static text, generated UI, form controls and document direction are translated.
let uiLang=localStorage.getItem('littlePlanner_lang')||'fa';
const translations={
'فضای کوچک برای نظم بزرگ':'A little space for a more organized life','فضای کاری':'WORKSPACE','تکالیف':'Assignments','عادت‌ها':'Habits','پلنر هفتگی':'Weekly Planner','قدم‌های کوچک':'Small steps','هر روز کمی بهتر از دیروز.':'A little better every day.','پاک کردن اطلاعات همین روز':'Clear this day only','نسخه شخصی · ۲۰۲۶':'PERSONAL EDITION · 2026','ردیاب عادت‌ها':'Habit Tracker','همه‌ی کارهای درسی، یک‌جا و مرتب.':'All your schoolwork, organized in one place.','تداوم‌های کوچک، تغییرهای بزرگ می‌سازند.':'Small consistent steps create big changes.','برای هفته‌ات جا باز کن، نه فقط برای کارها.':'Make room for your week, not just your tasks.','＋ افزودن تکلیف':'＋ Add assignment','＋ عادت جدید':'＋ Add habit','＋ افزودن کار':'＋ Add task','☾ دارک':'☾ Dark','☀ لایت':'☀ Light','امروز':'Today','پیشرفت کلی':'Overall progress','این ترم':'THIS TERM','٪':'%','از تکالیف ثبت‌شده':'of assignments completed','تکالیف باقی‌مانده':'Remaining assignments','کارهایی که هنوز تمام نشده‌اند':'Tasks that are not finished yet','اولویت تکالیف':'Assignment priorities','بالا':'High','متوسط':'Medium','کم':'Low','وضعیت تکالیف':'Assignment status','انجام‌شده':'Completed','در حال انجام':'In progress','شروع نشده':'Not started','فهرست تکالیف':'Assignment list','جزئیات درس‌ها و ددلاین‌ها را اینجا مدیریت کن.':'Manage course details and deadlines here.','جست‌وجوی تکلیف...':'Search assignments...','همه وضعیت‌ها':'All statuses','نام درس':'Course','نوع تکلیف':'Type','توضیحات':'Description','اولویت':'Priority','وضعیت':'Status','تاریخ':'Date','روز باقی‌مانده':'Days left','یادداشت':'Notes','هنوز تکلیفی ثبت نکردی. اولین مورد را اضافه کن.':'No assignments yet. Add your first one.','روند استمرار':'Consistency trend','تعداد عادت‌های انجام‌شده در روزهای اخیر':'Habits completed in recent days','۳۰ روز اخیر':'LAST 30 DAYS','عادت‌های فعال':'Active habits','عادت‌هایی که دنبال می‌کنی':'Habits you are tracking','خلاصه‌ی امروز':'Today at a glance','پیشرفت روزانه':'Daily progress','از عادت‌ها کامل شده':'of habits completed','تقویم پیگیری عادت‌ها':'Habit tracker calendar','برای ثبت عادت روزانه، خانه‌ی مربوط به امروز را علامت بزن.':'Mark today’s cell to log a daily habit.','سلامت':'Health','یادگیری':'Learning','سبک زندگی':'Lifestyle','شخصی':'Personal','لیست عادت‌ها':'Habit list','اسم، دسته‌بندی و هدف هر عادت را ویرایش کن.':'Edit each habit’s name, category, and goal.','تقویم ماه':'Monthly calendar','ماه قبل':'Previous month','ماه بعد':'Next month','پیشرفت هفتگی':'Weekly progress','کارهای تکمیل‌شده':'Tasks completed','عادت‌های این هفته':'Habits this week','اطلاعات به‌صورت خودکار در همین مرورگر ذخیره می‌شود.':'Your information is saved automatically in this browser.','افزودن مورد جدید':'Add a new item','انصراف':'Cancel','ذخیره اطلاعات':'Save changes','ویرایش تکلیف':'Edit assignment','افزودن تکلیف':'Add assignment','ویرایش عادت':'Edit habit','افزودن عادت':'Add habit','افزودن کار به برنامه':'Add task to plan','نوع تکلیف':'Assignment type','تمرین':'Exercise','گزارش':'Report','پروژه':'Project','مطالعه':'Study','امتحان':'Exam','ددلاین':'Due date','ایموجی / نشانه':'Emoji / symbol','هدف عددی':'Daily goal','رنگ':'Color','آبی':'Blue','سبز':'Green','بنفش':'Purple','نارنجی':'Orange','صورتی':'Pink','عنوان کار':'Task title','زیاد':'High','حذف این تکلیف':'Delete this assignment','حذف این عادت':'Delete this habit','حذف این کار':'Delete this task','فقط اطلاعات مربوط به':'Only information for ','پاک شود؟ عادت‌های تعریف‌شده حذف نمی‌شوند؛ فقط ثبت‌های همان روز پاک می‌شوند.':' be cleared? Habit definitions will stay; only logs for that day will be removed.','روز گذشته':'days overdue','امروز':'Today','made for your future self':'made for your future self','ورود / ساخت حساب':'Sign in / Create account','نام کامل':'Full name','نام کاربری':'Username','ایمیل':'Email','رمز عبور':'Password','حداقل ۶ کاراکتر':'At least 6 characters','این ایمیل یا نام کاربری قبلاً ثبت شده.':'This email or username is already registered.','ایمیل یا رمز عبور درست نیست.':'Incorrect email or password.','ماه':'Month','افزودن':'Add','ذخیره':'Save','عادت روزانه':'Daily habit','ویرایش':'Edit','تاریخ انتخاب‌شده:':'Selected date:','تمرکز اصلی:':'Main focus:','تعیین نشده':'Not set','باقی‌مانده':'Remaining','کل وظایف':'Total tasks','افزودن کار برای':'Add task for','عادت‌ها اینجا نمایش داده می‌شن.':'Your habits will appear here.','هنوز عادتی اضافه نشده.':'No habits added yet.','هدف:':'Goal:','لیوان/دقیقه':'glasses/minutes','روز از ۳۰ روز':'days out of 30','انتخاب‌شده':'Selected','این هفته':'This week','تاریخ انتخاب‌شده':'Selected date','تکلیف':'assignment','تکالیف':'Assignments','عادت':'habit','کار':'task','روز':'day','ماه':'month','سال':'year','سه‌شنبه':'Tuesday','شنبه':'Saturday','یکشنبه':'Sunday','دوشنبه':'Monday','چهارشنبه':'Wednesday','پنجشنبه':'Thursday','جمعه':'Friday','مهر':'Mehr','آبان':'Aban','آذر':'Azar','دی':'Dey','بهمن':'Bahman','اسفند':'Esfand','فروردین':'Farvardin','اردیبهشت':'Ordibehesht','خرداد':'Khordad','تیر':'Tir','مرداد':'Mordad','شهریور':'Shahrivar'
};
const faMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function translateText(text){
 const trimmed=text.trim(); if(!trimmed)return text;
 if(uiLang==='en'){
   if(translations[trimmed])return text.replace(trimmed,translations[trimmed]);
   let m=trimmed.match(/^(\d+) مورد از (\d+) تکلیف کامل شده$/);if(m)return `${m[1]} of ${m[2]} assignments completed`;
   m=trimmed.match(/^(\d+) روز گذشته$/);if(m)return `${m[1]} days overdue`;
   m=trimmed.match(/^انجام‌شده (\d+)$/);if(m)return `Completed ${m[1]}`;
   m=trimmed.match(/^در حال انجام (\d+)$/);if(m)return `In progress ${m[1]}`;
   m=trimmed.match(/^شروع نشده (\d+)$/);if(m)return `Not started ${m[1]}`;
   m=trimmed.match(/^(\d+) از (\d+)$/);if(m)return `${m[1]} of ${m[2]}`;
   return text;
 }
 const reverse=Object.fromEntries(Object.entries(translations).map(([fa,en])=>[en,fa]));
 if(reverse[trimmed])return text.replace(trimmed,reverse[trimmed]);
 let m=trimmed.match(/^(.+) of (\d+) assignments completed$/);if(m)return `${m[1]} مورد از ${m[2]} تکلیف کامل شده`;
 m=trimmed.match(/^Completed (\d+)$/);if(m)return `انجام‌شده ${m[1]}`;
 m=trimmed.match(/^In progress (\d+)$/);if(m)return `در حال انجام ${m[1]}`;
 m=trimmed.match(/^Not started (\d+)$/);if(m)return `شروع نشده ${m[1]}`;
 m=trimmed.match(/^(\d+) of (\d+)$/);if(m)return `${m[1]} از ${m[2]}`;
 return text;
}
function applyLanguage(lang){
 uiLang=lang;localStorage.setItem('littlePlanner_lang',lang);
 document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';
 document.body.classList.toggle('english-ui',lang==='en');
 $('#language-toggle').textContent=lang==='fa'?'EN':'فا';
 // Restore all known original Persian strings first, then translate. Re-rendering is handled by the observer below.
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{const parent=n.parentElement;if(!parent||['SCRIPT','STYLE'].includes(parent.tagName)||parent.closest('#auth-dialog'))return;const raw=n.nodeValue;const t=translateText(raw);if(t!==raw)n.nodeValue=t;});
 $$('input[placeholder],textarea[placeholder]').forEach(el=>{if(!el.dataset.faPlaceholder)el.dataset.faPlaceholder=el.placeholder;el.placeholder=lang==='en'?(translations[el.dataset.faPlaceholder]||el.dataset.faPlaceholder):el.dataset.faPlaceholder;});
 $$('[aria-label]').forEach(el=>{if(!el.dataset.faAria)el.dataset.faAria=el.getAttribute('aria-label');el.setAttribute('aria-label',lang==='en'?(translations[el.dataset.faAria]||el.dataset.faAria):el.dataset.faAria)});
 $('#theme-toggle').textContent=document.body.classList.contains('dark-mode')?(lang==='fa'?'☀ لایت':'☀ Light'):(lang==='fa'?'☾ دارک':'☾ Dark');
 const views={assignments:['STUDY SPACE / 01',lang==='fa'?'تکالیف':'Assignments',lang==='fa'?'همه‌ی کارهای درسی، یک‌جا و مرتب.':'All your schoolwork, organized in one place.',lang==='fa'?'＋ افزودن تکلیف':'＋ Add assignment'],habits:['DAILY RHYTHM / 02',lang==='fa'?'ردیاب عادت‌ها':'Habit Tracker',lang==='fa'?'تداوم‌های کوچک، تغییرهای بزرگ می‌سازند.':'Small consistent steps create big changes.',lang==='fa'?'＋ عادت جدید':'＋ Add habit'],weekly:['WEEK AT A GLANCE / 03',lang==='fa'?'پلنر هفتگی':'Weekly Planner',lang==='fa'?'برای هفته‌ات جا باز کن، نه فقط برای کارها.':'Make room for your week, not just your tasks.',lang==='fa'?'＋ افزودن کار':'＋ Add task']};
 const active=$('.nav-link.active')?.dataset.view||'assignments';$('#top-eyebrow').textContent=views[active][0];$('#page-title').textContent=views[active][1];$('#page-subtitle').textContent=views[active][2];$('#main-add').textContent=views[active][3];
 $('#today-label').textContent=lang==='fa'?new Intl.DateTimeFormat('fa-IR',{weekday:'long',day:'numeric',month:'long'}).format(today):new Intl.DateTimeFormat('en-US',{weekday:'long',day:'numeric',month:'long'}).format(today);
}
$('#language-toggle').addEventListener('click',()=>{applyLanguage(uiLang==='fa'?'en':'fa');renderAll();});
const languageObserver=new MutationObserver(()=>{if(!languageObserver.busy){languageObserver.busy=true;applyLanguage(uiLang);languageObserver.busy=false;}});
languageObserver.observe(document.body,{childList:true,subtree:true});
applyLanguage(uiLang);
// Add an individual trash button beside each weekly task.
function addWeeklyTrashButtons(){ $$('.day-task').forEach(label=>{if(label.querySelector('.delete-day-task'))return;const checkbox=label.querySelector('input');const del=document.createElement('button');del.type='button';del.className='icon-btn delete-day-task';del.title='حذف این کار';del.textContent='🗑';del.dataset.date=checkbox.dataset.date;del.dataset.task=checkbox.dataset.task;label.appendChild(del);}); }
const weeklyObserver=new MutationObserver(()=>addWeeklyTrashButtons());weeklyObserver.observe($('#weekly-days'),{childList:true,subtree:true});addWeeklyTrashButtons();
document.addEventListener('click',e=>{const b=e.target.closest('.delete-day-task');if(!b)return;e.preventDefault();e.stopPropagation();const day=weekly.find(d=>d.date===b.dataset.date);if(!day)return;day.tasks.splice(Number(b.dataset.task),1);save('weekly',weekly);renderWeekly();});
