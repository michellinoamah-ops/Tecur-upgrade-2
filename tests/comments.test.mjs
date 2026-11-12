import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, limit, serverTimestamp, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
const env = await initializeTestEnvironment({projectId:'demo-tecur',firestore:{rules:readFileSync('firestore.rules','utf8')}});
try {
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx => {
  await setDoc(doc(ctx.firestore(),'posts','article'),{status:'published'});
  await setDoc(doc(ctx.firestore(),'posts','draft'),{status:'draft'});
 });
 const visitor=env.authenticatedContext('visitor').firestore();
 const other=env.authenticatedContext('other').firestore();
 const admin=env.authenticatedContext('staff',{admin:true}).firestore();
 const publicDb=env.unauthenticatedContext().firestore();
 const data=(uid,extra={})=>({uid,name:'A reader',text:'Helpful article, thank you.',parentId:'',isAdmin:false,createdAt:serverTimestamp(),...extra});
 const add=(db,uid,id,extra={},post='article')=>{
  const b=writeBatch(db);b.set(doc(db,'commentLimits',uid),{updatedAt:serverTimestamp(),postId:post,commentId:id});
  b.set(doc(db,'posts',post,'comments',id),data(uid,extra));return b.commit();
 };
 await assertFails(setDoc(doc(publicDb,'posts','article','comments','bad'),data('visitor')));
 await assertFails(setDoc(doc(visitor,'posts','article','comments','bad'),data('visitor')));
 await assertFails(add(visitor,'visitor','fake-admin',{isAdmin:true}));
 await assertFails(add(visitor,'visitor','bad-parent',{parentId:'missing'}));
 await assertFails(add(visitor,'visitor','draft-comment',{},'draft'));
 await assertSucceeds(add(visitor,'visitor','root'));
 await assertFails(add(visitor,'visitor','too-fast'));
 await assertSucceeds(add(other,'other','reply',{parentId:'root'}));
 await assertSucceeds(add(admin,'staff','admin-reply',{parentId:'root',name:'TECUR Automotive',isAdmin:true}));
 await assertSucceeds(getDocs(query(collection(publicDb,'posts','article','comments'),where('parentId','==',''),orderBy('createdAt','desc'),limit(25))));
 await assertFails(getDocs(collection(publicDb,'posts','draft','comments')));
 const like=doc(visitor,'posts','article','comments','root','likes','visitor');
 await assertSucceeds(setDoc(like,{createdAt:serverTimestamp()}));
 await assertFails(setDoc(like,{createdAt:serverTimestamp()}));
 await assertFails(setDoc(doc(visitor,'posts','article','comments','root','likes','other'),{createdAt:serverTimestamp()}));
 await assertSucceeds(getDocs(collection(publicDb,'posts','article','comments','root','likes')));
 await assertSucceeds(deleteDoc(like));
 await assertFails(updateDoc(doc(visitor,'posts','article','comments','root'),{isAdmin:true}));
 await assertFails(deleteDoc(doc(other,'posts','article','comments','root')));
 await assertSucceeds(deleteDoc(doc(admin,'posts','article','comments','root')));
 console.log('PASS: publication scope, anonymous-write denial, signed identity, admin badge protection, cooldown, replies, likes, unlike and admin moderation.');
} finally {await env.cleanup();}
