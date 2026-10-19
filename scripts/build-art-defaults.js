/* Ship the accepted motion project synchronously, including file:// startup. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{normalize}=require('../assets/character-edit');
function render(project){return '/* Generated from studio-project.json by scripts/build-art-defaults.js. */\nwindow.ParryArtDefaults='+JSON.stringify(normalize(project))+';\n';}
if(require.main===module){
 const root=path.resolve(__dirname,'..'),project=normalize(JSON.parse(fs.readFileSync(path.join(root,'assets/character-art/studio-project.json'),'utf8')));
 fs.writeFileSync(path.join(root,'assets/character-art-defaults.js'),render(project));
 console.log('Bundled accepted motion project '+project.updatedAt);
}
module.exports={render};
