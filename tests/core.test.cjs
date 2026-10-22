const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../docs/core.js');
test('81 facts, products, explicit 4×6 pronunciation',()=>{
 assert.equal(K.facts.length,81);assert.equal(new Set(K.facts.map(f=>f.id)).size,81);
 for(const f of K.facts){assert.equal(f.answer,f.a*f.b);assert.ok(f.reading);assert.ok(f.answerReading);}
 const f=K.facts.find(f=>f.id==='4x6');assert.equal(f.reading,'しろく');assert.equal(f.answerReading,'にじゅうし');
});
test('rank requires every fact, earned rank survives errors, next indicator is exact',()=>{
 const u=K.user('test');for(let i=0;i<50;i++)K.record(u,'1x1',true);
 assert.deepEqual(K.rank(u,1),{level:0,count:1,total:9,left:8});
 for(let n=2;n<=9;n++)K.record(u,'1x'+n,true);
 assert.equal(K.rank(u,1).level,1);assert.equal(K.rank(u,1).left,8);
 for(let n=1;n<=9;n++)K.record(u,'1x'+n,true);
 assert.equal(K.rank(u,1).level,2);
 for(let n=1;n<=9;n++)K.record(u,'1x'+n,true);
 assert.equal(K.rank(u,1).level,3);assert.equal(K.rank(u,0).level,0);
 K.record(u,'1x1',false);assert.equal(K.rank(u,1).level,3);assert.equal(K.getStat(u,'1x1').streak,0);
 for(const f of K.facts)for(let n=0;n<3;n++)K.record(u,f.id,true);
 assert.equal(K.rank(u,0).level,3);assert.equal(K.rank(u,0).left,0);
});
test('mistakes reset current streak, recent accuracy recovers after 5 correct',()=>{
 const u=K.user('test');K.record(u,'4x6',true);K.record(u,'4x6',false);K.record(u,'4x6',true);
 assert.equal(K.getStat(u,'4x6').stars,1);assert.equal(K.weakness(u,'4x6'),1/3);
 for(let i=0;i<4;i++)K.record(u,'4x6',true);
 assert.equal(K.weakness(u,'4x6'),0);assert.equal(K.weakFacts(u).length,0);assert.equal(u.pending.length,0);
 assert.equal(u.xp,21);
});
test('all modes exactly 10, row isolation, weak ordering, delayed retry',()=>{
 const u=K.user('test');assert.equal(K.plan(u,'weak',0,false).length,0);
 for(let d=1;d<=9;d++){const p=K.plan(u,'dan',d,true);assert.equal(p.length,10);assert.ok(p.every(f=>f.a===d));assert.deepEqual(p.slice(0,9).map(f=>f.b),[1,2,3,4,5,6,7,8,9]);}
 for(let i=0;i<50;i++){const p=K.plan(u,'random',0,false);assert.equal(p.length,10);assert.equal(new Set(p.map(f=>f.id)).size,10);}
 K.record(u,'4x6',false);K.record(u,'7x8',false);K.record(u,'7x8',true);
 assert.equal(K.weakFacts(u)[0].id,'4x6');assert.ok(K.plan(u,'weak',0,false).every(f=>['4x6','7x8'].includes(f.id)));
 const p=K.plan(u,'dan',4,true);K.defer(p,0,p[0]);assert.equal(p.length,10);assert.equal(p[3].id,'4x1');
 K.defer(p,9,p[9]);assert.equal(p.length,10);assert.equal(K.plan(u,'dan',4,false)[0].id,'4x6');
});
test('backup round trip, 5 users, reject invalid import without mutating input',()=>{
 const users=Array.from({length:5},(_,i)=>K.user('user'+i,'u'+i));K.record(users[0],'4x6',false);K.record(users[0],'4x6',true);
 const data={app:'kuku-quest',version:2,users,active:'u3'};
 assert.deepEqual(K.validate(JSON.parse(JSON.stringify(data))),data);
 const bad=JSON.parse(JSON.stringify(data));bad.users.push(K.user('six'));assert.throws(()=>K.validate(bad));
 const duplicate=JSON.parse(JSON.stringify(data));duplicate.users[1].id='u0';assert.throws(()=>K.validate(duplicate));
 const malformed=JSON.parse(JSON.stringify(data));malformed.users[0].stats['4x6'].correct=999;assert.throws(()=>K.validate(malformed));
 const unknown=JSON.parse(JSON.stringify(data));unknown.users[0].pending.push('100x100');assert.throws(()=>K.validate(unknown));
 const restored=K.validate(data);K.record(restored.users[0],'4x6',true);assert.equal(users[0].stats['4x6'].attempts,2);
});
test('records are separated for each user',()=>{const a=K.user('a'),b=K.user('b');K.record(a,'4x6',true);assert.equal(K.getStat(b,'4x6').attempts,0);assert.equal(b.xp,0);});

test('nice try, recovery and treasures are persistent and do not double-award recovery',()=>{
 const u=K.user('try');let r=K.record(u,'4x6',false);assert.equal(r.tryGain,1);assert.equal(r.items[0].id,'seed');assert.equal(u.xp,3);
 r=K.record(u,'4x6',true);assert.equal(r.tryGain,2);assert.equal(r.recovered,true);
 r=K.record(u,'4x6',true);assert.equal(r.tryGain,0);assert.equal(u.tryPoints,3);assert.equal(u.xp,9);
 K.record(u,'4x6',false);r=K.record(u,'4x6',false);assert.equal(r.items[0].id,'stone');assert.equal(u.tryPoints,5);
 const data={app:'kuku-quest',version:2,users:[u],active:u.id};assert.deepEqual(K.validate(JSON.parse(JSON.stringify(data))),data);
 data.users[0].tryPoints++;assert.throws(()=>K.validate(data));
});
test('old backups gain nice-try stars without changing XP or ranks',()=>{
 const u=K.user('old');K.record(u,'4x6',false);K.record(u,'4x6',true);delete u.tryPoints;delete u.niceTries;delete u.recoveries;u.xp=4;
 const old={app:'kuku-quest',version:1,users:[u],active:u.id};const restored=K.validate(old);
 assert.equal(restored.version,2);assert.equal(restored.users[0].tryPoints,1);assert.equal(restored.users[0].recoveries,0);assert.equal(restored.users[0].xp,4);assert.deepEqual(restored.users[0].stats,u.stats);
 assert.deepEqual(K.validate(restored),restored);
});
