/* pitched roofs read from Esri World Imagery (light/dark roof planes and ridge lines), drawn on top of the existing models, whose
   walls are kept: 42 hip roof (grey), 46 gable along the long axis (grey), 62 hip roof (orange, the colour on imagery),
   73 hip roof (red-brown on imagery; the photo shows the overhanging roof of the roof room). Rise is an estimate (no survey). */
(function(){const R=window.CAMPUS_REBUILD;if(!R||!R.addRoof)return;
 R.addRoof('42',{type:'hip',rise:3.2,color:'#9a9c98',k:1.02});
 R.addRoof('46',{type:'gable',rise:3,color:'#a7a9a6',k:1.02});
 R.addRoof('62',{type:'hip',rise:4.5,color:'#d0745a',k:1.01});
 R.addRoof('73',{type:'hip',rise:2.6,color:'#8f4a3a',k:.98});
})();
