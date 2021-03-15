# Docker Swarm en CentOS 7

Objetivo: 3 nodos diferentes (1 manager y 2 workers)

## Levantar nodos CentosOS7

Preparar el entorno de red para comunicación, en todos los nodos

```shell
$ sudo yum update -y
## En el nodo Manager
$ hostnamectl set-hostname managernode
## En el nodo Worker 1
$ hostnamectl set-hostname workernode1
## En el nodo Worker 2
$ hostnamectl set-hostname workernode2
```

## Instalar Docker

https://docs.docker.com/engine/install/centos/

```shell
$ sudo yum install -y yum-utils
$ sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
$ sudo yum install docker-ce docker-ce-cli containerd.io
$ sudo systemctl start docker
$ sudo systemctl enable docker
$ sudo groupadd docker
$ sudo usermod -aG docker ${USER}
$ logout
```

```shell
$ docker run hello-world
```

## Instalar Docker-Compose

https://docs.docker.com/compose/install/

```shell
$ sudo curl -L "https://github.com/docker/compose/releases/download/1.28.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$ sudo chmod +x /usr/local/bin/docker-compose
$ docker-compose --version
```

## Modificar Firewall

En cada nodo

```shell
$ sudo firewall-cmd --permanent --add-port=2376/tcp 
$ sudo firewall-cmd --permanent --add-port=2377/tcp 
$ sudo firewall-cmd --permanent --add-port=7946/tcp 
$ sudo firewall-cmd --permanent --add-port=7946/udp
$ sudo firewall-cmd --permanent --add-port=4789/udp
$ sudo firewall-cmd --permanent --add-port=80/tcp 
$ sudo firewall-cmd --reload
$ sudo systemctl restart docker
```

## Levantar Docker Swarm

En el MANAGER

```shell
$ docker swarm init --advertise-addr 192.168.100.120
```

Genera la línea de comando a ejecutar en cada uno de los WORKERS

```shell
$ docker swarm join --token SWMTKN-1-54b05ccc78gtqehonutm7ihiqb45jso7lg42aajxtqdq6lml73-e0iqzclephzmv07jabgx17io4 192.168.100.120:2377
```

En el MANAGER

```shell
$ docker node ls
```

```shell
ID                            HOSTNAME      STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
d12qr4g2efbls31apdzd1uzgj *   managernode   Ready     Active         Leader           20.10.5
vugqnh16b1d7lglikkral1ero     workernode1   Ready     Active                          20.10.5
6bz5ao2u4ur1uzn1miwn6bp2y     workernode2   Ready     Active                          20.10.5
```

### Correr una prueba

```shell
$ docker service create -p 80:80 --name webservice --replicas 3 httpd
```

```shell
m0gexs6kewdk1ayoj8cxyofkd
overall progress: 3 out of 3 tasks
1/3: running
2/3: running
3/3: running
verify: Service converged
```

```shell
$ docker service ls
ID             NAME         MODE         REPLICAS   IMAGE          PORTS
m0gexs6kewdk   webservice   replicated   3/3        httpd:latest   *:80->80/tcp
$ docker service ps webservice
ID             NAME           IMAGE          NODE          DESIRED STATE   CURRENT STATE           ERROR     PORTS
3jmyx6ntflxk   webservice.1   httpd:latest   managernode   Running         Running 2 minutes ago
y1bx9hq8x0l6   webservice.2   httpd:latest   workernode1   Running         Running 2 minutes ago
e0scgb9nfv53   webservice.3   httpd:latest   workernode2   Running         Running 2 minutes ago
```

Verificar Self-Healing

```shell
$ docker ps
CONTAINER ID   IMAGE          COMMAND              CREATED         STATUS         PORTS     NAMES
787bc42c9cf2   httpd:latest   "httpd-foreground"   8 minutes ago   Up 8 minutes   80/tcp    webservice.1.3jmyx6ntflxk0gqm9kjh85hn8
$ docker rm 787bc42c9cf2 -f
787bc42c9cf2
$ docker service ps webservice
ID             NAME               IMAGE          NODE	DESIRED STATE   CURRENT STATE            ERROR        PORTS
jb3ggdmua33b   webservice.1       httpd:latest   managernode   Running         Running 24 seconds ago
3jmyx6ntflxk    \_ webservice.1   httpd:latest   managernode   Shutdown        Failed 29 seconds ago    "task: non-zero exit (137)"
y1bx9hq8x0l6   webservice.2       httpd:latest   workernode1   Running         Running 10 minutes ago
e0scgb9nfv53   webservice.3       httpd:latest   workernode2   Running         Running 10 minutes ago
```

Escalado

```shell
$ docker service scale webservice=5
webservice scaled to 5
overall progress: 5 out of 5 tasks
1/5: running
2/5: running
3/5: running
4/5: running
5/5: running
verify: Service converged
$ docker service ls
ID             NAME         MODE         REPLICAS   IMAGE          PORTS
m0gexs6kewdk   webservice   replicated   5/5        httpd:latest   *:80->80/tcp
$ docker service ps webservice
ID             NAME               IMAGE          NODE	DESIRED STATE   CURRENT STATE                ERROR            PORTS
jb3ggdmua33b   webservice.1       httpd:latest   managernode   Running         Running 4 minutes ago
3jmyx6ntflxk    \_ webservice.1   httpd:latest   managernode   Shutdown        Failed 4 minutes ago         "task: non-zero exit (137)"
y1bx9hq8x0l6   webservice.2       httpd:latest   workernode1   Running         Running 14 minutes ago
e0scgb9nfv53   webservice.3       httpd:latest   workernode2   Running         Running 14 minutes ago
0o1xpc2u7lph   webservice.4       httpd:latest   managernode   Running         Running about a minute ago
jyc77qzf56ps   webservice.5       httpd:latest   workernode2   Running         Running about a minute ago
```

Eliminar stack

```shell
$ docker service rm webservice
webservice
```

### Ejemplo con Docker-Compose

```shell
$ git clone https://github.com/didjeram/docker-nginx-loadbalance.git
$ cd docker-nginx-loadbalance
$ cd node-app
$ docker build . -t didjeram-app:latest
$ docker login
$ docker push didjeram/didjeram-app:1
$ cd ..
$ docker stack deploy -c docker-compose.yml web
```

**Para ver el listado de servicios corriendo en los nodos**

```shell
$ docker service ls
```

```shell
ID             NAME                     MODE         REPLICAS   IMAGE                        PORTS
edbk14m9dv9v   web_nginx-loadbalancer   replicated   1/1        jwilder/nginx-proxy:latest   *:80->80/tcp
p1ipk03baaqm   web_web-app              replicated   3/3        didjeram/didjeram-app:1      *:30003->8080/tcp
```

**Para ver el estado del escalado**

```shell
$ docker service ps p1ipk03baaqm
```

```shell
ID             NAME            IMAGE                     NODE          DESIRED STATE   CURRENT STATE                ERROR     PORTS
7sy6apyzt9xe   web_web-app.1   didjeram/didjeram-app:1   workernode1   Running         Running about a minute ago
t475l27omolp   web_web-app.2   didjeram/didjeram-app:1   workernode2   Running         Running about a minute ago
png3pd74onld   web_web-app.3   didjeram/didjeram-app:1   managernode   Running         Running about a minute ago
```

Para escalar las replicas

```shell
$ docker service scale web_web-app=20
```

```shell
web_web-app scaled to 20
overall progress: 20 out of 20 tasks
1/20: running   [==================================================>]
2/20: running   [==================================================>]
3/20: running   [==================================================>]
4/20: running   [==================================================>]
5/20: running   [==================================================>]
6/20: running   [==================================================>]
7/20: running   [==================================================>]
8/20: running   [==================================================>]
9/20: running   [==================================================>]
10/20: running   [==================================================>]
11/20: running   [==================================================>]
12/20: running   [==================================================>]
13/20: running   [==================================================>]
14/20: running   [==================================================>]
15/20: running   [==================================================>]
16/20: running   [==================================================>]
17/20: running   [==================================================>]
18/20: running   [==================================================>]
19/20: running   [==================================================>]
20/20: running   [==================================================>]
verify: Service converged
```

Publicar

```shell
$ docker run --name supergrok -d jpetazzo/supergrok
$ docker logs supergrok
# http://f21e7fb54ea4.ngrok.io/192.168.100.120
$ docker run --net host -ti jpetazzo/ngrok http 192.168.100.120:80
ngrok by @inconshreveable                                     (Ctrl+C to quit) quit)
Session Status                online
Session Expires               1 hour, 58 minutes
Update                        update available (version 2.3.35, Ctrl-U to update)   Version                       2.1.18
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    http://5bccbef9c7b5.ngrok.io -> 192.168.100.120:80    Forwarding                    https://5bccbef9c7b5.ngrok.io -> 192.168.100.120:80   
Connections                   ttl     opn     rt1     rt5     p50     p90           
                              0       1       0.00    0.00    0.00    0.00          

HTTP Requests
-------------

GET /favicon.ico               200 OK
GET /                          200 OK
```

