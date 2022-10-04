
//установить статус плеера в ячейке
AppVideoV2.prototype.setStatusPlayer = function (idx) {
    var player = this.players[idx],
        is_mode_online = player.camera_id > 0 && player.is_online,
        show_timeline = player.camera_id !== 0;
    this.setVideoModeOnline(is_mode_online);
    this.setToggleTimeline(show_timeline);

    this.removeEventsTimeline();
    this.addEventsTimeline(player);
};

//отключение всех событий от таймлайн
AppVideoV2.prototype.removeEventsTimeline = function () {
    this.setResetTimeline();
    this.players.forEach(function (player) {
        if (player.video !== null)
            player.removeEventTimeupdatePlayer();
    });
};

//установка статуса таймлайн и связанных элементов
AppVideoV2.prototype.addEventsTimeline = function (player) {
    var self = this;
    if (player.camera_id > 0) {
        this.timeline.time_slider.clickSlider = function (timeF, time_timestamp) {
            self.clickTimeline(player, timeF, time_timestamp);
        };
        player.is_online
            ? self.setTimelineOnline()
            : player.addEventTimeupdatePlayer();
        this.setStatusVideoDays(player);
        this.setStatusVideoTimes(player);
    }
};

//установка статуса наличия дней в календаре
AppVideoV2.prototype.setStatusVideoDays = function (player) {
    var calendar_dates = this.timeline.getTimeCalendar();
    this.video_days.get(player.camera_id, calendar_dates.date_begin, calendar_dates.date_end);
};

//установка статуса событий "наличия" и "без движения" видео на таймлайне
AppVideoV2.prototype.setStatusVideoTimes = function (player) {
    var day = this.timeline.getTimeCalendar();
    this.video_times_availability.get(player.camera_id, player.quality, day.day_begin, day.day_end);
    this.video_times_nomoved.get(player.camera_id, player.quality, day.day_begin, day.day_end);
};

//клик по таймлайну
AppVideoV2.prototype.clickTimeline = function (player, timeF, time_timestamp) {
    var self = this,
        cur_timestamp = Math.ceil(((new Date()).getTime() - self.TIME_OFFSET)/1000),
        is_online = (time_timestamp >= cur_timestamp);

    if (is_online) {
        if (!self.mode_online) {
            self.setVideoModeOnline(true);
            self.setTimelineOnline();
            self.mode_sync && !self.mode_fullscreen
                ? self.getAllOnline()
                : player.getOnline();
        }
    }
    else {
        self.setVideoModeOnline(false);
        self.setResetTimeline();
        self.mode_sync && !self.mode_fullscreen
            ? self.getAllArhive(timeF)
            : player.getVideo(timeF);

        if (self.getDopInfo) {
            self.getDopInfo(player.camera_id, timeF);
        }
    }
    this.saveToStorageCamCells();
};

//сброс таймлайна от искусственных таймеров
AppVideoV2.prototype.setResetTimeline = function () {
    clearInterval(this.online_interval);
    this.timeline.time_slider.$marker_online.hide();
};

//установка таймлайн в режим онлайн
AppVideoV2.prototype.setTimelineOnline = function () {
    var SEC_FOR_FUNCS = 15,
        iterations = 0,
        self = this;

    self.timeline.time_slider.$marker_online.show();
    self.timeline.setMarkerCurrentTime(self.TIME_OFFSET);
    clearInterval(self.online_interval);
    self.online_interval = setInterval(function() {
        iterations++;
        self.timeline.setMarkerCurrentTime(self.TIME_OFFSET);
        if (iterations % SEC_FOR_FUNCS === 0) {
            self.setStatusVideoTimes(self.players[self.cell]);
        }
    }, 1000);
};

//включает все плееры в сетке в онлайн
AppVideoV2.prototype.getAllOnline = function () {
    this.players.forEach(function (player) {
        if (player.camera_id > 0 && !player.is_online) {
            player.getOnline();
        }
    });
};

//включает все плееры в сетке в архив одно время
AppVideoV2.prototype.getAllArhive = function (timeF) {
    var markerF = timeF || this.timeline.time_slider.getMarkerF();
    this.players.forEach(function (player) {
        if (player.camera_id > 0) {
            player.getVideo(markerF);
        }
    });
};

//клик по таймлайну для доп окна
AppVideoV2.prototype.getDopInfo = function (cam_id, timeF) {
    if (!this.mode_dop_info) return false;
    if (this.product.toLowerCase() === 'cash') {
         this.getChecks(cam_id, timeF);
    }
    else if (this.product.toLowerCase() === 'enters') {
        this.getEntersData(cam_id, timeF);
    }
};
