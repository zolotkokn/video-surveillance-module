
function AppVideoV2 (product, area, options) {
    this.product = product;
    this.area = area || '#area';
    this.options = {};
    this.options.isVideoDays = (options && options.isVideoDays) || true;

    this.video_cameras = null;
    this.video_grids = null;
    this.timeline = null;
    this.video_days = null;
    this.video_times_availability = null;
    this.video_times_nomoved = null;

    this.mode_online = false;
    this.mode_sync = true;
    this.mode_dop_info = false;
    this.quality = 'low';
    this.mode_fullscreen = false;

    var ref_config = (new Reference()).data['config']['_data'];

    this.CONFIG_ONLINE_TYPE = Number(ref_config['onlineCastType']);
    this.CONFIG_ARHIVE_TYPE = Number(ref_config['rviMode']);

    this.CONFIG_X5 = ref_config['set'] === 'x5';
    this.QUALITY_PLAYERS_COUNT = Number(ref_config['subArchiveWrite']);
    this.PLAYERS_COUNT = 24;
    this.players = [];
    this.cell = -1;

    this.timer_cashArhiveCheck = (new GlobalTimer ()).timer_cashArhiveCheck;
    clearInterval(this.timer_cashArhiveCheck);

    console.log('FLASH:', fcn.checkFlash());
    console.log('ONLINE_TYPE:', this.CONFIG_ONLINE_TYPE);
    console.log('ARHIVE_TYPE:', this.CONFIG_ARHIVE_TYPE);
    console.log('QUALITY_PLAYERS_COUNT:', this.QUALITY_PLAYERS_COUNT);
    console.log('CONFIG_X5:', this.CONFIG_X5);
    (this.CONFIG_ONLINE_TYPE === 1 && !fcn.checkFlash())
        ? $(this.area).html( fcn.getTmpl('#tmpl-check-flash') )
        : this.init();

    //время смещения текущего от времени локальной точки, сек
    this.TIME_OFFSET = 0;
    //время смещения от конца старта инита плееров, мин
    this.BEFORE_MIN = 7;

    //счетчик интервальной функции для таймлайна
    this.online_interval = null;

    //подписка на сообщение от родителя
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
    eventer(messageEvent,function(e) {
        if (e.data.message === 'EVENT_CERA_HIDE_SIDEBAR_MENU') {
            $('#sidebar-wrapper').hide();
            $('#wrapper').css('padding', 0);
        }
    },false);
    //посылаем сообщение родителю фрейма
    parent.postMessage('EVENT_CERA_VIDEOMODULE_START', '*');

    // проброк контекста в функции обновления времени по продуктам
    this.updateCheckOfTime = this.updateCheckOfTime.bind(this);
    this.updateEntersOfTime = this.updateEntersOfTime.bind(this);
}

//общий инит
AppVideoV2.prototype.init = function () {
    var self = this;
    $.when(
        this.getLocationCurrentTimeF()
    ).then(function(data){
        var cur_time = Date.now(),
            loc_time = dt.yymmddhhmmss2timestamp(data['time']);
        self.TIME_OFFSET = cur_time - loc_time;
    }).fail(function () {
        self.TIME_OFFSET = Date.now();
    }).done(function(){
        initAll();
    });

    function initAll() {
        self.initTmpl();
        self.initTimeline();
        self.initVideoDays();
        self.initVideoTimes();
        self.initListCam();
        self.initListGrid();
        self.initPlayers();
        self.initStartGrid();
        self.initStartCameras();
        self.initControls();
    }
};

//шаблон
AppVideoV2.prototype.initTmpl = function () {
    var is_cera = (Number((new User()).user_type) === 1) ? true : undefined;

    $(this.area).html(
        fcn.getTmpl('#tmpl-carcas-video2', {
            is_cera: is_cera
        })
    );
    this.$carcas = $('.block-video2');
    this.$parent = this.$carcas.find('.video-windows');
    this.$btn_mode = this.$carcas.find('.btn-mode-archive-online');
    this.$btn_sync = this.$carcas.find('.btn-mode-sync-cameras');
    this.$btn_dop_info = this.$carcas.find('.btn-mode-dop-info');
    this.$btn_playpause = this.$carcas.find('.btn-mode-play-pause');
    this.$btn_speed = this.$carcas.find('.btn-speed-video');

    this.$btn_date = this.$carcas.find('.input-calendar');
    this.$bnts_range = this.$carcas.find('.tl-mode');
    this.$btn_fullscreen = this.$carcas.find('.btn-fullscreen-on');
};

//инит таймлайн
AppVideoV2.prototype.initTimeline = function () {
    var init_timeF = this.getCurrentTimeF();
    this.timeline = new TimeLine3(this.$carcas, init_timeF);
    this.timeline.setRenderOnlineBlock(this.TIME_OFFSET);
};

//инит наличия видео в календаре
AppVideoV2.prototype.initVideoDays = function () {
    this.video_days = new Video2DaysList(this.$carcas);
    if (this.options.isVideoDays) {
        var calendar_dates = this.timeline.getTimeCalendar();
        this.video_days.get(0, calendar_dates.date_begin, calendar_dates.date_end);
    }
};

//инит "наличия" и "без движения" видео на таймлайне
AppVideoV2.prototype.initVideoTimes = function () {
    var day = this.timeline.getTimeCalendar();

    this.video_times_availability = new Video2TimesListAvailability(this.$carcas);
    this.video_times_availability.get(0, 'high', day.day_begin, day.day_end);

    this.video_times_nomoved = new Video2TimesListNoMoved(this.$carcas);
    this.video_times_nomoved.get(0, 'high', day.day_begin, day.day_end);
};


//инит списка камер
AppVideoV2.prototype.initListCam = function () {
    var self = this;
    this.video_cameras = new VideoCameras();
    this.$carcas.find('.btn-toggle-panel-cameras').click(function(){
        self.fcnToggleButton(this);
        self.video_cameras.panel_cameras.toggle();
    });
};

//инит списка сеток
AppVideoV2.prototype.initListGrid = function () {
    var self = this;
    this.video_grids = new Video2Grids();
    this.$carcas.find('.btn-toggle-panel-grids').click(function(){
        self.fcnToggleButton(this);
        self.video_grids.panel_grids.toggle();
    });
};

//инит контейнеров и плееров
AppVideoV2.prototype.initPlayers = function () {
    this.players = [];
    for (var i=0; i< this.PLAYERS_COUNT; i++) {
        var player = new CeraPlayer();
        player.initContainer(i, this.$parent, this.area);
        this.players.push(player);
    }
};

//инит начальной или сохраненной сетки
AppVideoV2.prototype.initStartGrid = function () {
    var first_grid = this.video_grids.loadLocalStorage();
    this.setGrid(first_grid);
};

//инит сохраненных камер
AppVideoV2.prototype.initStartCameras = function () {
    var ls_cams = this.loadFromStorageCamCells(),
        cell_count = this.video_grids.grid.count,
        //markerF = '20180613102000',
        markerF = this.timeline.time_slider.getMarkerF(),
        cnt = (cell_count <= ls_cams.length) ? cell_count : ls_cams.length,
        quality = (cnt > this.QUALITY_PLAYERS_COUNT) ? 'low' : 'high';
    this.quality = quality;

    //определяем есть ли режим синхрона при локалсторадж
    var arr = ls_cams.filter(function (cam) { return cam.online; });
    var mode_sync = (arr.length === ls_cams.length || arr.length === 0);
    this.setVideoModeSync(mode_sync);

    for (var i=0; i< cnt; i++) {
        var cam = ls_cams[i];
        this.setCamCell(cam.camera_id, cam.cell, markerF, cam.online, quality);
    }
    this.setCell(0);
};

//инит контролов
AppVideoV2.prototype.initControls = function () {
    var self = this;

    var $video_windows = this.$parent[0];
    //привязка события клика по ячейке
    this.$carcas.on('click', '.v2-container', {self: this}, this.clickCell);
    //добавление камеры через ячейку, клик по кнопке +
    this.$carcas.on('click', '.btn-add-cell-cam', {self: this}, this.handelBtnAddCellCamera);
    //фулскрин двойным кликом
    this.$carcas.on('dblclick', '.v2-container', {self: this}, this.handleFullScreenOnOff);
    this.$btn_fullscreen.on('click', {self: this}, this.handleBtnFullScreenOnOff );

    //зум правой кнопкой по контейнеру видео
    this.$carcas.on('contextmenu', '.v2-container', {self: this}, this.setZoomOnOff);
    //подписка на клик по шаблону сетки
    fcn.addListerEvent('Grid.Click', this.clickGrid.bind(this), $video_windows);
    //подписка на клик камеры
    fcn.addListerEvent('Camera.Click', this.clickCamera.bind(this), $video_windows);
    //подписка на добавление всех камер
    fcn.addListerEvent('Camera.All.Click', this.clickCameraAll.bind(this), $video_windows);
    //подписка на изменение даты в календаре
    fcn.addListerEvent('Timeline.Change.Day', this.changeDate.bind(this), this.$carcas[0]);
    //подписка на изменение даты в календаре
    fcn.addListerEvent('Timeline.Change.Month', this.changeMonth.bind(this), this.$carcas[0]);

    //кнопка переключения архив-онлайн
    this.$btn_mode.on('click', {self: this}, this.changeMode );
    //удаление камеры в сетке
    $('.btn-remove-playercamera').on('click', {self: this}, this.handleRemoveCamera );

    //переключение режима синхронного воспроизведения
    this.$btn_sync.on('click', {self: this}, this.setSyncCameras );
    //кнопка показа доп инфо поверх плееров
    this.$btn_dop_info.on('click', {self: this}, this.setDopInfo );
    //переключение режима play-pause
    this.$btn_playpause.on('click', {self: this}, this.setPlayPause );
    //переключение скорости видео
    //this.$btn_speed.on('click', {self: this}, this.handleSpeedVideo );


    this.$btn_speed2 = $('#cbSpeedVideo');
    var range = this.$btn_speed2.find('.input-range'),
        value = this.$btn_speed2.find('.range-value'),
        hidden = this.$btn_speed2.find('.range-hint');

    value.html(range.attr('value'));
    hidden.html(range.attr('value'));

    range.on('input', function(){
        value.html(this.value);
        hidden.html(this.value);
        self.handleSpeedVideo(this.value);
    });

    /* panel save files */

    var panel_saves = new MoveoutPanel('.video-windows', 'panel-saves', 'left');
    var videoSave = new VideoSave();
    panel_saves.setContent( fcn.getTmpl('#tmpl-list-video-saves') );

    loadSaveList(false);

    function loadSaveList(is_update, clip_id) {
        is_update = is_update || false;
        var is_can_download = !self.CONFIG_X5 || (self.CONFIG_X5 && (Number(new User()).roleCode) === 9);
        $.when(videoSave.getList(clip_id)).done(function(data){
            var html = '';
            for (var i=0; i< data.length; i++) {
                if (is_can_download) {
                    data[i].is_can_download = 1;
                }
                html += fcn.getTmpl('#tmpl-win-video2-saves-rec', {
                    list_video_saves_rec: data[i],
                    frmt_time: fcnRep.frmt_time,
                    frmt_date: fcnRep.frmt_date
                });
            }
            var $tbl_save = $('.list-video-saves').find('.tbl-saves');
            (is_update)
                ? $tbl_save.append(html)
                : $tbl_save.html(html);
        }).fail(function(error){
            error = error.responseText;
        });
    }

    function filterSaveList (status) {
        var $rec_save = $('.list-video-saves').find('.td-video-save');
        $rec_save.hide();
        if (status === 'all') $rec_save.show();
        if (status === 'save') $rec_save.filter('.status-2').show();
        if (status === 'error') $rec_save.filter('.status-500').show();
        if (status === 'process') $rec_save.filter('.status-0,.status-1').show();
    }

    //кнопки-фильтр для списка сохр видео
    $(".btn-videosave-status > .btn").click(function(){
        var elem = $(this),
            status = elem.data('status');
        elem.addClass("active").siblings().removeClass("active");
        filterSaveList( status );
    });

    //окно сохранения нового файла
    var panel_win_video_save = new MoveoutPanel('.video-windows', 'panel-win-video-save', 'top');
    panel_win_video_save.setContent(
        fcn.getTmpl('#tmpl-win-video-save')
    );

    //инициализация поле выбора периода
    panel_win_video_save.initDateFields = function () {
        var ed_begin = $( "#EdBegin" );
        var ed_end = $( "#EdEnd" );
        ed_begin.datetimepicker({
            beforeShow: function() {setTimeout(function(){$('.ui-datepicker').css('z-index', 1002);}, 0);}
        });
        ed_end.datetimepicker({
            beforeShow: function() {setTimeout(function(){$('.ui-datepicker').css('z-index', 1002);}, 0);}
        });
        var dd = new Date(),
            dd1 = new Date( dd.getFullYear(), dd.getMonth(), dd.getDate(), dd.getHours(), dd.getMinutes()-20, 0),
            dd2 = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), dd.getHours(), dd.getMinutes()-10, 0);
        ed_begin.datepicker('setDate', dd1);
        ed_end.datepicker('setDate', dd2);
        ed_begin.parent().find('button').click( function(){
            ed_begin.datetimepicker("show");
        });
        ed_end.parent().find('button').click( function(){
            ed_end.datetimepicker("show");
        });
    };

    panel_win_video_save.initDateFields();

    //открываем окно для сохранения видофрагмента
    $('.btn-new-videosave').click(function(){
        self.fcnToggleButton(this);
        $(this).removeClass('btn-info');
        panel_win_video_save.toggle();
    });

    //кнопка сохранить в окне сохр видео
    $('.btn-videofragment-save').click(function(){
        var player = self.getActiveArhPlayer();
        if (!player) {
            alert('В данном окне видео-сетки не выбрана камера!');
            return false;
        }

        var cam_id = player['camera_id'],
            startTimeF = dt.getQueryDateTime($( "#EdBegin").val()) + '00',
            endTimeF   = dt.getQueryDateTime($( "#EdEnd").val()) + '00',
            stream = (player['quality'] === 'high') ? 0 : 1,
            send_mail = Number(self.CONFIG_X5);
        whenSaveVideo(cam_id, startTimeF, endTimeF, stream, send_mail);
        self.fcnToggleButton();
        panel_win_video_save.hide();
    });

    function whenSaveVideo (cam_id, startTimeF, endTimeF, stream, send_mail) {
        $.when(videoSave.save(cam_id, startTimeF, endTimeF, stream, send_mail)).done(function(data){
            loadSaveList();
            var txt_info = (self.CONFIG_X5 && (new User()).roleCode !== 9)
                ? 'Запрос на сохранение видео принят, письмо направлено ТМБ, ожидайте подверждения.'
                : 'Запрос на сохранение видео принят. Ожидайте ссылку в списке сохраненных фрагментов.';
            fcn.renderInfo(txt_info);
        }).fail(function(error){
            error = error.responseText;
            var txt = (error === 'No Videos')
                ? 'Не возможно сохранить фрагмент. Видео файл отсутствует!'
                : 'Произощла неизвестная ошибка во время сохранения. Повторите попытку.';
            fcn.renderError(txt);
        });
    }

    //кнопка отмена в окне сохр видео
    $('.btn-videofragment-cancel').click(function(){
        self.fcnToggleButton();
        panel_win_video_save.hide();
    });

    $('.btn-toggle-panel-saves').click(function(){
        self.fcnToggleButton(this);
        panel_saves.toggle();
    });

    $('.btn-upload-videosave').click(function(){
        alert('Видео не найдено!');
    });

    $('.btn-delete-videosave').click(function(){
        $(this).parent().parent().remove();
    });

    //подписка на сохранение фрагмента видео
    fcn.addListerEvent('SaveVideo.InfoPanel.Click', function (e) {
        var player = self.getActiveArhPlayer();
        if (!player) {
            alert('В данном окне видео-сетки не выбрана камера!');
            return false;
        }
        var cam_id = player['camera_id'],
            startTimeF = e.data.cut_time_left,
            endTimeF = e.data.cut_time_right,
            stream = (player['quality'] === 'high') ? 0 : 1,
            send_mail = Number(self.CONFIG_X5);
        whenSaveVideo(cam_id, startTimeF, endTimeF, stream, send_mail);
    }, this.$carcas[0]);


    //resize win
    fcn.addListerEvent('RESIZE.MULTIVIDEO', this.handleResizeWin.bind(this), $('.area-storage')[0]);

    //дебаркадер
    this.$carcas.on('click', '.btn-screen-debarkader-in', {self: this}, this.handelBtnScreenDebarkaderIn);
    this.$carcas.on('click', '.btn-screen-debarkader-out', {self: this}, this.handelBtnScreenDebarkaderOut);

    //счетчик
    this.$carcas.on('click', '.btn-screen-counter-in', {self: this}, this.handelBtnCounterIn);
    this.$carcas.on('click', '.btn-screen-counter-out', {self: this}, this.handelBtnCounterOut);
    this.$carcas.on('click', '.btn-screen-counter-inside', {self: this}, this.handelBtnCounterInside);
    this.$carcas.on('click', '.btn-screen-counter-rep', {self: this}, this.handelBtnCounterRep);
};



//смена сетки шаблонов камер
AppVideoV2.prototype.setGrid = function (grid) {
    var self = this;
    //инит сетки 2х2
    this.$parent.find('.tbl-video-grid-v2').remove();
    this.$parent.append(
        fcn.getTmpl('#' + grid.tmpl)
    );
    //выставляем все контейнеры в ноль
    for (var i=0; i< self.players.length; i++) {
        self.players[i].$container.css({
            top: 0, left: 0, width: 0, height: 0
        });
    }
    //выставляем позицию контейнеров по сетке
    var $video_win = $('.video-win');
    $video_win.each(function(i, elem){
        var $container = self.players[i].$container,
            $cell = $(elem);
        self.setPositionContainerOfCell( $container, $cell );

        var $info = self.players[i].$info.find('.info-panel'),
            w = $info.width();
        var k = w / 540;
        $info.find('.tbl').css({transform: 'scale('+k+')'});
    });
    //если плееров больше чем ячеек сетки, выключаем их
    self.closePlayers($video_win.length);
};

//клик по шаблону сетки
AppVideoV2.prototype.clickGrid = function (e) {
    var grid = e.data;
    this.video_grids.saveLocalStorage(grid.tmpl);
    this.$carcas.find('.btn-toggle-panel-grids').trigger('click');
    this.setGrid(grid);
    this.saveToStorageCamCells();
};

//клик по ячейке, установка активной ячейки
AppVideoV2.prototype.clickCell = function (e) {
    var self = e.data.self,
        $el = $(this),
        idx = Number($el.data('idx'));
    if (self.cell === idx) return false;
    self.setCell(idx, $el);
};

//установки активной ячейки
AppVideoV2.prototype.setCell = function (idx, $el) {
    $el = $el || this.$parent.find('.v2-container').first();
    this.cell = idx;
    this.$parent.find('.v2-container').removeClass('cell-first-active');
    $el.addClass('cell-first-active');
    this.setStatusPlayer(idx);
};


//клик по камере
AppVideoV2.prototype.clickCamera = function (e) {
    var cam_id = e.data.cam_id;
    this.$carcas.find('.btn-toggle-panel-cameras').trigger('click');
    this.addCamera(cam_id);
    this.saveToStorageCamCells();
};

//добавление одной камеры в ячейку
AppVideoV2.prototype.addCamera = function (cam_id) {
    var idx = this.cell,
        markerF = this.getFirstArhPlayerTimeF(),
        emty_vp = (this.players[idx].camera_id === 0) ? 1 : 0,
        active_pl_cnt = this.getActivePlayersCount(emty_vp),
        is_change_quality = active_pl_cnt > this.QUALITY_PLAYERS_COUNT,
        quality = (is_change_quality) ? 'low' : 'high';
    if (quality !== this.quality && is_change_quality) {
        this.changeQuality(quality);
    }
    this.setCamCell(cam_id, idx, markerF, this.mode_online, quality);
    this.setStatusPlayer(idx);
};

//клик по всем камера
AppVideoV2.prototype.clickCameraAll = function (e) {
    var cameras = e.data.cameras;
    this.$carcas.find('.btn-toggle-panel-cameras').trigger('click');
    this.addCameraAll(cameras);
    this.saveToStorageCamCells();
};

//добавление всех камер в ячейку
AppVideoV2.prototype.addCameraAll = function (cameras) {
    var cameras_count = cameras.length,
        markerF = this.getCurrentTimeF(),
        cell_count = this.video_grids.grid.count,
        cnt = (cell_count > cameras_count) ? cameras_count : cell_count,
        quality = (cnt > this.QUALITY_PLAYERS_COUNT) ? 'low' : 'high';
    this.quality = quality;
    this.closePlayers();
    for (var idx=0; idx< cnt; idx++) {
        var cam_id = cameras[idx]['pk'];
        this.setCamCell(cam_id, idx, markerF, this.mode_online, quality);
        if (idx === this.cell) {
            this.setStatusPlayer(idx);
        }
    }
};

//загружаем видео в ячейке
AppVideoV2.prototype.setCamCell = function (cam_id, idx, markerF, is_online, quality) {
    var self = this,
        player = this.players[idx],
        cam = fcn.findArrData(this.video_cameras.cameras, 'pk', cam_id);
    var cam_title = cam !== false ? cam['fields']['name'] : 'Кам:' + cam_id;
    player.quality = quality;

    player.setCam(cam_id, cam_title);
    if (!player.first_init) {
        player.initContainerVideo(self.CONFIG_ONLINE_TYPE, self.CONFIG_ARHIVE_TYPE, cam);
        player.updateTime = function () {
            self.timeline.time_slider.setMarker(
                player.getCurrentTimestamp()
            );
        };
    }
    is_online
        ? player.getOnline()
        : player.getVideo(markerF);
};

//обработчик удаления камеры
AppVideoV2.prototype.handleRemoveCamera = function (e) {
    var self = e.data.self;
    (self.mode_sync)
        ? self.removeAllCameras()
        : self.removeCurrentCamera();
};

//удаление текущей камеры
AppVideoV2.prototype.removeCurrentCamera = function () {
    var self = this,
        player = self.players[self.cell];
    if (player.camera_id > 0) {
        player.closePlayer();
        self.setStatusPlayer(self.cell);
        self.saveToStorageCamCells();
        var active_pl_cnt = self.getActivePlayersCount(),
            is_change_quality = active_pl_cnt <= self.QUALITY_PLAYERS_COUNT,
            quality = (is_change_quality) ? 'high' : 'low';
        if ((quality !== self.quality) && is_change_quality) {
            self.changeQuality(quality);
        }
        if (self.players === 0)
            self.quality = 'high';
    }
};

//удаление всех камер
AppVideoV2.prototype.removeAllCameras = function () {
    this.closePlayers();
    this.setStatusPlayer(this.cell);
    this.saveToStorageCamCells();
};

//обработчтк переключения режима архив-онлайн
AppVideoV2.prototype.changeMode = function (e) {
    var self = e.data.self,
        markerF = self.timeline.time_slider.getMarkerF(),
        player = self.players[self.cell];
    self.setVideoModeOnline(!self.mode_online);

    if (player.camera_id > 0) {
        if (self.mode_online) {
            self.setTimelineOnline();
            self.mode_sync && !self.mode_fullscreen
                ? self.getAllOnline()
                : player.getOnline();
        }
        else {
            self.setResetTimeline();
            self.mode_sync && !self.mode_fullscreen
                ? self.getAllArhive(markerF)
                : player.getVideo(markerF);
        }
        self.saveToStorageCamCells();
    }
    $(this).blur();
};

//режим синхронного воспроизведения архива
AppVideoV2.prototype.setSyncCameras = function (e) {
    var self = e.data.self;
    self.setVideoModeSync(!self.mode_sync);
    //TODO убрать текущий плеер
    self.allSync();
};

//кнопка доп инфо поверх
AppVideoV2.prototype.setDopInfo = function (e) {
    var self = e.data.self;
    //markerF = self.timeline.time_slider.getMarkerF(),
    self.setModeDopInfo(!self.mode_dop_info);
    self.players.forEach(function (player) {
        if (player.camera_id > 0 && !player.is_online) {
            self.mode_dop_info
                ? player.$info.find('.info-wrapper').addClass('visible')
                : player.$info.find('.info-wrapper').removeClass('visible');
        }
    });

    if (!self.mode_dop_info) {
        clearInterval(self.timer_cashArhiveCheck);
    }

    var $area = $('.area-storage')[0]; //TODO изменить $area
    if (self.product.toLowerCase() === 'cash') {
        self.mode_dop_info
            ? fcn.addListerEvent('updateTimeCeraPlayer', self.updateCheckOfTime, $area)
            : fcn.removeListerEvent('updateTimeCeraPlayer', self.updateCheckOfTime, $area);
    }
    if (self.product.toLowerCase() === 'enters') {
        self.mode_dop_info
            ? fcn.addListerEvent('updateTimeCeraPlayer', self.updateEntersOfTime, $area)
            : fcn.removeListerEvent('updateTimeCeraPlayer', self.updateEntersOfTime, $area);

        if (self.mode_dop_info) {
            $.when(
                self.apiLoadEntersGroups()
            ).then(function (dataGroup) {
                self.players.forEach(function (player) {
                    if (player.camera_id > 0 && !player.is_online) {
                        var $blockEnter = player.$info.find('.info-panel');
                        $blockEnter.html(fcn.getTmpl('#tmpl-video2-info-panel-enters', {
                            entersGroups: dataGroup || []
                        }));
                        player.$entersGroups = $blockEnter.find('.cbEntersGroups');
                        $blockEnter.find('.video2-info-enter').height($blockEnter.height() - 20);
                    }
                });
            });
        } else {
            self.players.forEach(function (player) {
                if (player.camera_id > 0 && !player.is_online) {
                    player.$info.find('.info-panel').empty();
                    player.enters = null;
                    player.$entersGroups = null;
                    player.isViewEnters = false;
                }
            });
        }
    }
};

//установка синхрона всем плеерам
AppVideoV2.prototype.allSync = function (timeF, ignor_player_id) {
    if (this.mode_sync) {
        ignor_player_id = ignor_player_id || -1;
        var player = this.players[this.cell];
        if (!player.is_online && player.camera_id > 0) {
            var markerF = timeF || this.timeline.time_slider.getMarkerF(); //TODO markerF???
            this.players.forEach(function (player) {
                if (!player.is_online && player.camera_id > 0 && player.id !== ignor_player_id) {
                    player.getVideo(markerF);
                }
            });
        }
    }
};



//обработчик фулскрин двойным кликом
AppVideoV2.prototype.handleFullScreenOnOff = function (e) {
    if (e.which === 1) {
        var self = e.data.self;
        self.setFullScreenOnOff();
    }
};

//фулскрин двойным кликом
AppVideoV2.prototype.setFullScreenOnOff = function () {
    var $el = this.$parent.find('.v2-container.cell-first-active'),
        idx = $el.data('idx'),
        player = this.players[idx],
        is_fullscreen = !$el.hasClass('fullscreen');
    this.mode_fullscreen = is_fullscreen;
    is_fullscreen
        ? $el.addClass('fullscreen')
        : $el.removeClass('fullscreen');
    is_fullscreen
        ? this.$btn_fullscreen.show()
        : this.$btn_fullscreen.hide();
    if (this.getActivePlayersCount() > this.QUALITY_PLAYERS_COUNT) {
        var quality = is_fullscreen ? 'high' : 'low';
        player.changeQuality(quality);
        this.setStatusVideoTimes(player);
    }

    var $info = player.$info.find('.info-panel'),
        w = $info.width();
    var k = w / 540;
    $info.find('.tbl').css({transform: 'scale('+k+')'});
};

//нажатие кнопки фулскрин на панели
AppVideoV2.prototype.handleBtnFullScreenOnOff = function (e) {
    var self = e.data.self;
    self.setFullScreenOnOff();
};

//зум правой кнопкой по контейнеру видео
AppVideoV2.prototype.setZoomOnOff = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var $el = $(this);
    if (e.which === 3) {
        var is_zoom = !$el.hasClass('zoom');
        is_zoom
            ? $el.addClass('zoom')
            : $el.removeClass('zoom');
        if (!is_zoom) {
            var $arhive = $el.find('.v2-player-arhive')[0],
                $online = $el.find('.v2-player-online')[0];
            $arhive.style.left = '0px';
            $arhive.style.top = '0px';
            $online.style.left = '0px';
            $online.style.top = '0px';
        }
        else {
            var parentOffset = $el.offset(),
                relX = e.pageX - parentOffset.left,
                relY = e.pageY - parentOffset.top;

            var sel = $el.find('.v2-player-arhive')[0],
                cw = $el.innerWidth(),
                ch = $el.innerHeight(),
                vw = sel.offsetWidth,
                vh = sel.offsetHeight,
                sx = (vw - cw),
                sy = (vh - ch),
                cpoint_kx = relX / cw,
                cpoint_ky = relY / ch,
                vpoint_x = vw * cpoint_kx,
                vpoint_y = vh * cpoint_ky,
                centr_x = cw / 2,
                centr_y = ch / 2,
                left = centr_x - vpoint_x,
                top = centr_y - vpoint_y;

            if (left > 0) left = 0;
            if (top > 0) top = 0;
            if (left < 0 && left <= -sx) left = -sx;
            if (top < 0 && top <= -sy) top = -sy;

            sel.style.left = Math.ceil(left) + 'px';
            sel.style.top = Math.ceil(top) + 'px';

            var sel_online = $el.find('.v2-player-online')[0];
            sel_online.style.left = Math.ceil(left) + 'px';
            sel_online.style.top = Math.ceil(top) + 'px';
        }
    }
};

//смена даты в календаре
AppVideoV2.prototype.changeDate = function (e) {
    var markerF = e.data.markerF,
        time_begin =  e.data.time_begin,
        time_end = e.data.time_end;
    this.players.forEach(function(player){
        if (player.camera_id > 0 && !player.is_online) {
            player.removeEventTimeupdatePlayer();
        }
    });
    this.timeline.changeTimeline(time_begin, time_end, markerF);
    this.players.forEach(function(player){
        if (player.camera_id > 0 && !player.is_online) {
            player.getVideo(markerF);
        }
    });
    this.setStatusPlayer(this.cell);
};

//смена месяца в календаре
AppVideoV2.prototype.changeMonth = function (e) {
    var yy = e.data.year,
        mm = e.data.month,
        beginF = '' + yy + mm + '01000000',
        endF = '' + yy + mm + fcn.getLastDayOfMonth(yy, mm) + '235959';
    if (this.options.isVideoDays) {
        var player = this.getActivePlayer();
        this.video_days.get(player.camera_id, beginF, endF);
    }
};

//обрабочик кнопки Добавить камеру через ячейку
AppVideoV2.prototype.handelBtnAddCellCamera = function () {
    var $btn_cam = $('.btn-toggle-panel-cameras');
    if (!$btn_cam.hasClass('btn-info'))
        $btn_cam.trigger('click');
};

//загрузить из localStorage соответствие камер и ячеек сетки
AppVideoV2.prototype.loadFromStorageCamCells = function () {
    var self = this,
        arr_cam_cells = localStorage.getItem('video_cam_cells'),
        result = [];
    if (arr_cam_cells === null) {
        this.saveToStorageCamCells();
    }
    else {
        result = JSON.parse(arr_cam_cells);
        result = result.filter(function(cam){
            return fcn.findArrData(self.video_cameras.cameras, 'pk', cam.camera_id) !== false;
        });
    }
    return result;
};

//сохранить в localStorage соответствие камер и ячеек сетки
AppVideoV2.prototype.saveToStorageCamCells = function () {
    var arr_cell_camera = [];
    this.players.forEach(function (vp) {
        if (vp.camera_id > 0) {
            arr_cell_camera.push({
                cell: vp.id,
                camera_id: vp.camera_id,
                online: vp.is_online
            });
        }
    });
    localStorage.setItem('video_cam_cells', JSON.stringify(arr_cell_camera) );
};

/* funcs */

//закрытие всех плееров до конца начиная с индекса start_idx
AppVideoV2.prototype.closePlayers = function (start_idx) {
    start_idx = start_idx || 0;
    for (var i=start_idx; i< this.players.length; i++) {
        this.players[i].closePlayer();
    }
};

//изменение качества архивной сетки
AppVideoV2.prototype.changeQuality = function (quality) {
    this.quality = quality;
    this.players.forEach(function (player) {
        if (player.camera_id > 0) {
            player.changeQuality(quality);
        }
    });
};

//количество активных архивных плееров
AppVideoV2.prototype.getActivePlayersCount = function (dop_count) {
    dop_count = dop_count || 0;
    return this.players.filter(function (player) {
            return player.camera_id > 0;
        }).length + dop_count;
};

//переключение состояния кнопок панелей
AppVideoV2.prototype.fcnToggleButton = function (cur_el) {
    var $cur_el = $(cur_el);
    this.$carcas.find('.btn-toggle-panel').each(function(i, elem){
        if (elem !== cur_el && $(elem).hasClass('btn-info')) $(elem).trigger('click');
    });
    $cur_el.hasClass('btn-info')
        ? $cur_el.removeClass('btn-info')
        : $cur_el.addClass('btn-info');
    $cur_el.blur();
};

//позиционирование контейнера видео по ячейке сетке
AppVideoV2.prototype.setPositionContainerOfCell = function ($container, $cell) {
    var top = $cell.position().top + 1,
        left = $cell.position().left + 1,
        width = $cell.width() + 1,
        height = $cell.height() + 1;
    $container.css({
        top: top + 'px',
        left: left + 'px',
        width: width + 'px',
        height: height + 'px'
    });
};


//активный плеер в сетке
AppVideoV2.prototype.getActivePlayer = function () {
    var player = this.players[this.cell];
    return (player.camera_id > 0) ? player : false;
};

//активный арихвный плеер в сетке
AppVideoV2.prototype.getActiveArhPlayer = function () {
    var player = this.players[this.cell];
    return (player.camera_id > 0 && !player.is_online) ? player : false;
};

//первый архивный плеер в сетке
AppVideoV2.prototype.getFirstArhPlayer = function () {
    var result = false;
    for (var i=0; i< this.players.length; i++) {
        var player = this.players[i];
        if (player.camera_id > 0 && !player.is_online) {
            result = player;
            break;
        }
    }
    return result;
};

//время найденого архивного плеера
AppVideoV2.prototype.getFirstArhPlayerTimeF = function () {
    var frt_player = this.getFirstArhPlayer();
    return (frt_player)
        ? dt.timestamp2yymmddhhmmss(frt_player.getCurrentTimestamp() * 1000)
        : this.getCurrentTimeF();
};

//время таймлайн в момент инита
AppVideoV2.prototype.getCurrentTimeF = function () {
    return dt.timestamp2yymmddhhmmss(Date.now() - this.TIME_OFFSET - 1000 * 60 * this.BEFORE_MIN);
};

//возвращает текущее время точки
AppVideoV2.prototype.getLocationCurrentTimeF = function () {
    var d = $.Deferred(),
        url = '/counter/gettime';
    $.ajax({
        url: url
    }).done(function(p){
        d.resolve(p);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
    });
    return d.promise();
};



//установка режима и статуса кнопки режим архив-онлайн
AppVideoV2.prototype.setVideoModeOnline = function (is_online) {
    this.mode_online = is_online;
    this.mode_online
        ? this.$btn_mode.addClass('btn-info')
        : this.$btn_mode.removeClass('btn-info');
};

//установка режима и статуса кнопки режим синхроности плееров
AppVideoV2.prototype.setVideoModeSync = function (is_sync) {
    this.mode_sync = is_sync;
    this.mode_sync
        ? this.$btn_sync.addClass('btn-info')
        : this.$btn_sync.removeClass('btn-info');
};

//установка режима и статуса кнопки режим дополнительной инфо поверх плееров
AppVideoV2.prototype.setModeDopInfo = function (is_dop) {
    this.mode_dop_info = is_dop;
    this.mode_dop_info
        ? this.$btn_dop_info.addClass('btn-info')
        : this.$btn_dop_info.removeClass('btn-info');
};

//установка видимости таймлайн и кнопок календаря
AppVideoV2.prototype.setToggleTimeline = function (show_timeline) {
    this.timeline.toggle(show_timeline);
    this.$btn_date.toggle(show_timeline);
    this.$bnts_range.toggle(show_timeline);
};

//установка режима play-pause
AppVideoV2.prototype.setVideoModePlayPause = function (is_play) {
    is_play
        ? this.$btn_playpause.find('span').addClass('fa-pause')
        : this.$btn_playpause.find('span').removeClass('fa-pause');
};

AppVideoV2.prototype.getVideoModePlayPause = function () {
    return this.$btn_playpause.find('span').hasClass('fa-pause');
};

AppVideoV2.prototype.setPlayPause = function (e) {
    var self = e.data.self,
        is_play = !self.getVideoModePlayPause();
    self.setVideoModePlayPause(is_play);

    function playpausePlayer(player, is_play) {
        is_play
            ? player.play()
            : player.pause();
    }

    if (self.mode_sync) {
        self.players.forEach(function (player) {
            if (player.camera_id > 0 && !player.is_online) {
                playpausePlayer(player, is_play);
            }
        });
    }
    else {
        var player = self.getActivePlayer();
        if (player !== false && player.camera_id > 0 && !player.is_online) {
            playpausePlayer(player, is_play);
        }
    }
};

//установка скорости видео
//AppVideoV2.prototype.getVideoSpeed = function () {
//    return this.$btn_speed.find('option:selected').val();
//};

AppVideoV2.prototype.handleSpeedVideo = function (speed) {
    var self = this;

    if (self.mode_sync) {
        self.players.forEach(function (player) {
            if (player.camera_id > 0 && !player.is_online) {
                player.setPlayRate(speed);
            }
        });
    }
    else {
        var player = self.getActivePlayer();
        if (player !== false && player.camera_id > 0 && !player.is_online) {
            player.setPlayRate(speed);
        }
    }
};

AppVideoV2.prototype.handleResizeWin = function () {
    var self = this;
    $('.video-win').each(function(i, elem){
        self.setPositionContainerOfCell( self.players[i].$container, $(elem) );
        (new VideoRegion()).init( self.players[i].$region, self.players[i].regions, [1280, 720] );
    });
};

/* РЦ 1 */

//установка сетки по количеству камер
AppVideoV2.prototype.setGridOfCount = function (count_cams) {
    var arr = this.video_grids.grids,
        choosen_grid = {
            tmpl: this.video_grids.grids[1]['tmpl'], //2x2
            count: this.video_grids.grids[1]['count']
        };
    for (var i=0; i< arr.length; i++) {
        var grid = arr[i];
        if (grid.count >= count_cams) {
            choosen_grid = grid;
            break;
        }
    }
    this.setGrid(choosen_grid);
};

//инит сохраненных камер
AppVideoV2.prototype.playVideoOfCameras = function (cams, timeF, regions) {
    var cnt = cams.length,
        quality = (cnt > this.QUALITY_PLAYERS_COUNT) ? 'low' : 'high';
    this.quality = quality;

    this.setVideoModeSync(true);

    var dd = dt.yymmddhhmmss2timeobj(timeF);
    this.timeline.$ed_date.datepicker("setDate", new Date(dd.yy, Number(dd.mm)-1, dd.dd) );
    this.timeline.handleChangeDate(
        dt.yymmddhhmmss2time('dd.mm.yy', timeF)
    );

    for (var cell=0; cell< cnt; cell++) {
        var cam = cams[cell];
        this.setCamCell(cam, cell, timeF, false, quality);

        var player = this.players[cell];
        player.regions = regions;
        (new VideoRegion()).init( player.$region, player.regions, [1280, 720] );
    }
    this.setCell(0);
};
