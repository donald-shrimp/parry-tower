/* Source-pixel masks and joints for the illustrated enemies.
 * Every layer is cut from its recorded full original; no parts atlas redraws.
 */
(function(root,factory){
 'use strict';const data=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=data;
 if(root)root.ParryEnemyData=data;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const poly=p=>[p];
 const data={
  slime:{name:'残響スライム',source:'character-art/rework/slime/slime-ready-candidate.png',width:1445,sourceHeight:1088,
   origin:[950,960],top:192,height:86,waist:[950,775],face:[712,599],chest:[900,675],motion:'slime',lean:[0,0,0],
   lobe:{pivot:[685,768],tip:[42,728]},priority:['lobe'],order:['body','lobe'],
   parts:{lobe:{label:'しなる打撃用の突起',pivot:[685,768],mask:poly([[0,520],[350,520],[420,650],[570,640],[660,690],[760,746],[800,825],[663,918],[442,930],[0,870]])}}},
  rogue:{name:'影の暗殺者',source:'character-art/rework/rogue/rogue-ready-candidate.png',width:1445,sourceHeight:1088,
   origin:[690,1047],top:95,height:120,waist:[690,550],face:[420,288],chest:[620,443],motion:'thrust',lean:[.12,-.20,.08],
   priority:['weapon','upper','offhand','cape','legs'],order:['cape','legs','offhand','body','upper','weapon'],
   arms:[{upper:'upper',fore:'weapon',shoulder:[756,312],elbow:[851,332],hand:[731,407],tip:[429,424],windup:[.08,-.09]}],
   repairs:[{source:[570,470,90,40],mask:[[639,315],[744,315],[768,445],[530,454],[530,405]]}],
   parts:{
    weapon:{label:'短剣・握り手・前腕',mask:poly([[413,410],[644,367],[657,341],[710,351],[754,322],[787,306],[850,290],[891,305],[902,347],[829,386],[798,438],[751,455],[694,443],[665,467],[636,454],[637,432],[431,441]])},
    upper:{label:'突く腕の上腕',mask:poly([[734,282],[801,270],[850,290],[878,307],[885,338],[846,367],[786,366],[744,340]])},
    offhand:{label:'前方の空いた手と腕',pivot:[370,415],actionTurn:-.9,mask:poly([[296,390],[366,393],[412,460],[385,512],[325,549],[246,577],[162,591],[86,584],[79,509],[169,455],[233,464],[294,442]])},
    cape:{label:'後方へ流す外套',pivot:[800,420],sway:.07,mask:poly([[812,361],[1123,370],[1445,432],[1445,823],[1170,763],[960,680],[830,540],[788,449]])},
    legs:{label:'形を保つ下半身',follow:'fixed',mask:poly([[0,565],[790,565],[1050,681],[1445,800],[1445,1088],[0,1088]])}
   }},
  wraith:{name:'塔の亡霊',source:'character-art/rework/wraith/wraith-ready-candidate.png',width:1445,sourceHeight:1088,
   origin:[780,1043],top:55,height:120,waist:[780,600],face:[539,263],chest:[735,457],motion:'claw',float:true,lean:[.08,-.16,.09],
   priority:['weapon','upper','backArm','tail'],order:['tail','backArm','body','upper','weapon'],
   arms:[{upper:'upper',fore:'weapon',shoulder:[556,467],elbow:[431,503],hand:[272,476],tip:[79,451],windup:[.17,-.20]}],
   repairs:[{source:[650,480,100,65],mask:[[461,443],[581,421],[624,475],[564,542],[454,533]]}],
   parts:{
    weapon:{label:'前方の爪・手・袖の前腕',mask:poly([[42,333],[288,333],[346,409],[433,444],[495,470],[485,543],[412,592],[359,604],[333,550],[204,629],[58,620]])},
    upper:{label:'爪腕の肩と上腕',mask:poly([[393,443],[481,415],[577,426],[636,470],[610,530],[522,562],[431,548]])},
    backArm:{label:'奥側の腕と爪',pivot:[973,348],sway:-.045,mask:poly([[936,275],[1119,278],[1181,395],[1320,440],[1329,651],[1170,686],[1075,590],[1013,467]])},
    tail:{label:'遅れて流れる下衣',pivot:[780,620],sway:.08,mask:poly([[431,615],[845,586],[1019,646],[1445,722],[1445,1088],[431,1088]])}
   }}
 };
 Object.assign(data,{
  sentinel:{name:'鉄壁の番兵',source:'character-art/rework/sentinel/sentinel-ready-guard-v3.png',width:1445,sourceHeight:1088,
   origin:[740,1009],top:99,height:120,waist:[687,565],face:[520,215],chest:[653,433],motion:'rising',lean:[.045,-.10,.05],
   priority:['weapon','upper','guard','cape','legs'],order:['legs','cape','body','upper','guard','weapon'],
   arms:[{upper:'upper',fore:'weapon',shoulder:[749,291],elbow:[889,448],hand:[949,533],tip:[1376,716],sweep:1,windup:[.18,.18]}],
   // The pauldron opens away from the collar during a cut. Keep matching cloth
   // behind it, cut from this same original, rather than revealing a body hole.
   repairs:[{source:[608,303,65,42],mask:[[676,252],[730,240],[802,280],[827,339],[786,392],[718,372],[687,326]]}],
   parts:{
    weapon:{label:'腰脇の剣・前腕・左の握り手',mask:poly([[842,412],[921,406],[960,459],[985,491],[1007,474],[1043,472],[1044,525],[1445,648],[1445,754],[1000,621],[956,594],[905,577],[872,539],[853,490],[810,465]])},
    upper:{label:'肩鎧ごと回る剣上腕',mask:poly([[640,208],[661,182],[700,189],[741,190],[788,209],[818,247],[833,265],[860,278],[873,318],[914,341],[949,379],[950,408],[947,448],[919,480],[872,476],[826,443],[796,402],[750,380],[713,367],[694,305],[676,253]])},
    guard:{label:'胴の前に残す大盾と右盾腕',pivot:[554,421],mask:poly([[236,174],[338,175],[411,223],[492,251],[574,310],[573,381],[524,598],[480,828],[448,855],[220,972],[168,922],[127,811],[165,567],[197,345]])},
    cape:{label:'後ろへ流れる青緑布',pivot:[774,610],sway:.045,mask:poly([[725,551],[811,559],[900,626],[987,654],[1078,688],[1136,729],[1245,776],[1295,828],[1186,829],[1060,769],[941,746],[819,708],[734,665]]),exclude:poly([[774,569],[840,585],[895,642],[941,711],[968,771],[1035,861],[1117,922],[1218,1030],[995,1088],[938,898],[828,800]])},
    legs:{label:'形を保つ踏ん張りと腰布',follow:'fixed',mask:poly([[0,555],[1445,555],[1445,1088],[0,1088]])}
   }},
  duelist:{name:'紅刃の剣士',source:'character-art/rework/duelist/duelist-ready-candidate.png',width:1445,sourceHeight:1088,
   origin:[720,1058],top:215,height:120,waist:[720,579],face:[568,320],chest:[713,467],motion:'dual',lean:[.08,-.17,.07],
   priority:['nearWeapon','farWeapon','nearUpper','farUpper','cape','legs'],order:['farUpper','farWeapon','cape','legs','body','nearUpper','nearWeapon'],
   arms:[
    {upper:'nearUpper',fore:'nearWeapon',shoulder:[608,442],elbow:[535,566],hand:[362,622],tip:[63,263],windup:[-.10,.23],support:[.1,1.05]},
    {upper:'farUpper',fore:'farWeapon',shoulder:[790,377],elbow:[944,414],hand:[941,224],tip:[1341,43],bend:-1,windup:[-.10,-.18],support:[.05,-.10]}
   ],
   repairs:[{source:[664,473,58,44],mask:[[547,387],[638,374],[681,433],[629,518],[549,520]]}],
   parts:{
    nearWeapon:{label:'手前の剣・握り手・前腕',mask:poly([[28,213],[120,213],[322,497],[380,552],[453,540],[512,512],[556,531],[568,583],[530,612],[421,661],[434,700],[389,719],[304,679],[270,649],[274,604],[255,583],[78,426]])},
    nearUpper:{label:'手前の肩鎧と上腕',mask:poly([[500,441],[531,406],[570,370],[620,358],[655,379],[675,420],[680,467],[665,499],[632,524],[575,583],[519,589],[491,543],[544,485]])},
    farWeapon:{label:'奥の剣・握り手・前腕',mask:poly([[820,145],[1445,0],[1445,180],[1067,304],[1025,314],[1005,410],[963,454],[920,432],[883,371],[900,289],[867,285],[813,281]])},
    farUpper:{label:'奥の肩鎧と上腕',mask:poly([[736,313],[768,328],[801,334],[829,339],[849,338],[842,358],[842,383],[885,368],[935,389],[967,399],[970,432],[937,460],[887,457],[854,439],[806,409],[770,387],[746,380],[747,350]])},
    cape:{label:'赤い外套の追従',pivot:[932,469],sway:.07,mask:poly([[964,365],[1235,350],[1445,371],[1445,938],[1220,920],[1090,847],[1014,776],[955,731],[889,660],[834,579],[902,491]])},
    legs:{label:'形を保つ二本の脚',follow:'fixed',mask:poly([[0,599],[1445,599],[1445,1088],[0,1088]])}
   }},
  cantor:{name:'残響の詠み手',source:'character-art/rework/cantor/cantor-ready-candidate.png',width:1445,sourceHeight:1088,
   origin:[730,1055],top:9,height:126,waist:[690,550],face:[518,137],chest:[625,347],motion:'palm',float:true,effect:'rune',lean:[.075,-.12,.075],
   priority:['weapon','upper','offhand','cape','tail'],order:['cape','tail','body','upper','weapon','offhand'],
   arms:[{upper:'upper',fore:'weapon',shoulder:[459,280],elbow:[350,326],hand:[184,253],tip:[66,241],windup:[.12,-.16]}],
   repairs:[{source:[542,418,70,67],mask:[[385,247],[489,222],[522,285],[480,377],[408,425],[369,344]]}],
   parts:{
    weapon:{label:'掌・前腕と前袖',mask:poly([[45,121],[262,180],[303,234],[346,261],[375,311],[378,406],[417,447],[415,575],[383,683],[284,692],[214,523],[202,362],[169,311],[46,324]])},
    upper:{label:'掌を押し出す上腕',mask:poly([[312,253],[410,230],[492,211],[521,248],[520,347],[455,423],[409,504],[374,459],[345,380]])},
    offhand:{label:'胸元の詠唱する手',pivot:[753,286],mask:poly([[589,270],[668,272],[721,321],[760,325],[817,345],[847,400],[801,451],[732,438],[686,390],[626,379],[572,323]])},
    cape:{label:'後方の法衣',pivot:[842,449],sway:.06,mask:poly([[826,344],[1092,406],[1445,434],[1445,716],[1112,699],[931,576],[824,500]])},
    tail:{label:'下へ流れる法衣',pivot:[720,610],sway:.07,mask:poly([[395,609],[892,551],[1445,628],[1445,1088],[395,1088]])}
   }}
 });
 // Each revised boss has one rigid sword/hilt with two separately solved arms.
 function twoHandBoss(id,name,g){
  return {name,source:'character-art/rework/'+id+'/'+id+'-ready-'+(g.source||'guard-v3')+'.png',width:g.width||1445,sourceHeight:1088,
   origin:g.origin,top:g.top,height:140,waist:g.waist,face:g.face,chest:g.chest,motion:g.motion||'twohand-cut',lean:g.lean||[.065,-.10,.05],
   grip:{part:'weapon',pivot:g.hands[0],tip:g.tip,contactAngle:g.turn,contactBias:g.contactBias??.85,windup:g.windup||0,pull:g.pull||[0,0]},
   arms:g.hands.map((hand,i)=>({upper:'upper'+i,fore:'fore'+i,shoulder:g.shoulders[i],elbow:g.elbows[i],hand,tip:hand})),
   priority:['weapon','fore0','fore1','upper0','upper1','cape','legs'],
   order:['upper1','fore1','cape','legs','body','upper0','fore0','weapon'],
   repairs:g.repairs||[],
   parts:{
    weapon:{label:'一本の大剣・同じ柄を握る両手',mask:poly(g.weapon)},
    upper0:{label:'手前：肩鎧ごと回る上腕',mask:poly(g.uppers[0])},
    fore0:{label:'手前：肘から手首へつなぐ前腕',mask:poly(g.fores[0])},
    upper1:{label:'奥：肩鎧ごと回る上腕',mask:poly(g.uppers[1])},
    fore1:{label:'奥：柄頭/鍔の手へ追従する前腕',mask:poly(g.fores[1])},
    cape:{label:'遅れて流れる外套',pivot:g.waist,sway:.045,mask:poly(g.cape)},
    legs:{label:'形を保つ下半身',follow:'fixed',mask:poly([[0,g.legY],[g.width||1445,g.legY],[g.width||1445,1088],[0,1088]])}
   }};
 }
 // Guardian v7 retains the overhead windup with a consistently left-facing torso.
 data.guardian=twoHandBoss('guardian','鐘楼の守護者',{
  source:'guard-v7',origin:[555,1037],top:254,waist:[500,610],face:[485,377],chest:[509,537],legY:610,
  shoulders:[[630,413],[394,422]],elbows:[[672,319],[321,370]],hands:[[592,242],[421,259]],tip:[1340,113],turn:2.9,contactBias:.7,windup:-.08,pull:[3,-3],
  weapon:[[0,0],[1445,0],[1445,249],[716,249],[704,272],[677,263],[659,258],[634,255],[610,249],[588,251],[566,247],[548,225],[488,238],[467,259],[442,274],[408,269],[386,253],[300,267],[300,180],[0,180]],
  uppers:[[[606,324],[669,326],[705,350],[719,386],[697,437],[689,480],[638,510],[589,490],[552,452],[566,398],[577,366]],[[353,371],[393,358],[430,371],[448,398],[429,442],[415,482],[373,473],[339,440],[327,408]]],
  fores:[[[568,227],[611,224],[642,252],[690,270],[729,304],[730,340],[701,347],[660,323],[620,319],[597,295],[583,265]],[[382,251],[418,252],[420,281],[403,316],[402,349],[372,368],[341,354],[307,335],[324,306],[351,285]]],
  cape:[[719,417],[767,446],[785,498],[914,552],[1045,587],[1219,593],[1445,630],[1445,1048],[1130,974],[862,849],[741,733],[650,638],[633,573],[659,519],[698,483]],
  repairs:[]
 });
 data.guardian.stageRight=775; // Include the raised forearm after the windup lean.
 // Own complete glove/cuff outlines and elbow plates before moving the arms.
 data.guardian.parts.weapon.mask=poly([[0,0],[1445,0],[1445,250],[720,250],[708,276],[678,266],[660,260],[640,253],[620,251],[606,262],[582,256],[560,249],[548,232],[486,242],[467,262],[444,278],[408,281],[385,264],[352,280],[300,269],[300,180],[0,180]]);
 data.guardian.parts.fore0.mask=poly([[562,229],[603,224],[638,243],[663,255],[695,263],[720,282],[735,304],[735,342],[716,351],[697,341],[670,329],[646,329],[622,322],[605,309],[595,290],[585,264]]);
 data.guardian.parts.upper0.mask=poly([[606,324],[669,326],[706,338],[724,358],[726,386],[697,437],[689,480],[638,510],[589,490],[552,452],[566,398],[577,366]]);
 data.guardian.parts.fore1.mask=poly([[266,370],[285,333],[307,314],[335,285],[364,256],[380,243],[406,250],[429,264],[413,291],[402,319],[403,345],[381,366],[353,390],[332,416],[307,417],[280,396]]);
 data.guardian.parts.upper1.mask=poly([[315,356],[359,350],[401,358],[430,371],[448,398],[429,442],[415,482],[373,473],[339,440],[321,420],[308,391]]);
 data.ironwarden=twoHandBoss('ironwarden','鉄血の監督官',{
  source:'guard-v6',origin:[776,1064],top:202,waist:[675,615],face:[606,335],chest:[646,547],legY:608,
  shoulders:[[526,455],[785,430]],elbows:[[408,514],[744,525]],hands:[[468,421],[621,470]],tip:[18,24],turn:-1.25,windup:.12,pull:[3,-2],
  weapon:[[0,0],[182,0],[480,272],[511,282],[519,310],[501,336],[497,344],[515,354],[533,379],[536,399],[557,415],[568,411],[597,420],[619,445],[627,469],[643,487],[651,510],[633,533],[608,530],[594,513],[577,491],[555,478],[541,453],[514,427],[493,421],[472,431],[446,414],[444,384],[423,411],[399,417],[386,396],[392,373],[417,347],[429,317],[0,125]],
  uppers:[[[496,418],[535,422],[555,459],[545,492],[510,516],[466,541],[416,539],[391,512],[411,481],[454,466]],[[725,359],[785,351],[830,378],[866,428],[880,458],[860,491],[828,520],[790,551],[747,554],[711,527],[721,480],[735,440]]],
  fores:[[[437,405],[474,414],[504,430],[495,466],[478,504],[453,535],[415,562],[385,568],[366,540],[353,501],[367,470],[402,448]],[[616,440],[657,448],[703,457],[742,475],[778,503],[783,533],[764,561],[733,578],[698,554],[671,535],[632,517],[608,483]]],
  cape:[[863,461],[1048,514],[1445,592],[1445,918],[1165,856],[983,755],[838,655],[802,574]],
  repairs:[{source:[604,531,33,40],mask:[[457,438],[528,428],[559,470],[548,520],[482,551],[420,536]]},{source:[652,534,35,35],mask:[[739,390],[816,388],[845,451],[825,531],[770,555],[722,511]]}]
 });
 data.ironwarden.parts.weapon.mask.push([[0,0],[515,0],[515,350],[420,410],[0,150]]);
 data.dirgekeeper=twoHandBoss('dirgekeeper','弔鐘の司祭',{
  source:'low-v6',origin:[899,1028],top:104,waist:[851,558],face:[662,230],chest:[795,415],legY:557,
  shoulders:[[635,404],[941,350]],elbows:[[680,489],[990,478]],hands:[[778,565],[889,554]],tip:[34,931],turn:.58,windup:-.09,pull:[4,3],
  weapon:[[0,918],[705,594],[713,559],[734,549],[755,576],[773,566],[799,565],[827,577],[838,596],[854,581],[860,564],[885,553],[917,555],[933,566],[950,552],[971,552],[989,571],[984,596],[966,606],[944,600],[926,605],[916,627],[885,636],[859,623],[842,619],[821,640],[792,644],[769,628],[759,610],[769,654],[791,670],[803,697],[786,719],[756,722],[734,701],[731,676],[745,651],[737,642],[0,950]],
  uppers:[[[555,380],[576,331],[600,302],[644,301],[671,333],[674,378],[697,413],[705,451],[692,488],[658,508],[629,482],[606,439],[581,439]],[[853,297],[873,260],[919,242],[963,260],[996,296],[1010,320],[993,345],[1011,370],[1019,404],[1006,441],[1014,465],[982,493],[950,474],[928,427],[893,415],[874,375]]],
  fores:[[[671,454],[707,455],[740,472],[761,511],[788,550],[800,570],[777,594],[748,592],[721,564],[696,549],[669,529],[644,504]],[[975,446],[1015,430],[1042,446],[1055,478],[1035,510],[1000,545],[957,576],[924,584],[903,563],[905,535],[940,501]]],
  cape:[[1027,346],[1188,410],[1445,485],[1445,734],[1288,722],[1121,626],[1042,567],[969,470]],
  repairs:[{source:[754,422,35,40],mask:[[626,403],[696,405],[740,467],[738,534],[686,550],[635,497]]}]
 });
 data.dirgekeeper.parts.weapon.mask.push([[0,906],[710,588],[776,672],[0,985]]);
 data.timewarden=twoHandBoss('timewarden','時の監視者',{
  source:'guard-v6',origin:[875,1021],top:80,waist:[848,579],face:[746,259],chest:[812,408],legY:588,motion:'twohand-thrust',
  shoulders:[[682,387],[957,366]],elbows:[[720,466],[1006,486]],hands:[[789,521],[949,551]],tip:[20,372],turn:-.14,windup:-.04,pull:[7,0],
  weapon:[[0,352],[125,350],[623,493],[643,484],[655,446],[679,435],[709,431],[721,452],[708,492],[728,507],[754,520],[778,520],[792,522],[815,524],[839,543],[849,560],[896,565],[912,549],[935,543],[957,555],[975,576],[1005,583],[1023,565],[1055,565],[1069,593],[1065,614],[1041,632],[1013,626],[990,611],[963,618],[932,622],[904,608],[892,594],[847,585],[831,601],[806,607],[781,596],[766,577],[732,561],[713,574],[685,618],[654,623],[640,611],[638,587],[620,567],[607,560],[0,411]],
  uppers:[[[605,380],[628,341],[655,315],[689,307],[722,331],[730,361],[716,389],[729,415],[749,444],[752,475],[718,497],[686,473],[652,437],[629,428]],[[867,311],[891,279],[923,280],[961,299],[1004,321],[1016,345],[997,359],[1034,378],[1049,399],[1038,421],[1052,446],[1037,474],[1006,503],[969,478],[946,430],[911,415],[886,380]]],
  fores:[[[716,436],[754,437],[786,456],[804,488],[815,516],[793,542],[767,544],[743,520],[718,495],[694,472]],[[978,451],[1018,440],[1046,461],[1048,491],[1023,522],[990,550],[958,579],[934,577],[914,558],[930,522],[950,487]]],
  cape:[[1064,451],[1247,472],[1445,525],[1445,754],[1227,735],[1112,669],[1049,595],[1005,524]],
  repairs:[{source:[843,447,35,35],mask:[[662,390],[726,400],[774,450],[782,508],[732,530],[679,481]]}]
 });
 data.timewarden.parts.weapon.mask.push([[0,330],[606,330],[606,565],[0,565]]);
 // Authored contact drawings retain the complete anatomy. They replace the
 // upper silhouette at the attack key, rather than twisting a ready-pose fist.
 const contacts={
  guardian:{version:7,waist:[890,595],face:[816,291],chest:[893,457],tip:[13,527],cut:595,guard:[790,470,845,635],shoulders:[[1004,374],[737,393]],elbows:[[1060,458],[755,463]],wrists:[[1010,518],[907,523]],direction:1},
  ironwarden:{waist:[810,614],face:[730,331],chest:[783,477],tip:[31,563],cut:614,guard:[563,479,645,644],shoulders:[[637,439],[912,415]],elbows:[[659,501],[923,512]],wrists:[[686,541],[836,541]],direction:1},
  dirgekeeper:{waist:[850,555],face:[665,229],chest:[790,414],tip:[14,540],cut:555,guard:[692,468,773,642],shoulders:[[638,400],[951,346]],elbows:[[686,474],[998,458]],wrists:[[784,510],[939,512]],direction:-1},
  timewarden:{waist:[853,573],face:[777,253],chest:[818,401],tip:[6,536],cut:573,guard:[610,416,720,653],shoulders:[[693,381],[952,370]],elbows:[[729,469],[967,461]],wrists:[[773,509],[903,509]],direction:0}
 };
 for(const [id,k]of Object.entries(contacts)){
  const s=data[id],[x0,y0,x1,y1]=k.guard;k.source='character-art/rework/'+id+'/'+id+'-contact-v'+(k.version||6)+'.png';s.keyPose=k;
  s.parts.strikePose={label:'打ち込み専用の上半身・両腕・剣',separateSource:true,mask:[[[0,0],[1445,0],[1445,k.cut],[0,k.cut]],[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],[[0,490],[680,490],[680,590],[0,590]]]};
  s.priority.push('strikePose');s.order.push('strikePose');
 }
 // Keep the ready drawing's cape behind the contact pose; do not double it.
 data.guardian.parts.strikePose.mask=[[[0,0],[1125,0],[1125,480],[1045,565],[965,595],[845,595],[845,635],[790,635],[790,595],[0,595]]];
 // Match the raised guard to the contact drawing at their shared waist.
 data.guardian.keyPose.readyScale=1.10;
 data.guardian.keyPose.readyFilter='hue-rotate(3deg) saturate(1.04) brightness(1.04)';
 data.guardian.keyPose.releaseStart=.66;
 data.guardian.keyPose.releaseTurn=.65;
 // Start the editable middle pose from the windup's original arm shape.
 // Keep the anticipation, then flash through the edited silhouette in 70ms.
 data.guardian.keyPose.inbetween={start:.38,at:.66,end:.78,turn:0,groupStart:5/9,groupAt:.75};
 data.guardian.keyPose.advanceWithCut=true;
 data.guardian.advanceRoom=24;
 // One delayed sword sweeps after the real blade, catches it, then fades.
 // Clip the painted blade and guard only: no duplicate fists, arms or torso.
 data.guardian.keyPose.ghost={start:.78,duration:200,opacity:.5,fadeAt:.6,readyGuard:[695,205],pivot:[811,541],
  readyMask:[[[705,149],[1445,0],[1445,250],[716,258],[702,210]]],
  mask:[[[10,527],[83,496],[192,483],[320,484],[778,498],[790,509],[778,578],[185,581],[85,560]],
   [[793,478],[816,460],[846,474],[833,512],[832,580],[827,602],[841,614],[818,632],[790,616],[801,578],[799,516]]]};
 data.clockwork={name:'時計仕掛けの兵士',source:'character-art/rework/clockwork/clockwork-ready-candidate.png',width:1445,sourceHeight:1088,
  origin:[1020,1018],top:79,height:120,waist:[1063,523],face:[874,223],chest:[1027,397],motion:'piston',lean:[.06,-.12,.07],
  priority:['lance','weapon','upper','gear','offhand','legs'],order:['legs','offhand','body','gear','upper','weapon','lance'],
  arms:[{upper:'upper',fore:'weapon',shoulder:[904,368],elbow:[824,426],hand:[573,425],tip:[40,419],windup:[-.10,-.06]}],
  gear:{pivot:[1043,383]},
  lance:{pivot:[573,425],tip:[40,419],part:'lance',fore:'weapon',retract:100},
  repairs:[{source:[968,362,40,65],mask:[[840,312],[927,314],[955,373],[925,443],[842,459]]}],
  parts:{
   lance:{label:'伸縮する槍先とピストン軸',mask:poly([[0,342],[480,342],[480,468],[0,505]])},
   weapon:{label:'ピストンの外筒と前腕',mask:poly([[465,335],[695,321],[774,356],[835,372],[866,409],[871,457],[821,489],[731,502],[616,506],[522,489],[468,460]])},
   upper:{label:'駆動する肩と上腕',mask:poly([[742,291],[836,276],[901,300],[932,342],[932,400],[897,442],[850,452],[811,409],[791,363],[740,350]])},
   gear:{label:'回転する胸の歯車',pivot:[1043,383],mask:poly([[977,308],[1062,300],[1115,349],[1123,418],[1079,459],[1006,461],[968,416],[964,352]])},
   offhand:{label:'奥の空いた機械腕',pivot:[1165,302],mask:poly([[1107,196],[1218,185],[1267,240],[1304,285],[1368,323],[1406,415],[1445,462],[1445,595],[1300,600],[1270,514],[1279,461],[1249,428],[1220,365],[1145,358]])},
   legs:{label:'固定した脚と腰布',follow:'fixed',mask:poly([[0,520],[1445,520],[1445,1088],[0,1088]])}
  }};
 data.golden_tone={name:'黄金の音叉',source:'character-art/rework/golden_tone/golden_tone-ready-candidate.png',width:1445,sourceHeight:1088,
  origin:[820,1067],top:22,height:120,waist:[781,595],face:[535,212],chest:[672,444],motion:'palm',float:true,effect:'tone',lean:[.08,-.14,.07],
  priority:['weapon','upper','backArm','tail'],order:['tail','backArm','body','upper','weapon'],
  arms:[{upper:'upper',fore:'weapon',shoulder:[487,365],elbow:[393,431],hand:[190,303],tip:[42,282],windup:[.16,-.19]}],
  repairs:[{source:[600,579,70,55],mask:[[389,313],[487,296],[540,349],[520,434],[440,488],[385,431]]}],
  parts:{
   weapon:{label:'前方の掌と長い袖',mask:poly([[21,155],[246,168],[313,278],[370,311],[402,395],[438,468],[441,559],[473,696],[451,775],[349,734],[244,608],[171,504],[142,422],[132,375],[18,403]])},
   upper:{label:'掌を送る上腕',mask:poly([[348,301],[445,278],[536,298],[564,375],[545,468],[497,516],[444,510],[405,488],[354,428],[346,373]])},
   backArm:{label:'奥の手と袖',pivot:[819,414],sway:-.035,mask:poly([[799,400],[940,415],[1032,450],[1129,479],[1213,565],[1175,638],[1050,611],[951,574],[914,611],[855,579],[827,504]])},
   tail:{label:'金色の衣の余韻',pivot:[820,639],sway:.075,mask:poly([[499,612],[856,590],[1445,600],[1445,1088],[499,1088]])}
  }};
 data.gem_slime={name:'宝石スライム',source:'character-art/rework/gem_slime/gem_slime-ready-yellow-v2.png',width:1536,sourceHeight:1024,
  origin:[1050,958],top:57,height:96,waist:[1020,785],face:[819,649],chest:[998,748],motion:'slime',lean:[0,0,0],
  lobe:{pivot:[660,631],tip:[65,713]},priority:['lobe'],order:['body','lobe'],
  parts:{lobe:{label:'結晶を抱えた打撃用の突起',pivot:[660,631],mask:poly([[0,446],[437,429],[582,509],[677,550],[707,651],[685,732],[612,755],[440,801],[415,883],[0,900]])}}};
 // Own the inked contour as well as the interior of an articulated arm. This
 // prevents tiny static cuff/shoulder outlines being left on the body layer.
 for(const s of Object.values(data))for(const arm of s.arms||[])for(const name of [arm.upper,arm.fore])s.parts[name].seam=14;
 // Pauldrons use their full silhouette. A narrow seam keeps neighbouring
 // helmet/collar ink off the moving plate, especially around high guards.
 for(const id of ['sentinel','duelist','guardian','ironwarden','dirgekeeper','timewarden'])
  for(const arm of data[id].arms)data[id].parts[arm.upper].seam=3;
 for(const id of ['guardian','ironwarden','dirgekeeper','timewarden'])
  for(const arm of data[id].arms)data[id].parts[arm.fore].seam=3;
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 return freeze(data);
});
