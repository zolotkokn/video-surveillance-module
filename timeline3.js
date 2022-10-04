function TimeLine3 ($parent, init_timeF) {
	this.datetime = init_timeF || dt.timestamp2yymmddhhmmss(Date.now());
	this.time_slider =  null;

    this.availableDates = [];

    //отрисовка на таймлайне
    this.arr_video_availability = [];
    this.arr_video_nomoved = [];
    this.arr_video_recevents = [];

    this.$parent = $parent;
    this.$timeline = $parent.find('.time-block');
    this.$ed_date = null;

	this.init();
	this.initSlider();
}

TimeLine3.prototype.init = function () {
	var self = this;

    this.$ed_date = $( "#EdDate" );
    this.$btn_cut = $('.btn-panel-save-fragment');

    this.$ed_date.datepicker({
        //beforeShowDay: this.showDayCalendar.bind(this),
        onSelect: this.handleChangeDate.bind(this),
        onChangeMonthYear: this.handleChangeMonth.bind(this)
	}).datepicker( 'setDate', new Date()).parent().find('button').click( function(){
        self.$ed_date.datetimepicker("show");
    });

    $('.btn-mode-24h').click(function () {
        self.time_slider.setRangeDay();
        self.time_slider.renderEvents(self.arr_video_availability, 'availability-video');
        self.time_slider.renderEvents(self.arr_video_nomoved, 'no-moved-video');
        self.time_slider.renderEvents(self.arr_video_recevents, 'rec-events-video');
    });

    $('.btn-mode-1h').click(function () {
        self.time_slider.setRangeHour();
        self.time_slider.renderEvents(self.arr_video_availability, 'availability-video');
        self.time_slider.renderEvents(self.arr_video_nomoved, 'no-moved-video');
        self.time_slider.renderEvents(self.arr_video_recevents, 'rec-events-video');
    });

    $('.btn-mode-1m').click(function () {
        self.time_slider.setRangeMin();
        self.time_slider.renderEvents(self.arr_video_availability, 'availability-video');
        self.time_slider.renderEvents(self.arr_video_nomoved, 'no-moved-video');
        self.time_slider.renderEvents(self.arr_video_recevents, 'rec-events-video');
    });

    this.$parent[0].addEventListener('Video.Days.Load', this.loadVideoDays.bind(this));
    this.$parent[0].addEventListener('Video.Times.Availability.Load', this.loadVideoTimesAvailability.bind(this));
    this.$parent[0].addEventListener('Video.Times.NoMoved.Load', this.loadVideoTimesNoMoved.bind(this));
    this.$parent[0].addEventListener('Video.Times.RecEvents.Load', this.loadVideoTimesRecEvents.bind(this));
};

TimeLine3.prototype.initSlider = function () {
	var datetime = new Date(
            dt.yymmddhhmmss2timestamp(this.datetime)
        ),
        cur_timestamp = Math.ceil(datetime.getTime()/1000),
		start_timestamp = Math.ceil(datetime.setHours(0,0,0,0)/1000),
		end_timestamp = Math.ceil(datetime.setHours(23,59,59,999)/1000);
	//slider
    this.time_slider = new TimeSlider();
    this.time_slider.time_begin = start_timestamp;
    this.time_slider.time_end = end_timestamp;
    this.time_slider.time_marker = cur_timestamp;
    this.time_slider.init();

    this.initSavePanel();
};

//изменение месяца в календаре
TimeLine3.prototype.handleChangeMonth = function (year, month) {
    if (Number(month) < 10) month = '0' + month;
    fcn.dispatchEvent('Timeline.Change.Month', {
        year: year,
        month: month
    }, this.$parent[0]);
};

//изменение даты в календаре
TimeLine3.prototype.handleChangeDate = function (dateText) {
    var d = dateText.split('.'),
        time_begin = frmt.splitDate(dt.timestamp2date( this.time_slider.time_begin*1000 )),
        time_end = frmt.splitDate(dt.timestamp2date( this.time_slider.time_end*1000 )),
        marker = frmt.splitDate(dt.timestamp2date( this.time_slider.time_marker*1000 ));

    time_begin = dt.date2timestamp(d[2], d[1], d[0], time_begin.hrs, time_begin.min, time_begin.sec)/1000;
    time_end = dt.date2timestamp(d[2], d[1], d[0], time_end.hrs, time_end.min, time_end.sec)/1000;
    marker = dt.date2timestamp(d[2], d[1], d[0], marker.hrs, marker.min, marker.sec)/1000;

    if (this.time_slider.range === 24) {
        time_end = new Date(time_end*1000);
        time_end = Math.ceil(time_end.setHours(23,59,59,999)/1000);
    }

    //renderEvents отрисутеся при перезагрузке сетки камер на датуF
    fcn.dispatchEvent('Timeline.Change.Day', {
        markerF: dt.timestamp2yymmddhhmmss(marker*1000),
        time_begin: time_begin,
        time_end: time_end
    }, this.$parent[0]);

    //this.changeTimeline(time_begin, time_end, marker);
    return false;
};

TimeLine3.prototype.changeTimeline = function (time_begin, time_end, marker) {
    this.time_slider.setRange(time_begin, time_end);
    this.time_slider.renderLines(this.time_slider.range, this.time_slider.skip);
    this.time_slider.setMarker(marker);
};

//отрисвка дня в календаре (по наличию видео в день)
TimeLine3.prototype.showDayCalendar = function (day) {
    day = day.getDate();
    day = (day < 10) ? '0'+day : ''+day;
    return (this.availableDates.indexOf(day) > -1)
        ? [true, '', 'Есть видео']
        : [false, '', 'Нет видео'];
};

//обработчик события загрузки наличия видео в календаре
TimeLine3.prototype.loadVideoDays = function (e) {
    this.availableDates = (e.data.days) ? e.data.days : [];
    this.$ed_date.datepicker('refresh');
};

//обработчик события загрузки видео "наличия" на таймлайн
TimeLine3.prototype.loadVideoTimesAvailability = function (e) {
    var arr_times = (e.data.times) ? e.data.times : [];
    this.arr_video_availability = arr_times;
    this.time_slider.renderEvents( arr_times, 'availability-video' );
};

//обработчик события загрузки видео "без движения" на таймлайн
TimeLine3.prototype.loadVideoTimesNoMoved = function (e) {
    var arr_times = (e.data.times) ? e.data.times : [];
    this.arr_video_nomoved = arr_times;
    this.time_slider.renderEvents( arr_times, 'no-moved-video' );
};

//обработчик события загрузки видео "без движения" на таймлайн
TimeLine3.prototype.loadVideoTimesRecEvents = function (e) {
    var arr_times = (e.data.times) ? e.data.times : [];
    this.arr_video_recevents = arr_times;
    this.time_slider.renderEvents( arr_times, 'rec-events-video' );
};

/* interface */

//показать-скрыть таймлайн
TimeLine3.prototype.toggle = function (is_show) {
    this.$timeline.toggle(is_show);
};

//возвращает текущию дату календаря, начало, конец
TimeLine3.prototype.getTimeCalendar = function () {
    var date = this.$ed_date.datepicker( "getDate"),
        curr = timestamp2yymmddhhmmss(date),
        yymm = curr.substr(0,6),
        yy = yymm.substr(0,4),
        mm = yymm.substr(4,2),
        begin = yymm + '01000000',
        end = yymm + fcn.getLastDayOfMonth(yy,mm) + '235959',
        day_begin = curr.substr(0,8) + '000000',
        day_end = curr.substr(0,8) + '235959';
    return {
        date_current: curr,
        date_begin: begin,
        date_end: end,
        day_begin: day_begin,
        day_end: day_end
    }
};

//устанавливает маркер таймлайн в текущее время
TimeLine3.prototype.setMarkerCurrentTime = function (TIME_OFFSET) {
    var cur_timestamp = Math.ceil(((new Date()).getTime() - TIME_OFFSET)/1000);
    this.time_slider.setMarker(cur_timestamp);
};


//устанавливает отображение полоски онлайн
TimeLine3.prototype.setRenderOnlineBlock = function (TIME_OFFSET) {
    var self = this;
    setInterval(function(){
        var cur_timestamp = Math.ceil(((new Date()).getTime() - TIME_OFFSET)/1000),
            arr_online = [[cur_timestamp, self.time_slider.time_end]];
        self.time_slider.renderEvents(arr_online, 'online-video');
    }, 1000);
};




TimeLine3.prototype.initSavePanel = function () {
    var width_5min = 100;

    var self = this,
        $slider = this.time_slider.$slider,
        $info_panel_save = $('.info-panel-save'),
        $panel_save = $('<div id="slider-panel-save" />').appendTo($slider),
        $left = $('<div class="border-left"><div class="cut-timeline-left"></div></div>').appendTo($slider),
        $right = $('<div class="border-right"><div class="cut-timeline-right"></div></div>').appendTo($slider);

    this.$timeline.on('contextmenu', function(e){
        e.preventDefault();
        e.stopPropagation();
    });

    this.mode_cut = false;

    //отмена
    $('.btn-hide-info-panel-save').click(function(e){
        togglePanelSave(e);
    });

    //сохранить
    $('.btn-savevideo-info-panel-save').click(function(e){
        fcn.dispatchEvent('SaveVideo.InfoPanel.Click', {
            cut_time_left: $('.cut-time-left').attr('data-time'),
            cut_time_right: $('.cut-time-right').attr('data-time')
        }, self.$parent[0]);
        togglePanelSave(e);
    });

    //кнопка на панели
    this.$btn_cut.click(function (e) {
        togglePanelSave(e);
        if ($panel_save.is(":visible")) {
            $info_panel_save.css('display','inline-block');
            var length_all = self.time_slider.time_end - self.time_slider.time_begin,
                length_marker = self.time_slider.time_marker - self.time_slider.time_begin,
                x_pos = Math.ceil(length_marker * $slider.width() / length_all),
                left = Math.ceil(x_pos - width_5min/2);
            $panel_save[0].style.left = left + 'px';
            $left[0].style.left = left + 'px';
            $panel_save.width(width_5min);
            $right[0].style.left = left + width_5min + 'px';
            setTime('.cut-time-left, .cut-timeline-left', left);
            setTime('.cut-time-right, .cut-timeline-right', left+width_5min);
        }
    });

    $slider.on('contextmenu', function(e){
        if (e.which === 3) {
            togglePanelSave(e);
            if ($panel_save.is(":visible")) {
                $info_panel_save.css('display','inline-block');
                var x_pos = e.clientX - $slider.offset().left,
                    left = Math.ceil(x_pos - width_5min/2);
                $panel_save[0].style.left = left + 'px';
                $left[0].style.left = left + 'px';
                $panel_save.width(width_5min);
                $right[0].style.left = left + width_5min + 'px';
                setTime('.cut-time-left, .cut-timeline-left', left);
                setTime('.cut-time-right, .cut-timeline-right', left + width_5min);
            }
        }
    });

    var is_right_move = false,
        is_left_move = false;

    $right.on('mousedown', function(e){
        e.stopPropagation();
        e.preventDefault();
        is_right_move = true;
        $('.cut-timeline-right').show();
    });
    $left.on('mousedown', function(e){
        e.stopPropagation();
        e.preventDefault();
        is_left_move = true;
        $('.cut-timeline-left').show();
    });
    $slider.on('mousemove', function(e){
        var x_pos = 0,
            x_click = e.clientX,
            left = $slider.offset().left;
        if (is_right_move) {
            x_pos = Math.ceil(x_click - left - $right.width());
            $right[0].style.left = x_pos + 'px';
            $panel_save.width( $right.position().left - $left.position().left );
            setTime('.cut-time-right, .cut-timeline-right', x_pos);
        }
        if (is_left_move) {
            x_pos = Math.ceil(x_click - left - $left.width());
            $left[0].style.left = x_pos + 'px';
            $panel_save[0].style.left = x_pos + 'px';
            $panel_save.width( $right.position().left - $left.position().left );
            setTime('.cut-time-left, .cut-timeline-left', x_pos);
        }
    });
    $slider.on('mouseup', function(){
        is_right_move = false;
        is_left_move = false;
        $('.cut-timeline-left').hide();
        $('.cut-timeline-right').hide();
    });

    //скрыть-показать панель сохранения
    function togglePanelSave (e) {
        e.preventDefault();
        e.stopPropagation();
        self.setVideoModeCut(!self.mode_cut);
        $info_panel_save.toggle();
        $panel_save.toggle();
        $left.toggle();
        $right.toggle();
    }

    //отрисовка времени в формате hrs:min по x_pos на таймлайне
    function setTime (selector, x_pos) {
        var length_all = self.time_slider.time_end - self.time_slider.time_begin,
            cut_timestamp = (length_all * x_pos / $slider.width()) + self.time_slider.time_begin,
            cur_timeF = dt.timestamp2yymmddhhmmss(cut_timestamp*1000),
            cut_time = dt.yymmddhhmmss2time( 'hrs:min', cur_timeF);
        $(selector).html(cut_time).attr('data-time', cur_timeF);
    }
};

//установка режима и статуса кнопки режим синхроности плееров
TimeLine3.prototype.setVideoModeCut = function (is_cut) {
    this.mode_cut = is_cut;
    this.mode_cut
        ? this.$btn_cut.addClass('btn-info')
        : this.$btn_cut.removeClass('btn-info');
};


//переключить режим - день

//переключить режим - час

//переключить режим - минута

//сменить дату в календаре

//сменить день назад

//сменить день вперед

//получить текущее время маркера

//установить время маркера

//установить наличие видосов



