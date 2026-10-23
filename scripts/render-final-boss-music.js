/* Optional local audition export. The Web Audio renderer is the same as Dev.
 * npm install --prefix test-results/final-boss-music/runtime --no-save --ignore-scripts web-audio-engine@0.13.4
 * node scripts/render-final-boss-music.js [output-directory]
 * The optional dependency stays in ignored test-results, not the game bundle. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const music=require('../assets/final-boss-music.js');
const {RenderingAudioContext}=require('../test-results/final-boss-music/runtime/node_modules/web-audio-engine');
const output=path.resolve(process.argv[2]||'test-results/final-boss-music/audio');
fs.mkdirSync(output,{recursive:true});
const sampleRate=44100;
async function render(pieces,name){
 const ac=new RenderingAudioContext({sampleRate,numberOfChannels:2,blockSize:128}),bus=ac.createGain();
 bus.gain.value=.35;bus.connect(ac.destination);
 const noise=ac.createBuffer(1,sampleRate/2,sampleRate),channel=noise.getChannelData(0);
 let seed=1234567;
 for(let i=0;i<channel.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;channel[i]=seed/2147483648-1;}
 let cursor=.15;
 for(const p of pieces){
  const beat=60/p.bpm;
  for(let n=0;n<p.bars*8;n++)for(const e of music.step(p.id,n,beat))music.play(ac,e,cursor+n*beat/2+e.offset,bus,noise);
  cursor+=p.bars*4*beat;
 }
 bus.gain.setValueAtTime(.35,cursor-.18);bus.gain.linearRampToValueAtTime(0,cursor+.6);
 ac.processTo(cursor+1);
 const data=ac.exportAsAudioData();let peak=0,squares=0,count=0;
 for(const samples of data.channelData)for(const x of samples){if(!Number.isFinite(x))throw Error('Nonfinite sample');peak=Math.max(peak,Math.abs(x));squares+=x*x;count++;}
 if(peak>=.98)throw Error('Insufficient headroom: '+peak);
 fs.writeFileSync(path.join(output,name+'.wav'),Buffer.from(await ac.encodeAudioData(data,{bitDepth:16})));
 return {name,seconds:cursor+1,peak,rms:Math.sqrt(squares/count),sampleRate};
}
(async()=>{
 const results=[];
 for(const p of music.pieces)results.push(await render([p],p.id));
 results.push(await render(music.pieces,'royal-suite'));
 fs.writeFileSync(path.join(output,'render-metrics.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
