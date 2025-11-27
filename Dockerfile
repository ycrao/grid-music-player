FROM registry.cn-hangzhou.aliyuncs.com/go-to-mirror/nginx:1.29.3-alpine
LABEL MAINTAINER="raoyc <raoyc@foxmail.com>"
LABEL Description="grid-music-player: music player for grid style"

COPY dist /usr/share/nginx/html
EXPOSE 80