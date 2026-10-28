import json,math,collections,statistics as st
lat0,lon0=13.82156,100.51408;kx=111320*math.cos(math.radians(lat0));kz=110574
xz=lambda lon,lat:((lon-lon0)*kx,-(lat-lat0)*kz)
D=json.load(open('backD.json',encoding='utf-8'))
MS=[[xz(*p) for p in f['geometry']['coordinates'][0][:-1]] for f in json.load(open('backosm/ms-back.json'))]
O=json.load(open('backosm/osm.json',encoding='utf-8'))['elements']
OB=[[xz(p['lon'],p['lat']) for p in e['geometry'][:-1]] for e in O if e['type']=='way' and 'building' in e.get('tags',{}) and 'geometry' in e]
def area(p):return abs(sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)))/2)
def ccw(p):
  s=sum(p[i][0]*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*p[i][1] for i in range(len(p)));return p if s>0 else p[::-1]
def clip(subj,clipp):
  out=subj;cp=ccw(clipp)
  for i in range(len(cp)):
    a,b=cp[i],cp[(i+1)%len(cp)];inp=out;out=[]
    if not inp:break
    side=lambda p:(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
    for j in range(len(inp)):
      P,Q=inp[j],inp[(j+1)%len(inp)];sp,sq=side(P),side(Q)
      if sp>=0:out.append(P)
      if (sp>=0)!=(sq>=0):t=sp/(sp-sq);out.append((P[0]+(Q[0]-P[0])*t,P[1]+(Q[1]-P[1])*t))
  return area(out) if len(out)>2 else 0
def box(b):
  x,z,w,d,a=b[:5];ux,uz=math.cos(a),math.sin(a);nx,nz=-uz,ux
  return [(x+sx*ux*w/2+sy*nx*d/2,z+sx*uz*w/2+sy*nz*d/2) for sx,sy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
def cen(p):return (sum(q[0] for q in p)/len(p),sum(q[1] for q in p)/len(p))
G=collections.defaultdict(list)
for k,p in enumerate(MS):c=cen(p);G[(int(c[0]//30),int(c[1]//30))].append(k)
res=[];used=collections.Counter()
for i,b in enumerate(D['B']):
  bx=box(b);ab=area(bx);best=(0,-1)
  for dx in (-1,0,1):
    for dz in (-1,0,1):
      for k in G.get((int(b[0]//30)+dx,int(b[1]//30)+dz),[]):
        inter=clip(MS[k],bx)
        if inter>0:iou=inter/(ab+area(MS[k])-inter);best=max(best,(iou,k))
  res.append(best);used[best[1]]+=1 if best[0]>0.3 else 0
ious=[r[0] for r in res]
print('boxes',len(ious),'IoU>=0.5',sum(i>=0.5 for i in ious),'0.3-0.5',sum(0.3<=i<0.5 for i in ious),'0<..<0.3',sum(0<i<0.3 for i in ious),'none',sum(i==0 for i in ious),'median',round(st.median(ious),2))
matchedMS=set(r[1] for r in res if r[0]>=0.3);print('MS footprints',len(MS),'matched by a box',len(matchedMS),'unmatched MS',len(MS)-len(matchedMS))
json.dump({'iou':[round(r[0],3) for r in res],'ms':[r[1] for r in res]},open('backosm/match.json','w'))
# OSM buildings vs boxes
cov=0
for p in OB:
  c=cen(p);hit=max((clip(p,box(b))/area(p) for b in D['B'] if abs(b[0]-c[0])<40 and abs(b[1]-c[1])<40),default=0);cov+=hit>0.3
print('OSM buildings',len(OB),'covered by a box',cov)
