import test from 'node:test';
import assert from 'node:assert/strict';
import { TapGesture } from '../src/companion/tapGesture';
import { phoneScale } from '../src/companion/phoneScale';
const pointer=(id=1,x=20,y=30)=>({pointerId:id,clientX:x,clientY:y,button:0,isPrimary:id===1,target:null}) as PointerEvent;
test('tap accepts mouse/touch once, rejects swipe, duration, cancellation and multitouch',()=>{
 const g=new TapGesture(); g.down(pointer(),0);assert.equal(g.up(pointer(),100),true);assert.equal(g.up(pointer(),110),false);
 g.down(pointer(),0);g.move(pointer(1,40));assert.equal(g.up(pointer(),100),false);
 g.down(pointer(),0);assert.equal(g.up(pointer(),351),false);
 g.down(pointer(),0);g.cancelled(pointer());assert.equal(g.up(pointer(),100),false);
 g.down(pointer(),0);g.down(pointer(2),10);assert.equal(g.up(pointer(2),50),false);assert.equal(g.up(pointer(),100),false);
 g.down(pointer(),0);g.cancel();assert.equal(g.up(pointer(),100),false);
});
test('phone scale recalculates once from width and preserves tablet and desktop',()=>{
 for(const width of [360,375,390,430,767])assert.equal(phoneScale(width),.9);
 for(const width of [768,820,1024,1280])assert.equal(phoneScale(width),1);
 assert.equal(47*phoneScale(390),42.300000000000004);
});
