import json,math,re,collections
exec(open('backosm/match.py').read().split('G=collections.defaultdict')[0])  # helpers + MS/OB/D
s=open('repo/index.html',encoding='utf-8').read();BOUND=json.loads(re.search(r'const BOUNDARY=(\[\[.*?\]\]);',s).group(1))
def inpoly(x,z,p):
  c=False;j=len(p)-1
  for i in range(len(p)):
    xi,zi=p[i];xj,zj=p[j]
    if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi:c=not c
    j=i
  return c
boxes=[box(b) for b in D['B']];BG=collections.defaultdict(list)
for i,b in enumerate(D['B']):BG[(int(b[0]//30),int(b[1]//30))].append(i)
def covered(p):
  c=cen(p);a=area(p);hit=0
  for dx in(-1,0,1):
    for dz in(-1,0,1):
      for i in BG.get((int(c[0]//30)+dx,int(c[1]//30)+dz),[]):hit+=clip(p,boxes[i])
  return hit/a if a else 1
# campus buildings in back.html (D.campus.bld) also count as covered
camp=[[tuple(q) for q in b[2]] for b in D['campus']['bld']]
add=[];stat=collections.Counter()
O=json.load(open('backosm/osm.json',encoding='utf-8'))['elements']
osmB=[e for e in O if e['type']=='way' and 'building' in e.get('tags',{}) and 'geometry' in e]
osmPolys=[]
for e in osmB:
  p=[xz(g['lon'],g['lat']) for g in e['geometry'][:-1]];c=cen(p)
  if inpoly(c[0],c[1],BOUND):stat['osm in campus']+=1;continue
  if covered(p)>0.3:stat['osm covered by box']+=1;continue
  t=e['tags'];lv=t.get('building:levels')
  add.append({'src':'osm','id':e['id'],'p':[[round(x,2),round(z,2)] for x,z in p],'lv':int(float(lv)) if lv else None,'kind':t['building'],'name':t.get('name','')});osmPolys.append(p);stat['osm added']+=1
for k,p in enumerate(MS):
  c=cen(p)
  if inpoly(c[0],c[1],BOUND):stat['ms in campus']+=1;continue
  if area(p)<12:stat['ms tiny <12m2']+=1;continue
  if covered(p)>0.3:stat['ms covered by box']+=1;continue
  if any(clip(p,q)/area(p)>0.3 for q in camp if abs(cen(q)[0]-c[0])<80 and abs(cen(q)[1]-c[1])<80):stat['ms covered by campus bld']+=1;continue
  if any(abs(cen(q)[0]-c[0])<60 and abs(cen(q)[1]-c[1])<60 and clip(p,q)/area(p)>0.3 for q in osmPolys if len(q)>2):stat['ms covered by osm add']+=1;continue
  add.append({'src':'ms','id':k,'p':[[round(x,2),round(z,2)] for x,z in p],'lv':None,'kind':'yes','name':''});stat['ms added']+=1
json.dump(add,open('backosm/add-buildings.json','w',encoding='utf-8'),ensure_ascii=False)
for k,v in stat.items():print(k,v)
print('areas',sorted(round(area([tuple(q) for q in a['p']])) for a in add)[::max(1,len(add)//12)])
m=json.load(open('backosm/match.json'))
nb=[i for i,v in enumerate(m['iou']) if v==0];print('boxes w/o MS',len(nb),'with poi',sum(D['B'][i][8]>=0 for i in nb),'types',collections.Counter(D['B'][i][6] for i in nb))
