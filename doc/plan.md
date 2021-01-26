# Project Plan
Development to stream to IVS

WebRTC to RTMP
## Demo Solution
## Demo MPV Definition
### WebApp
- [X] Create a simple layout based on the simple player project
- [X] Add a conf room page create
- [ ] declouple, is it possible?
    Like obs nija. a page to create the room and grab the stream, then post it to the server and start streaming
- [X] Camera and mic support
- [x] Start streaming 
- [X] Stop streaming function
- [X] Set Streaming State State
- [X] Show stop streaming
- [ ] add player view
- [ ] Catch server state / 
- [ ] Catch streaming state
- [ ] Deploy version 1 
- [ ] tratar audio
- [ ] add bw select box
- [ ] set Stream key as password form input
- [ ] clean clode

### Server Side RTMP Relay
- [ ] set auto deployment, use next or any otrer? aws ecs? talk to Jesus / Uriel
- [ ] conteinerize
- [ ] use the pm2 to scale the nodes in node js  (https://pm2.keymetrics.io/)

### Auto channel discovery IVS
- [ ] Channel list IVS.

## Solution MVP
- [ ] Create admin area
- Automation with ECS and clud formation


### Blogpost
- [ ] Work on the website ~3d #feat @john 2020-03-20 



References:

https://github.com/chenxiaoqino/getusermedia-to-rtmp
https://medium.com/better-programming/add-an-html-canvas-into-your-react-app-176dab099a79
https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js