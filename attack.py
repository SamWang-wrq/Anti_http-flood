import requests
import time
i=0
t1=time.time()
while True:
    i=i+1
    x=requests.get('http://127.0.0.1:80/kdcos/index.asp')
    t2=time.time()
    if (t2-t1)>=15:
        break
print(i)#3279

#用于对比
import requests
import time
i=0
t1=time.time()
while True:
    i=i+1
    #x=requests.get('http://127.0.0.1:80/kdcos/index.asp')
    t2=time.time()
    if (t2-t1)>=15:
        break
print(i)#79632116
