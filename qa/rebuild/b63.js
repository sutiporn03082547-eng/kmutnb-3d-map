/* building 63 (College of Industrial Technology). Was: the whole OSM outline extruded as one 5-storey slab with a flat roof.
   Evidence (Esri World Imagery z19, 10 m grid read in qa/BUILDINGS-REPORT.md; photos/campus-63-*.png|jpg):
   - two blocks joined by a narrow link (the outline's notches); the black entrance pavilion (photo model, kept) sits in the
     west notch facing the road;
   - each block is parallel wings with narrow light wells between them (dark strips on imagery); the wings facing the wells
     are the open-corridor wings with white parapet bands and red/white diagonal stripes seen in the photos;
   - a raised hall with a hip roof in the middle of each block; the link has a bright (white) roof, the south block's east wing
     a grey roof.
   Estimated, not surveyed: wing and well widths (read off imagery to ~1-2 m), hall size, roof rise, well depth (taken as open
   above the ground floor), 5 floors for every part (photos show 5 storeys on the road side; the rear is not photographed). */
(function(){const R=window.CAMPUS_REBUILD;if(!R||!R.rebuild)return;const r=R.rect;
 const N=[[200,68],[235,82],[222,116],[187,102]],S=[[181,120],[226,138],[214,170],[168,153]],L=[[200,107],[211,111],[204,130],[193,125]];
 R.rebuild('63',{keep:/^individual-facade-63$/,stripes:true,style:{glass:'#3a4148',band:'#efeeea',lip:'#8e9296',roof:'#d9d8d3'},
  parts:[
   {name:'north podium',p:N,y0:0,floors:1},
   {name:'north west wing',p:r(N,0,.38,0,1),y0:1,floors:4},
   {name:'north middle wing',p:r(N,.44,.78,0,1),y0:1,floors:4},
   {name:'north east wing',p:r(N,.84,1,0,1),y0:1,floors:4},
   {name:'link',p:L,y0:0,floors:5,roof:'#f2f2ee'},
   {name:'south podium',p:S,y0:0,floors:1},
   {name:'south west wing',p:r(S,0,.30,0,1),y0:1,floors:4},
   {name:'south middle wing',p:r(S,.37,.57,0,1),y0:1,floors:4},
   {name:'south east wing (white roof)',p:r(S,.62,.78,0,1),y0:1,floors:4,roof:'#f2f2ee'},
   {name:'south east wing (grey roof)',p:r(S,.78,1,0,1),y0:1,floors:4,roof:'#9a9fa3'}],
  halls:[
   {name:'north roof hall',p:r(N,.47,.75,.25,.65),base:5,up:1.4,rise:2.6,color:'#9da3a6'},
   {name:'south roof hall',p:r(S,.39,.56,.17,.57),base:5,up:1.4,rise:2.4,color:'#9da3a6'}]});
})();
