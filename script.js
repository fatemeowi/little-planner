const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const today = new Date();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const faDate = d => new Intl.DateTimeFormat('fa-IR',{day:'numeric',month:'short'}).format(d);
const weekDaysFa = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const dayColors = ['#d6eff0','#fbe2dc','#f9d9e8','#fce9bd','#e8e3fa','#dcefe5','#f5e4cf'];
const habitColors = ['#55b7cf','#65c49d','#b18bdd','#e1a84d','#dc7e88'];
const defaultAssignments = [];
const defaultHabits = [];
const makeEmptyWeek = (anchor = today) => {
 const start = new Date(anchor); const offset = (start.getDay()+1)%7; start.setDate(start.getDate()-offset);
 return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return {day:weekDaysFa[i],date:iso(d),focus:'',tasks:[]};});
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
 <td><button class="icon-btn delete-assignment" title="حذف">×</button></td></tr>`).join('');
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
 let table='<thead><tr><th>عادت روزانه</th>'+dates.map(d=>`<th title="${d}">${new Intl.DateTimeFormat('fa-IR',{day:'numeric'}).format(new Date(d+'T12:00:00'))}</th>`).join('')+'</tr></thead><tbody>';
 table+=habits.map(h=>`<tr><td>${h.emoji} ${esc(h.name)}</td>${dates.map(d=>`<td><input class="habit-check" type="checkbox" data-habit="${h.id}" data-date="${d}" style="--habit-color:${habitColors[h.color%habitColors.length]}" ${isHabitDone(h.id,d)?'checked':''} aria-label="${esc(h.name)} ${d}"></td>`).join('')}</tr>`).join('');
 $('#habit-calendar').innerHTML=table+'</tbody>';
 $$('.habit-check').forEach(ch=>ch.addEventListener('change',()=>{const k=logKey(+ch.dataset.habit,ch.dataset.date);if(ch.checked)habitLogs[k]=true;else delete habitLogs[k];save('habitLogs',habitLogs);renderHabits();renderWeekly()}));
 $('#habit-cards').innerHTML=habits.map(h=>{const count=lastDates.filter(d=>isHabitDone(h.id,d)).length;return `<article class="habit-card"><div class="habit-card-head"><div class="habit-emoji">${h.emoji}</div><b>${esc(h.name)}</b><button class="icon-btn edit-habit" data-id="${h.id}" title="ویرایش">✎</button><button class="icon-btn delete-habit" data-id="${h.id}" title="حذف">×</button></div><p>${esc(h.category)} · هدف: ${h.goal}${h.category==='سلامت'&&h.goal>1?' لیوان/دقیقه':''}</p><div class="progress-track"><span style="width:${count/30*100}%;background:${habitColors[h.color%habitColors.length]}"></span></div><div class="habit-card-foot"><span>${count} روز از ۳۰ روز</span><b>${Math.round(count/30*100)}%</b></div></article>`}).join('');
 $$('.edit-habit').forEach(b=>b.onclick=()=>openModal('habit',+b.dataset.id));$$('.delete-habit').forEach(b=>b.onclick=()=>{habits=habits.filter(h=>h.id!==+b.dataset.id);save('habits',habits);renderAll()});
}
function renderMiniCalendar(){
 const year=displayedMonth.getFullYear(),month=displayedMonth.getMonth();
 const first=new Date(year,month,1),last=new Date(year,month+1,0);
 $('#mini-month-title').textContent=new Intl.DateTimeFormat('fa-IR',{month:'long',year:'numeric'}).format(first);
 $('#selected-date-label').textContent='تاریخ انتخاب‌شده: '+new Intl.DateTimeFormat('fa-IR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(selectedCalendarDate+'T12:00:00'));
 const offset=(first.getDay()+1)%7;
 let out=['ش','ی','د','س','چ','پ','ج'].map(x=>`<span class="weekday">${x}</span>`).join('');
 for(let i=0;i<offset;i++)out+='<span class="muted-day"></span>';
 for(let n=1;n<=last.getDate();n++){const d=new Date(year,month,n),key=iso(d);const cls=[key===selectedCalendarDate?'selected':'',key===iso(today)?'today-date':''].filter(Boolean).join(' ');out+=`<button type="button" class="calendar-day ${cls}" data-date="${key}">${new Intl.NumberFormat('fa-IR').format(n)}</button>`;}
 $('#mini-calendar').innerHTML=out;
 $$('#mini-calendar .calendar-day').forEach(btn=>btn.addEventListener('click',()=>{selectedCalendarDate=btn.dataset.date;renderWeekly();}));
}
$('#month-prev').addEventListener('click',()=>{displayedMonth=new Date(displayedMonth.getFullYear(),displayedMonth.getMonth()-1,1);renderMiniCalendar()});
$('#month-next').addEventListener('click',()=>{displayedMonth=new Date(displayedMonth.getFullYear(),displayedMonth.getMonth()+1,1);renderMiniCalendar()});
$('#month-today').addEventListener('click',()=>{selectedCalendarDate=iso(today);displayedMonth=new Date(today.getFullYear(),today.getMonth(),1);renderWeekly()});
function renderWeekly(){
 const anchor=new Date(selectedCalendarDate+'T12:00:00');const offset=(anchor.getDay()+1)%7;const weekStart=new Date(anchor);weekStart.setDate(anchor.getDate()-offset);
 const visibleWeek=Array.from({length:7},(_,i)=>{const date=new Date(weekStart);date.setDate(weekStart.getDate()+i);const key=iso(date);let item=weekly.find(d=>d.date===key);if(!item){item={day:weekDaysFa[i],date:key,focus:'',tasks:[]};weekly.push(item)}item.day=weekDaysFa[i];return item;});
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
 if(type==='weekly'){let day=weekly.find(d=>d.date===dayIndex);if(!day){const dt=new Date((dayIndex||selectedCalendarDate)+'T12:00:00');const off=(dt.getDay()+1)%7;dt.setDate(dt.getDate()-off);for(let i=0;i<7;i++){const d=new Date(dt);d.setDate(dt.getDate()+i);const key=iso(d);if(!weekly.some(x=>x.date===key))weekly.push({day:weekDaysFa[i],date:key,focus:'',tasks:[]});}day=weekly.find(d=>d.date===dayIndex)}if(day)day.tasks.push([data.name,data.priority,false]);save('weekly',weekly)}
 closeModal();renderAll();
};
renderAll();setView('assignments');

$('#clear-all-data').addEventListener('click',()=>{
 if(!confirm('همه‌ی تکالیف، عادت‌ها و برنامه‌های ذخیره‌شده پاک شوند؟ این کار قابل بازگشت نیست.'))return;
 assignments=[];habits=[];weekly=makeEmptyWeek();habitLogs={};
 ['assignments','habits','weekly','habitLogs'].forEach(k=>localStorage.removeItem('littlePlanner_'+k));
 selectedCalendarDate=iso(today);displayedMonth=new Date(today.getFullYear(),today.getMonth(),1);renderAll();
});
