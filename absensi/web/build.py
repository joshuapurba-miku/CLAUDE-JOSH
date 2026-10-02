head=open('p_head.html').read().replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>','<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>')
parts=[head]+[open(f).read() for f in ['p_cfg.js','p_store.js','p_core.js','p_calc.js','p_ui.js','p_slip.js','p_dash2.js','p_set.js']]
out='\n'.join(parts).replace('HRIS','Kolabo')
open('rekap-absensi.html','w').write(out)
print('built',len(out))

# ---- versi mandiri (offline, untuk laptop tim) ----
import re
NM='/tmp/claude-0/-home-user-CLAUDE-JOSH/a6d8469a-f2c2-5819-8d66-22aa2612478a/scratchpad/node_modules/'
libs={'xlsx/0.18.5/xlsx.full.min.js':NM+'xlsx/dist/xlsx.full.min.js','jspdf/2.5.1/jspdf.umd.min.js':NM+'jspdf/dist/jspdf.umd.min.js','jszip/3.10.1/jszip.min.js':NM+'jszip/dist/jszip.min.js'}
sa=out
for k,p in libs.items():
    tag=f'<script src="https://cdnjs.cloudflare.com/ajax/libs/{k}"></script>'
    assert tag in sa, k
    code=open(p).read().replace('</script','<\\/script')
    sa=sa.replace(tag,'<script>'+code+'</script>')
m=re.search(r'<title>.*?</title>',sa); title=m.group(0); sa=sa.replace(title,'',1)
sa=('<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+title+
    '<style>html,body{margin:0}body{font-size:14px}[hidden]{display:none!important}img{max-width:100%}</style></head><body>'+sa+'</body></html>')
open('../Rekap-Gaji-Kolabo.html','w').write(sa)
print('standalone',len(sa))
