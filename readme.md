Run Arduino listner

node arduino-listener.js

pkill -f arduino-listener.js
lsof | grep usbmodem


let's check if the port is ready, if anything runs, kill -9 port
lsof | grep /dev/cu.usbmodem13101



Connectt to rubikpi
/dev/cu.usbmodem5A9B1112031

screen /dev/cu.usbmodem5A9B1112031 115200