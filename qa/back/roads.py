import json,math,re,collections
lat0,lon0=13.82156,100.51408;kx=111320*math.cos(math.radians(lat0));kz=110574
xz=lambda lon,lat:((lon-lon0)*kx,-(lat-lat0)*kz)
D=json.load(open('backD.json',encoding='utf-8'))
s=open('repo/index.html',encoding='utf-8').read();BOUND=json.loads(re.search(r'const BOUNDARY=(\[\[.*?\]\]);',s).group(1))
def inpoly(x,z,p):
  c=False;j=len(p)-1
  for i in range(len(p)):
    xi,zi=p[i];xj,zj=p[j]
    if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi:c=not c
    j=i
  return c
lines=[(r[0],[(p[0],p[1]) for p in r[2]]) for r in D['roads']]+[('M'+r[0],[(p[0],p[1]) for p in r[4]]) for r in D['major']]
segs=[];G=collections.defaultdict(list)
for t,pts in lines:
  for i in range(len(pts)-1):
    k=len(segs);segs.append((pts[i],pts[i+1]))
    a,b=pts[i],pts[i+1]
    for gx in range(int(min(a[0],b[0])//20)-1,int(max(a[0],b[0])//20)+2):
      for gz in range(int(min(a[1],b[1])//20)-1,int(max(a[1],b[1])//20)+2):G[(gx,gz)].append(k)
def dist(x,z):
  best=1e9
  for k in G.get((int(x//20),int(z//20)),[]):
    (x1,z1),(x2,z2)=segs[k];dx,dz=x2-x1,z2-z1;L=dx*dx+dz*dz or 1;t=max(0,min(1,((x-x1)*dx+(z-z1)*dz)/L));best=min(best,math.hypot(x1+dx*t-x,z1+dz*t-z))
  return best
O=json.load(open('backosm/osm.json',encoding='utf-8'))['elements']
miss=[];stat=collections.Counter()
for e in O:
  t=e.get('tags',{})
  if e['type']!='way' or 'highway' not in t or 'geometry' not in e:continue
  P=[xz(g['lon'],g['lat']) for g in e['geometry']]
  samp=[]
  for i in range(len(P)-1):
    a,b=P[i],P[i+1];L=math.hypot(b[0]-a[0],b[1]-a[1]);n=max(1,int(L/3))
    for k in range(n):samp.append((a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n))
  out=[q for q in samp if not inpoly(q[0],q[1],BOUND)]
  if len(out)<0.5*len(samp) or not out:stat['campus']+=1;continue
  far=sum(dist(*q)>6 for q in out)/len(out)
  L=sum(math.hypot(P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]) for i in range(len(P)-1))
  hw=t['highway'];stat[(hw,'have' if far<0.4 else 'missing')]+=1
  if far>=0.4:miss.append({'id':e['id'],'hw':hw,'name':t.get('name',''),'len':round(L),'pts':[[round(x,1),round(z,1)] for x,z in P],'nodes':e.get('nodes',[]),'tags':{k:v for k,v in t.items() if k in('highway','name','service','access','width','lanes','oneway','surface','bridge','layer','tunnel','covered','foot')}})
json.dump(miss,open('backosm/missing-roads.json','w',encoding='utf-8'),ensure_ascii=False)
for k,v in sorted(stat.items(),key=lambda x:str(x[0])):print(k,v)
print('missing',len(miss),'total length',sum(m['len'] for m in miss),'m', collections.Counter(m['hw'] for m in miss))
