(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Kuku = factory();
}(this, function () {
  'use strict';
  var readings = [
    ['いんいち','いんに','いんさん','いんし','いんご','いんろく','いんしち','いんはち','いんく'],
    ['にいち','にに','にさん','にし','にご','にろく','にしち','にはち','にく'],
    ['さんいち','さんに','さざん','さんし','さんご','さぶろく','さんしち','さんぱ','さんく'],
    ['しいち','しに','しさん','しし','しご','しろく','ししち','しは','しく'],
    ['ごいち','ごに','ごさん','ごし','ごご','ごろく','ごしち','ごは','ごっく'],
    ['ろくいち','ろくに','ろくさん','ろくし','ろくご','ろくろく','ろくしち','ろくは','ろっく'],
    ['しちいち','しちに','しちさん','しちし','しちご','しちろく','しちしち','しちは','しちく'],
    ['はちいち','はちに','はちさん','はちし','はちご','はちろく','はちしち','はっぱ','はっく'],
    ['くいち','くに','くさん','くし','くご','くろく','くしち','くは','くく']
  ];
  var ones = ['','いち','に','さん','し','ご','ろく','しち','はち','く'];
  function answerReading(n) { return n < 10 ? ones[n] : (n < 20 ? 'じゅう' : ones[Math.floor(n / 10)] + 'じゅう') + ones[n % 10]; }
  var facts = [];
  for (var a=1;a<=9;a++) for(var b=1;b<=9;b++) facts.push({id:a+'x'+b,a:a,b:b,answer:a*b,reading:readings[a-1][b-1],answerReading:answerReading(a*b)});
  function stat() { return {attempts:0,correct:0,streak:0,stars:0,recent:[]}; }
  var treasures=[{id:'seed',name:'ゆうきのたね',at:1,description:'やってみた！から そだつ たね。'},{id:'stone',name:'ひらめきのいし',at:5,description:'あたらしい きづきが きらり。'},{id:'leaf',name:'もういちどのはっぱ',at:12,description:'もういちど やってみる ちから。'},{id:'feather',name:'にじいろのはね',at:25,description:'すこしずつ すすむ きみの はね。'},{id:'medal',name:'チャレンジメダル',at:50,description:'たくさんの トライの あかし。'},{id:'chest',name:'ぼうけんのたからばこ',at:100,description:'きみの ちょうせんは たからもの。'}];
  function user(name,id) { return {id:id || 'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:name,stats:{},xp:0,pending:[],tryPoints:0,niceTries:0,recoveries:0}; }
  function inventory(u){return treasures.filter(function(t){return u.tryPoints>=t.at;});}
  function nextTreasure(u){return treasures.filter(function(t){return u.tryPoints<t.at;})[0]||null;}
  function getStat(u,id) { return u.stats[id] || stat(); }
  function record(u,id,ok) {
    if (!facts.some(function(f){return f.id===id;})) throw new Error('unknown fact');
    var wasPending=u.pending.indexOf(id)!==-1,oldPoints=u.tryPoints;
    var s=u.stats[id] || (u.stats[id]=stat());
    s.attempts++; if(ok)s.correct++;
    s.streak=ok ? Math.min(3,s.streak+1) : 0;
    s.stars=Math.max(s.stars,s.streak);
    s.recent.push(ok);s.recent=s.recent.slice(-5);
    u.xp+=3;
    var tryGain=!ok?1:wasPending?2:0;
    u.tryPoints+=tryGain;if(!ok)u.niceTries++;if(ok&&wasPending)u.recoveries++;
    u.pending=u.pending.filter(function(x){return x!==id;});
    if(!ok)u.pending.push(id);
    return {xp:3,tryGain:tryGain,recovered:ok&&wasPending,items:treasures.filter(function(t){return t.at>oldPoints&&t.at<=u.tryPoints;})};
  }
  function group(dan) { return facts.filter(function(f){return !dan || f.a===dan;}); }
  function rank(u,dan) {
    var fs=group(dan),level=Math.min.apply(null,fs.map(function(f){return getStat(u,f.id).stars;}));
    var count=level===3?fs.length:fs.filter(function(f){return getStat(u,f.id).stars>=level+1;}).length;
    return {level:level,count:count,total:fs.length,left:fs.length-count};
  }
  function weakness(u,id) {
    var s=getStat(u,id);if(!s.attempts)return -1;
    var misses=s.recent.filter(function(x){return !x;}).length;
    return misses/s.recent.length;
  }
  function weakFacts(u) { return facts.filter(function(f){return weakness(u,f.id)>0;}).sort(function(a,b){return weakness(u,b.id)-weakness(u,a.id) || (getStat(u,b.id).attempts-getStat(u,b.id).correct)-(getStat(u,a.id).attempts-getStat(u,a.id).correct);}); }
  function shuffle(arr,rng) {arr=arr.slice();rng=rng||Math.random;for(var i=arr.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),v=arr[i];arr[i]=arr[j];arr[j]=v;}return arr;}
  function plan(u,mode,dan,ordered,rng) {
    var pool=mode==='weak'?weakFacts(u):group(mode==='dan'?dan:0);
    if(!pool.length)return [];
    if(mode==='weak')pool=pool.slice(0,10);
    var base=ordered?pool.slice():shuffle(pool,rng),queue=[];
    if(!ordered) {
      var pending=base.filter(function(f){return u.pending.indexOf(f.id)!==-1;});
      base=pending.concat(base.filter(function(f){return u.pending.indexOf(f.id)===-1;}));
    }
    while(queue.length<10) {for(var i=0;i<base.length&&queue.length<10;i++)queue.push(base[i]);}
    return queue;
  }
  function defer(queue,index,fact) {
    var target=index+3;
    if(target<queue.length) {var existing=-1;for(var i=target;i<queue.length;i++)if(queue[i].id===fact.id){existing=i;break;}
      if(existing>=0){var swap=queue[target];queue[target]=queue[existing];queue[existing]=swap;}else queue[target]=fact;}
  }
  function int(n,max) {return typeof n==='number'&&isFinite(n)&&Math.floor(n)===n&&n>=0&&n<=max;}
  function validate(data) {
    if(!data||data.app!=='kuku-quest'||(data.version!==1&&data.version!==2)||!Array.isArray(data.users)||data.users.length<1||data.users.length>5)throw new Error('このアプリの バックアップを えらんでね。');
    var ids=[],users=data.users.map(function(u){
      if(!u||typeof u.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(u.id)||ids.indexOf(u.id)>=0||typeof u.name!=='string'||!u.name.trim()||u.name.length>12||!int(u.xp,1000000000)||!u.stats||typeof u.stats!=='object'||Array.isArray(u.stats)||!Array.isArray(u.pending))throw new Error('データの かたちが ちがうよ。');
      ids.push(u.id);var clean=user(u.name.trim(),u.id);clean.xp=u.xp;
      Object.keys(u.stats).forEach(function(id){var s=u.stats[id];if(!facts.some(function(f){return f.id===id;})||!s||!int(s.attempts,100000000)||!int(s.correct,s.attempts)||!int(s.streak,3)||!int(s.stars,3)||s.stars<s.streak||s.correct<s.stars||!Array.isArray(s.recent)||s.recent.length!==Math.min(5,s.attempts)||s.recent.some(function(x){return typeof x!=='boolean';}))throw new Error('きろくを よみこめなかったよ。');clean.stats[id]={attempts:s.attempts,correct:s.correct,streak:s.streak,stars:s.stars,recent:s.recent.slice()};});
      var oldTries=Object.keys(clean.stats).reduce(function(n,id){return n+clean.stats[id].attempts-clean.stats[id].correct;},0);
      if(data.version===1){clean.niceTries=oldTries;clean.tryPoints=oldTries;}
      else {if(!int(u.tryPoints,30000000000)||!int(u.niceTries,10000000000)||!int(u.recoveries,10000000000)||u.niceTries!==oldTries||u.recoveries>u.niceTries||u.tryPoints!==u.niceTries+2*u.recoveries)throw new Error('トライスターの きろくを よみこめなかったよ。');clean.tryPoints=u.tryPoints;clean.niceTries=u.niceTries;clean.recoveries=u.recoveries;}
      if(u.pending.length>81||u.pending.some(function(id){return !facts.some(function(f){return f.id===id;});}))throw new Error('きろくを よみこめなかったよ。');
      clean.pending=u.pending.filter(function(id,i,a){return a.indexOf(id)===i;});return clean;
    });
    return {app:'kuku-quest',version:2,users:users,active:ids.indexOf(data.active)>=0?data.active:ids[0]};
  }
  return {facts:facts,user:user,stat:stat,getStat:getStat,record:record,group:group,rank:rank,weakness:weakness,weakFacts:weakFacts,plan:plan,defer:defer,validate:validate,answerReading:answerReading,treasures:treasures,inventory:inventory,nextTreasure:nextTreasure};
}));
