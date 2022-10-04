"use strict";

/*
 *  управление видео-плеером
 */
function CeraPlayer () {
    this.id = null;
    this.first_init = false;
    this.is_play_now = false;
    //camera_id=0-выкл плеер
    this.camera_id = 0;
    this.camera_title = '';
    this.data = null;
    //high low
    this.quality = 'high';
    this.is_online = false;
    this.query_timeF = null;
    this.timer = null;

    this.filename = '';
    this.filetime = '';
    this.offset = 0;
    this.screenshot = '';

    this.next = false;
    this.next_filename = '';
    this.next_filetime = '';
    this.next_offset = 0;
    this.next_screenshot = '';

    this.api_domen = '';
    this.base_url = '/static/counter/';

    this.$container = null;
    this.$info = null;
    this.$arhive = null;
    this.$online = null;
    this.$arhive_error = null;
    this.$online_error = null;
    this.video = null;
    this.online = null;
    this.muted = true;
    this.rate = 1;

    this.regions = [];

    this.handleUpdateTime = this.handleUpdateTime.bind(this);

    this.trassir_timer = null;
    this.trassirData = {
        channel: 0,
        src: '',
        token: '',
        sid: ''
    };
}

//инит html контейнера
CeraPlayer.prototype.initContainer = function (id, $parent, area) {
    this.id = id;
    this.area = area;

    $parent.append(
        fcn.getTmpl('#tmpl-video2-player', {idx: id} )
    );
    this.$container = $parent.find('.v2-container[data-idx='+id+']');
    this.$overlay = this.$container.find('.v2-player-overlay');
    this.$info = this.$container.find('.v2-player-info');
    this.$poster = this.$container.find('.v2-player-poster');
    this.$region = this.$container.find('.v2-player-region');
    this.$arhive = this.$container.find('.v2-player-arhive');
    this.$online = this.$container.find('.v2-player-online');
    this.$arhive_error = this.$container.find('.v2-player-arhive-error');
    this.$online_error = this.$container.find('.v2-player-online-error');

    var self = this;
    this.$muted = this.$info.find('.camera_muted');
    this.$muted.click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var $btn_muted = $(this);
        self.setMuted($btn_muted);
    });

    //ZOOM
    new Video2Zoom(this);
};

//инит плееров архив и онлайн (1 раз в момент создания)
CeraPlayer.prototype.initContainerVideo = function (online_type, arhive_type, cam) {
    // online_type = 0 hls
    // online_type = 1 rtmp
    // online_type = 2 mjpeg

    // arhive_type = 0 mp4
    // arhive_type = 1 mjpeg
    // arhive_type = 2 trassir flv

    var self = this;
    this.online_type = online_type;
    //arhive_type = 2; //TODO
    this.arhive_type = arhive_type;

    if (arhive_type == 0) {
        //arhive mp4
        this.video = this.$arhive.find('video')[0];
        this.video.addEventListener('ended', this.ended.bind(this), false);
    }
    else if (arhive_type == 1) {
        //arhive mjpeg
        this.$arhive.append('<img src="" style="width: 100%; height:100%; position: absolute; top: 0; left: 0" />');
        this.video_mjpeg = this.$arhive.find('img')[0];
    }
    else if (arhive_type === 2) {
        //arhive flv trassir
        this.$arhive.append('<img src="" style="width: 100%; height:100%; position: absolute; top: 0; left: 0" />');
        this.video_trassir = this.$arhive.find('img')[0];
    }

    /* полный инит онлайн-плеера при ините контейнера */
    if (online_type === 1) {
        //rtmp flash
        var stream = (this.quality === 'low')
            ? 'rtmp://' + location.hostname + '/live/' + this.camera_id + '_1'
            : 'rtmp://' + location.hostname + '/live/' + this.camera_id;
        this.online = $f(this.$online[0], {
            wmode: "opaque",
            src: "/static/flowpl/flowplayer-3.2.18.swf",
            onFail: function () {
                console.log('rtmp_onFail:', self.id);
            }
        }, {
            clip: {
                provider: 'rtmp',
                live: true,
                buffer: 1,
                bufferLength: 1,
                //autoPlay: false,
                autoBuffering: false,
                //scaling: 'fit',
                url: stream,
                onStart: function () {
                    console.log('rtmp_onStart:', self.id);
                    self.$poster.removeClass('active');
                    self.first_init = true;
                    if (!self.is_online) this.stop().stopBuffering();
                    //d.resolve();
                    self.muted
                        ? this.mute()
                        : this.unmute();
                }
            },
            plugins: {
                rtmp: {url: "/static/flowpl/flowplayer.rtmp-3.2.13.swf"},
                controls: {all: false, play: false, fullscreen: false}
            },
            onError: function (errorCode) {
                console.log('rtmp_onError:', self.id, errorCode);
            }
        }).load(function () {
            console.log('onLoad:', self.id);
        });
        //return d.promise();
    }
    else if (online_type === 0) {
        //hls html5
        stream = (this.quality === 'low')
            ? 'http://' + location.hostname + '/hls/video_' + this.camera_id + '_1.m3u8'
            : 'http://' + location.hostname + '/hls/video_' + this.camera_id + '.m3u8';
        this.$online.html('<video src="'+stream+'"></video>');
        this.online = this.$online.find('video')[0];
    }
    else if (online_type === 2) {
        // mjpeg img src
        stream = cam['fields']['mjpegUrl'];
        //stream = 'http://' + location.hostname + ':8090/cam'+ this.camera_id +'.mjpeg';
        if (stream === null || stream === undefined || stream === '')
            stream = '/static/images/noimg.png';
            //stream = 'http://217.126.89.102:8020/axis-cgi/mjpg/video.cgi?resolution=320x240';
        this.mjpeg_url = stream;
        this.$online.html('<img src="'+stream+'" style="width: 100%; height:100%" />');
        this.online = this.$online.find('img')[0];
    }
};

//получить онлайн
CeraPlayer.prototype.getOnline = function () {
    this.showOnline();

    if (this.video !== null) {
        this.stopBufferingVideo();
    }
    this.is_online = true;

    if (this.online_type === 1) {
        //rtmp flash
        var online_url = (this.first_init) ? this.online.getClip().url : '',
            stream_url = (this.quality === 'low')
                ? 'rtmp://' + location.hostname + '/live/' + this.camera_id + '_1'
                : 'rtmp://' + location.hostname + '/live/' + this.camera_id;

        /*  когда в ячейке меняется кам */
        this.online.play();
        if (online_url !== stream_url) {
            this.online.play({url: stream_url});
        }
        //this.muted
        //    ? this.online.mute()
        //    : this.online.unmute();
    }
    else if (this.online_type === 0) {
        //hls html5
        stream_url = (this.quality === 'low')
            ? 'http://' + location.hostname + '/hls/video_' + this.camera_id + '_1.m3u8'
            : 'http://' + location.hostname + '/hls/video_' + this.camera_id + '.m3u8';
        this.online.setAttribute("src", stream_url);
        var hls = new Hls();
        hls.loadSource(this.online.src);
        hls.attachMedia(this.online);
        this.online.muted = this.muted;
        this.online.play();
        this.$poster.removeClass('active');
    }
    else if (this.online_type === 2) {
        // mjpeg img
        this.online.setAttribute("src", this.mjpeg_url);
        this.$poster.removeClass('active');
    }

    this.$info.find('.camera_online').addClass('glyphicon-eye-open');
    this.setQualityText();
};

//получить видео
CeraPlayer.prototype.getVideo = function (timeF, at_begin) {
    this.stopTimer();
    if (this.video !== null && !this.video.paused) {
        this.is_play_now = false;
        this.video.pause();
    }
    at_begin = at_begin || false;
    this.query_timeF = timeF;
    if (this.online !== null) {
        if (this.online_type === 1) {
            this.online.stop().stopBuffering();
        }
        else if (this.online_type === 0) {
            this.online.pause();
            this.online.setAttribute('src', '');
            this.online.load();
        }
        else if (this.online_type === 2) {
            this.online.setAttribute('src', '');
        }
    }
    this.is_online = false;

    this.$info.find('.camera_online').removeClass('glyphicon-eye-open');
    this.setQualityText();

    if (this.arhive_type === 0)
        this.setVideotMp4(timeF, at_begin);
    if (this.arhive_type === 1)
        this.setVideotMjpeg(timeF);
    if (this.arhive_type === 2)
        this.setVideoTrassir(timeF);
};

//установка видео mp4
CeraPlayer.prototype.setVideotMp4 = function (timeF, at_begin) {
    var self = this;
    $.when(
        self.loadDataVideo(timeF)
    ).done(function(data){
        self.data = data;
        if (data == null) {
            self.showArhiveError();
            return false;
        }
        self.filename = data['fileName'];
        self.filetime = data['fileTime'];
        self.offset = (at_begin) ? 0 : data['offset'];
        self.screenshot = (data['screenshot'] !== null)
            ? data['screenshot']
            : '';
        self.setSrc();
        self.showArhive();
    }).fail(function (error) {
        self.data = null;
        self.showArhiveError(error);
    });
};

//установка видео mjpeg
CeraPlayer.prototype.setVideotMjpeg = function (timeF) {
    var self = this;
    $.when(
        self.loadDataMjpegVideo(timeF)
    ).done(function(data){
        self.data = data;
        if (data == null) {
            self.showArhiveError();
            return false;
        }
        self.filename = data['stream'];

        self.setSrcMjpeg();
        self.showArhive();
    }).fail(function (error) {
        self.data = null;
        self.showArhiveError(error);
    });
};

CeraPlayer.prototype.nextVideo = function () {
    this.next = false;
    var next_timeF = this.getEndedTimeF(5000);
    var self = this;
    $.when(
        self.loadDataVideo(next_timeF, 0)
    ).done(function(next_data){
        if (next_data == null) {
            self.next = false;
            return false;
        }
        self.next = true;
        self.next_filename = next_data['fileName'];
        self.next_filetime = next_data['fileTime'];
        self.next_offset = 0;
    }).fail(function (error) {
        console.error('err_nextVideo:', error);
        self.next = false;
    });
};

//установить src архива mp4
CeraPlayer.prototype.setSrc = function () {
    var loadedMetadata = this.loadedMetadata.bind(this);

    this.video.removeEventListener( 'loadedmetadata', loadedMetadata, false);

    this.folder = (this.quality === 'high') ? 'video' : 'video2';
    this.src = this.api_domen + this.base_url + this.camera_id + '/'+this.folder+'/' + this.filename;
    this.video.pause();
    this.video.muted = this.muted;
    if (this.screenshot === '') {
        this.video.removeAttribute("poster");
        this.video.setAttribute("src", this.src + '#t=' + this.offset);
        this.video.load();
        this.setPlayRate( this.rate );

        this.video.addEventListener( 'loadedmetadata', loadedMetadata, false);
    }
    else {
        this.video.setAttribute("poster", this.screenshot);
        this.startTimer();
    }
};

CeraPlayer.prototype.loadedMetadata = function () {
    this.video.play();
    this.is_play_now = true;
    this.nextVideo();
};

//установить src архива mjpeg
CeraPlayer.prototype.setSrcMjpeg = function () {
    this.src = this.filename;
    this.video_mjpeg.setAttribute("src", this.src);
};

//переключение качества
CeraPlayer.prototype.changeQuality = function (quality) {
    this.quality = quality || 'low';
    if (this.camera_id > 0) {
        var curr_timeF = (this.data == null)
            ? this.query_timeF
            : this.getCurrentTimeF();
        this.is_online
            ? this.getOnline()
            : this.getVideo(curr_timeF, false);
    }
};

//переключение качества
CeraPlayer.prototype.setQualityText = function () {
    var quality_text = (this.quality === 'low') ? 'LQ' : 'HQ';
    this.$info.find('.camera_quality')
        .html(quality_text)
        .removeClass('icon-LQ')
        .removeClass('icon-HQ')
        .addClass('icon-'+quality_text);
};

//скрыть все блоки
CeraPlayer.prototype.hideAll = function () {
    this.$overlay.addClass('active');
    this.$info.removeClass('active');
    this.$poster.removeClass('active');
    this.$region.removeClass('active');
    this.$arhive.removeClass('active');
    this.$online.removeClass('active');
    this.$arhive_error.removeClass('active');
    this.$online_error.removeClass('active');
};

//показать плеер архива
CeraPlayer.prototype.showArhive = function () {
    this.hideAll();
    this.$overlay.removeClass('active');
    this.$arhive.addClass('active');
    this.$region.addClass('active');
    this.$info.addClass('active');
};

//показать ошибку архива + ошибка запроса
CeraPlayer.prototype.showArhiveError = function (request_error) {
    this.filename = '';
    this.filetime = '';
    this.offset = 0;
    this.hideAll();
    this.$overlay.removeClass('active');
    this.$info.addClass('active');
    this.$arhive_error.addClass('active').find('.request_error').html('');
    if (request_error !== undefined) {
        this.$arhive_error.find('.request_error').html(request_error);
    }
};

//показать плеер архива
CeraPlayer.prototype.showOnline = function () {
    this.hideAll();
    this.$overlay.removeClass('active');
    this.$online.addClass('active');
    this.$region.addClass('active');
    this.$poster.addClass('active');
    this.$info.addClass('active');
};

//показать ошибку архива
CeraPlayer.prototype.showOnlineError = function () {
    this.hideAll();
    this.$overlay.removeClass('active');
    this.$online_error.addClass('active');
    this.$info.addClass('active');
};

//установить камеру
CeraPlayer.prototype.setCam = function (cam_id, cam_title) {
    this.camera_id = cam_id;
    this.camera_title = cam_title;
    this.$info.find('.camera_title').html(cam_title);
    this.$info.find('.camera_id').html(cam_id);
    this.$poster.css({
        'background-image': "url(/static/counter/" + this.camera_id + "/thumbnail.jpg)"
    });
};

//текущее время архива + смещение (в милисек)
CeraPlayer.prototype.getCurrentTimeF = function (offset) {
    offset = offset || 0;
    return dt.timestamp2yymmddhhmmss(
        parseInt(dt.yymmddhhmmss2timestamp(this.filetime)) + parseInt(this.video.currentTime) * 1000 + offset
    );
};

//последнее время архива + смещение (в милисек)
CeraPlayer.prototype.getEndedTimeF = function (offset) {
    offset = offset || 0;
    return dt.timestamp2yymmddhhmmss(
        parseInt(dt.yymmddhhmmss2timestamp(this.filetime)) + parseInt(this.video.duration) * 1000 + offset
    );
};

//текущее время архива в сек
CeraPlayer.prototype.getCurrentTimestamp = function () {
    return (this.filetime === '')
        ? parseInt(dt.yymmddhhmmss2timestamp(this.query_timeF)/1000)
        : parseInt(dt.yymmddhhmmss2timestamp(this.filetime)/1000) + parseInt(this.video.currentTime);

};

//остановка буферизации архивного видео
CeraPlayer.prototype.stopBufferingVideo = function () {
    this.is_play_now = false;
    this.stopTimer();
    if (this.video && this.video !== null) {
        this.video.pause();
        //this.removeEventTimeupdatePlayer(); //TODO ??? нужно ли отключать тут
        //stops download
        this.video.setAttribute('src', '');
        this.video.load();
    }
};

//закрытие плеера
CeraPlayer.prototype.closePlayer = function () {
    this.hideAll();
    if (this.camera_id > 0) {
        this.camera_id = 0;
        if (this.online_type === 1) {
            this.online.stop().stopBuffering();
            this.online.unload();
        }
        else if (this.online_type === 0) {
            this.online.pause();
            this.online.setAttribute('src', '');
            this.online.load();
        }
        else if (this.online_type === 2) {
            this.online.setAttribute('src', '');
        }
        this.stopBufferingVideo();
    }
};

/* events */

//отключение события "обновление времени"
CeraPlayer.prototype.removeEventTimeupdatePlayer = function () {
    (this.timer === null && this.video !== null)
        ? this.video.removeEventListener('timeupdate', this.handleUpdateTime, false)
        : this.is_play_now = false;
};

//подключение события "обновление времени"
CeraPlayer.prototype.addEventTimeupdatePlayer = function () {
    (this.timer === null && this.video !== null)
        ? this.video.addEventListener( 'timeupdate', this.handleUpdateTime, false)
        : this.is_play_now = true;
};

//play
CeraPlayer.prototype.play = function () {
    this.video.play();
};

//pause
CeraPlayer.prototype.pause = function () {
    this.video.pause();
};

//ускорить перемотку
CeraPlayer.prototype.setPlayRate = function (rate) {
    this.rate = rate;
    if (this.arhive_type === 2) {
        if (this.trassirData.channel > 0) {
            this.stopTimer();
            //this.setSrcTrassir(this.query_timeF);
            this.getDataTrassir(this.query_timeF);
        }
    } else {
        this.video.playbackRate = parseFloat(rate);
    }
};

//handle updateTime
CeraPlayer.prototype.handleUpdateTime = function () {
    if (this.is_play_now) {
        this.updateTime();
        if (this.arhive_type === 2 || this.arhive_type === 0)
            this.dispatchUpdateTime();
    }
};

//updateTime
CeraPlayer.prototype.updateTime = function () {
    //set
};

//dispatchUpdateTime
CeraPlayer.prototype.dispatchUpdateTime = function () {
    this.query_timeF = dt.timestamp2yymmddhhmmss(
        parseInt(dt.yymmddhhmmss2timestamp(this.query_timeF)) + 1000
    );
    var data = {
        timeF: this.getCurrentTimeF(),
        player_id: this.id
    };
    fcn.dispatchEvent('updateTimeCeraPlayer', data, $('.area-storage')[0]);
};

//включает таймер для видео без движения
CeraPlayer.prototype.startTimer = function () {
    //this.handleUpdateTime();
    this.timer = setInterval(this.handleUpdateTime, 1000 / this.rate);
};

//включает таймер для видео без движения
CeraPlayer.prototype.stopTimer = function () {
    clearInterval(this.timer);
    this.timer = null;
};

//ended
CeraPlayer.prototype.ended = function () {
    if (this.next) {
        this.stopTimer();
        if (!this.video !== null && !this.video.paused) {
            this.is_play_now = false;
            this.video.pause();
        }
        this.filename = this.next_filename;
        this.filetime = this.next_filetime;
        this.offset = 0;
        this.setSrc();
    }
    else {
        var next_timeF = this.getCurrentTimeF(5000);
        this.getVideo(next_timeF, true);
    }
};


//api запрос на видео
CeraPlayer.prototype.loadDataVideo = function (timeF) {
    var stream = (this.quality === 'high') ? '0' : '1';
    var d = $.Deferred(),
        self = this,
        url = self.api_domen+'/archive/getvideobytimeformatted?camera_id='+self.camera_id+'&time='+timeF + '&stream='+stream;
    $.ajax({
        url: url
    }).done(function(p){
        d.resolve(p);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
        ajax.reAuth(err.status);
    });
    return d.promise();
};

//Archive/getRviArchive

//api запрос на видео mjpeg
CeraPlayer.prototype.loadDataMjpegVideo = function (timeF) {
    var d = $.Deferred(),
        self = this,
        url = self.api_domen+'/archive/getRviArchive?camera_id='+self.camera_id+'&time='+timeF;
    $.ajax({
        url: url
    }).done(function(p){
        d.resolve(p);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
        ajax.reAuth(err.status);
    });
    return d.promise();
};

CeraPlayer.prototype.setMuted = function($btn_muted){
    if ($btn_muted.hasClass('glyphicon-volume-off')) {
        this.muted = false;
        $btn_muted
            .removeClass('glyphicon-volume-off')
            .addClass('glyphicon-volume-up');
    }
    else {
        this.muted = true;
        $btn_muted
            .addClass('glyphicon-volume-off')
            .removeClass('glyphicon-volume-up');
    }

    if (!this.is_online) {
        this.video.muted = this.muted;
    }
    else {
        if (this.online_type === 0) this.online.muted = this.muted;
        if (this.online_type === 1) {
            this.muted
                ? this.online.mute()
                : this.online.unmute();
        }
    }

};

// archive flv trassir

//установка видео trassir flv
CeraPlayer.prototype.setVideoTrassir = function (timeF) {
    this.stopTimer();
    this.trassirData.channel = this.camera_id;
    this.getDataTrassir(timeF);
};

//запрос видео
CeraPlayer.prototype.getDataTrassir = function (timeF) {
    var self = this;
    clearInterval(this.trassir_timer);
    this.trassir_timer = null;
    $.when(
        self.loadDataTrassir()
    ).done(function(data){
        self.data = data;
        if (data == null) {
            self.showArhiveError();
            return false;
        }
        self.trassirData.src = data['url'];
        self.trassirData.token = data['token'];
        self.trassirData.sid = data['sid'];
        self.setSrcTrassir(timeF);
        self.showArhive();
    }).fail(function (error) {
        self.data = null;
        self.showArhiveError(error);
    });
};

//api запрос на видео
CeraPlayer.prototype.loadDataTrassir = function (isPing) {
    var d = $.Deferred(),
        self = this,
        ping = isPing !== undefined ? '&ping' : '',
        url = self.api_domen + '/warehouse/get-channel/?channel_id=' + self.camera_id + ping;
    $.ajax({
        url: url
    }).done(function(data){
        d.resolve(data);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
        ajax.reAuth(err.status);
    });
    return d.promise();
};

//установить src архива trassir flv
CeraPlayer.prototype.setSrcTrassir = function (timeF) {
    var self = this,
        url =
            self.api_domen + '/warehouse/channel-command/?' +
            '&channel_id=' + self.camera_id +
            '&sid=' + self.trassirData['sid'] +
            '&token=' + self.trassirData['token'] +
            '&command=play' +
            '&speed=' + self.rate +
            '&start=' + dt.yymmddhhmmss2time('yy-mm-dd%20hrs:min:sec', timeF) +
            '&stop=' + dt.yymmddhhmmss2time('2019-03-01%20hrs:min:sec', timeF);
    $.ajax({
        url: url
    }).done(function(data){
        self.video_trassir.setAttribute("src", self.trassirData['src']);
        self.startTimer();
    }).fail( function(err) {
        console.log('error_setSrcTrassirFlv:', err);
        ajax.reAuth(err.status);
    });
};

