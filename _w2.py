import base64,sys
d=base64.b64decode(sys.argv[1])
open(sys.argv[2],'wb').write(d)
