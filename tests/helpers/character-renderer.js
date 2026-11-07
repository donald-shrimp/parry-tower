'use strict';
const assert=require('node:assert/strict');
const renderer=require('../../assets/character-renderer.js');

// Exercise the public drawing boundary instead of matching game.js implementation text.
function assertPilotSelected(mode,side='hero'){
 const key={'knight-trace':'knightTrace',rework:'rig'}[mode]||mode;
 const method=side+(mode==='impact'||mode==='rework'?'World':'Local');
 let calls=0;
 const module={['draw'+(side==='hero'?'Hero':'Enemy')](){calls++;return true;}};
 const enabled=renderer.modes('?art='+mode),drawing=renderer.create({modes:enabled,[key]:module});
 const frame={e:{id:'knight'},m:{reach:110},now:100,pose:{}};
 assert.equal(drawing[method]({}, {illustrated:false,legacy:false},frame),true);
 assert.equal(calls,1);
 assert.equal(drawing[method]({}, {illustrated:false,legacy:true},frame),false);
 assert.equal(calls,1);
 assert.equal(renderer.create({modes:enabled})[method]({}, {illustrated:false,legacy:false},frame),false);
 assert.equal(renderer.create({modes:renderer.modes(''),[key]:module})[method]({}, {illustrated:false,legacy:false},frame),false);
}
module.exports={assertPilotSelected};
