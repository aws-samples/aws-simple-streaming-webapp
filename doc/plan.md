# Project Plan
Development to stream to IVS

WebRTC to RTMP
## Demo Solution
## Demo MPV Definition
### WebApp
- [X] Create a simple layout based on the simple player project
- [X] Add a conf room page create
- [X] declouple, is it possible?
    Like obs nija. a page to create the room and grab the stream, then post it to the server and start streaming
- [X] Camera and mic support
- [x] Start streaming 
- [X] Stop streaming function
- [X] Set Streaming State State
- [X] Show stop streaming
- [X] add player view
- [X] Deploy version 1 
- [X] tratar audio
- [ ] add bw select box
- [X] set Stream key as password form input
- [X] clean clode
- [ ] treat player error and keep trying
- [X] use video and audio selected
- [ ] simplify player or externalize 
- [X] device selector
- [X] audio out mute (monitor effect)
- [ ] stop all sources when start
- [X] Logout to work
- [X] menu rebuild
- [X] bug cam was enabled too fast
- [X] Wait cam to be on on Admin Page
- [X] Cam error treat
- [ ] Stream error capture
- [ ] API get server config, route and retry

### Server Side RTMP Relay
- [X] Deploy version 1 of the server
- [-] optimize latency on ffmpeg
- [ ] set auto deployment, use next or any otrer? aws ecs? talk to Jesus / Uriel
- [ ] conteinerize
- [ ] use the pm2 to scale the nodes in node js  (https://pm2.keymetrics.io/)

### Auto channel discovery IVS
- [ ] Channel list IVS.
- [ ] Scale channels according to the name of users

## Solution MVP
- [ ] Create admin area
- [ ] Automation with ECS and clud formation


### Blogpost
- [ ] Work on the website 

### WebApp Backlog Server State, out of MVP
- [ ] Catch server state / 
- [ ] Catch streaming state



### References:

https://github.com/chenxiaoqino/getusermedia-to-rtmp
https://medium.com/better-programming/add-an-html-canvas-into-your-react-app-176dab099a79
https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
https://webrtc.github.io/samples/
https://developer.mozilla.org/en-us/docs/Web/API/MediaRecorder
https://stackoverflow.com/questions/27908408/webrtc-how-to-mute-local-audio-output (how to enable monitor like)

### Demo Params:
sk_us-east-1_gecbHp7v8OJg_FN7Uxsqxud0186yUUCnhqcy4PaxTsR
rtmps://ca538d4d3d92.global-contribute.live-video.net:443/app/
https://ca538d4d3d92.us-east-1.playback.live-video.net/api/video/v1/us-east-1.904149973046.channel.5xGI6F0YnnSe.m3u8

## Convert:
https://nimblewebdeveloper.com/blog/convert-react-class-to-function-component