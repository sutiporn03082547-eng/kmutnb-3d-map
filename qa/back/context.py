import json,math,re
D=json.load(open('backD.json',encoding='utf-8'))
s=open('repo/back.html',encoding='utf-8').read()
EX=json.loads(re.search(r'const EXTRA=(\{.*?\});\r?\n',s).group(1))
idx=open('repo/index.html',encoding='utf-8').read();BOUND=json.loads(re.search(r'const BOUNDARY=(\[\[.*?\]\]);',idx).group(1))
def inp(x,z,p=BOUND):
  c=False;j=len(p)-1
  for i in range(len(p)):
    xi,zi=p[i];xj,zj=p[j]
    if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi:c=not c
    j=i
  return c
r1=lambda v:round(v,1)
RW={'py':14,'rl':6,'se':4,'tk':3.5,'ph':2,'fy':2}
boxes=[[r1(b[0]),r1(b[1]),r1(b[2]),r1(b[3]),round(b[4],3),b[5]] for b in D['B'] if not inp(b[0],b[1])]
polys=[[b[2] or 0,[[r1(x),r1(z)] for x,z in b[5]]] for b in EX['blds']]+[[o[1],[[r1(x),r1(z)] for x,z in o[2][:-1]]] for o in D['osmd']]
roads=[]
for t,n,pts in D['roads']+[[r[0],r[1],r[2]] for r in EX['roads']]:
  P=[[r1(p[0]),r1(p[1])] for p in pts]
  if all(inp(*p) for p in P):continue
  roads.append([RW.get(t,4),P])
for t,n,br,w,pts in D['major']:
  if br:continue
  roads.append([round(w,1),[[r1(p[0]),r1(p[1])] for p in pts]])
water=[[w,[[r1(p[0]),r1(p[1])] for p in pts]] for w,pts in D['water']]
out={'about':'Context for index.html: buildings, roads and canals around campus, same local metres as the map (origin 13.82156,100.51408). Boxes from back.html (fitted to Microsoft ML footprints); polys = OSM / Microsoft footprints (height 0 = unknown, drawn 2 storeys); roads from OSM. Built 2026-10-29.','boxes':boxes,'polys':polys,'roads':roads,'water':water}
json.dump(out,open('repo/back-context.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
import os;print('boxes',len(boxes),'polys',len(polys),'roads',len(roads),'water',len(water),'bytes',os.path.getsize('repo/back-context.json'))
