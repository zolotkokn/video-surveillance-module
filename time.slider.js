
function TimeSlider () {
	this.$slider = null;
	this.$marker = null;
	this.$marker_txt = null;

	this.range = 24;
    this.skip = 0;
	this.time_begin = 0;
	this.time_end = 0;
	this.time_marker = 0;

	this.can_update_marker = true;
}

//инициализация рендер
TimeSlider.prototype.init = function () {
	var self = this;
	self.$slider = $("#slider-range").slider({
		min: self.time_begin,
		max: self.time_end,
		step: 1,
		value: self.time_marker
	});
	self.$marker = self.$slider.find('.ui-slider-handle');
    self.$marker.removeAttr('href');
	self.$marker_txt = $('<div id="marker-time" />').appendTo(self.$marker);
    self.$marker_online = $('<div id="marker-online">онлайн</div>').appendTo(self.$marker);
    self.setMarkerText(self.time_marker);
	self.renderLines(this.range);
    self.initListeners();
};

//инит событий
TimeSlider.prototype.initListeners = function () {
	var self = this;
	self.$slider.
		on( "slide", function( e, ui ) {
            self.setMarkerText(ui.value);
			self.$marker.show();
		}).
		on( "slidestart", function() {
			self.can_update_marker = false;
		}).
		on( "slidestop", function( e, ui ) {
            var value_timestamp = ui.value,
                cur_timestamp = Math.ceil((new Date()).getTime()/1000),
                valueF = dt.timestamp2yymmddhhmmss(value_timestamp * 1000),
                frmt_valueF = dt.yymmddhhmmss2time('mm.dd hrs:min:sec', valueF),
                is_online = (value_timestamp >= cur_timestamp);

            /*
            if (is_online) {
                //val_marker = cur_timestamp;
                //val = dt.timestamp2yymmddhhmmss(val_marker * 1000);
                self.$marker_online.show();
            }
            else {
                self.$marker_online.hide()
            }
            */

            self.clickSlider(valueF, value_timestamp);
			self.can_update_marker = true;
            self.setMarker(value_timestamp);
		}).
		on( "slidechange", function( /*e, ui*/ ) {
            //console.log('setMarker CHANGE');
		});
};

//отрисовка текста маркера
TimeSlider.prototype.setMarkerText = function (timestamp) {
    this.$marker_txt.html(
        this.frmtDatetime(new Date(timestamp*1000))
    );
};

//установка маркера
TimeSlider.prototype.setMarker = function (marker_timestamp, is_forced) {
    is_forced = is_forced || false;
	if (this.can_update_marker || is_forced) {
		if (this.time_begin <= marker_timestamp && marker_timestamp <= this.time_end) {
			this.time_marker = marker_timestamp;
			this.$slider.slider('value', marker_timestamp);
			this.setMarkerText(marker_timestamp);

            //TODO если время маркера больше текущего, то пишем онлайн и заменяем время маркера на текущее

			this.$marker.show();
		}
		else {
			this.$marker.hide();
		}
	}
};

//возвращает маркер
TimeSlider.prototype.getMarker = function () {
	return this.time_marker;
};

//возвращает маркер в формате yymmddhhmmss
TimeSlider.prototype.getMarkerF = function () {
	return dt.timestamp2yymmddhhmmss(this.time_marker * 1000);
};

//отрисовка делений шкалы
TimeSlider.prototype.renderLines = function (range, skip) {
    skip = skip || 1;
    if (skip === 0) skip = 1;
    this.range = range;
    this.skip = skip;
	this.$slider.find('.line-hour').remove();
	var left = (100 / range).toFixed(2),
		html = '';
	for (var i=0; i<(range+1); i++) {
        if (i !== 0 && i !== range && i % skip !== 0) continue;
		html +=
			'<div class="line-hour" style="left: ' + (i*left) + '%;">' +
				'<div class="line-hour-title">' + i + '</div>' +
			'</div>';
	}
	this.$slider.append(html);
	var $lines = this.$slider.find('.line-hour');
	$lines.first().addClass('hide-line').find('.line-hour-title').html(
        this.frmtDatetime(new Date(this.time_begin*1000), false) + '<br>' +
        '<div>' + dt.yymmddhhmmss2time( 'dd.mm', dt.timestamp2yymmddhhmmss(this.time_begin*1000) ) + '</div>'
    );
	$lines.last().addClass('hide-line').find('.line-hour-title').html(
        this.frmtDatetime(new Date(this.time_end*1000), false) + '<br>' +
        '<div>' + dt.yymmddhhmmss2time( 'dd.mm', dt.timestamp2yymmddhhmmss(this.time_end*1000) )+ '</div>'
    );
};

TimeSlider.prototype.clickSlider = function (timeF) {
	//export funcs
};

//отрисовка наличия видео
TimeSlider.prototype.renderEvents = function (arr_events_video, class_name) {
	var html = '';
	for (var i=0; i<arr_events_video.length; i++) {
		var range = arr_events_video[i],
            time1 = range[0],
			time2 = range[1];

        //событие полностью слева или справа от диапазона
        if (time1 < this.time_begin && time2 < this.time_begin) continue;
        if (time1 > this.time_end && time2 > this.time_end) continue;
        //событие частично внутри диапазона
        if (time1 < this.time_begin) time1 = this.time_begin;
        if (time2 > this.time_end) time2 = this.time_end;

        var all = this.time_end - this.time_begin,
			time = time2 - time1,
			width = 100 * time / all,
			left = 100 * (time1 - this.time_begin) / all;

        width = width.toFixed(3) + '%';
        left = left.toFixed(3) + '%';
        html += '<div class="events-video ' + class_name + '" style="width: ' + width + '; left: ' + left + ';"></div>';
	}
    this.$slider.find('.' + class_name).remove();
	this.$slider.append(html);
};

//переключение режима
TimeSlider.prototype.setMode = function (fcn_getParamRange) {
	var d = frmt.splitDate(
            dt.timestamp2date( this.time_marker*1000)
        ),
		res = fcn_getParamRange( d );
    this.setRange(res.time_begin, res.time_end);
    this.renderLines(res.range, res.skip);
    this.setMarker(this.time_marker);
};

//установка значений границ слайдера
TimeSlider.prototype.setRange = function (time_begin, time_end) {
    this.time_begin = time_begin;
    this.time_end = time_end;
    this.$slider.slider('option', {min: time_begin, max: time_end});
};

//установить диапазон - день (кнопка)
TimeSlider.prototype.setRangeDay = function () {
    this.setMode(this.setRangeDayFunc);
};

//установить диапазон - час (кнопка)
TimeSlider.prototype.setRangeHour = function () {
    this.setMode(this.setRangeHourFunc);
};

//установить диапазон - Минута (кнопка)
TimeSlider.prototype.setRangeMin = function () {
    this.setMode(this.setRangeMinFunc);
};



TimeSlider.prototype.setRangeDayFunc = function (d) {
    return {
        time_begin: dt.date2timestamp(d.yy, d.mm, d.dd, '00', '00', '00')/1000,
        time_end: dt.date2timestamp(d.yy, d.mm, 1+parseInt(d.dd),'00', '00', '00')/1000,
        range: 24,
        skip: 0
    }
};

TimeSlider.prototype.setRangeHourFunc = function (d) {
    var h1 = parseInt(d.hrs),
        h2 = (d.hrs === 23) ? 0 : (1+h1),
        d1 = d.dd,
        d2 = (d.hrs === 23) ? (1+parseInt(d.dd)) : d.dd;
    return {
        time_begin: dt.date2timestamp(d.yy, d.mm, d1, h1, '00', '00')/1000,
        time_end: dt.date2timestamp(d.yy, d.mm, d2, h2, '00', '00')/1000,
        range: 60,
        skip: 5
    }
};

TimeSlider.prototype.setRangeMinFunc = function (d) {
    var m1 = parseInt(d.min),
        m2 = (d.min === 59) ? 0 : (1+m1),
        h1 = parseInt(d.hrs),
        h2 = (d.hrs === 23 || d.min === 59) ? 0 : h1,
        d1 = d.dd,
        d2 = (d.hrs === 23 || d.min === 59) ? (1+d1) : d1;
    return {
        time_begin: dt.date2timestamp(d.yy, d.mm, d1, h1, m1, '00')/1000,
        time_end: dt.date2timestamp(d.yy, d.mm, d2, h2, m2, '00')/1000,
        range: 60,
        skip: 2
    }
};

//предыдущий дипазаон
TimeSlider.prototype.prevRange = function () {
    var time_all = this.time_end - this.time_begin;
    this.time_begin -= time_all;
    this.time_end -= time_all;
    this.setRange(this.time_begin, this.time_end);
    this.renderLines(this.range, this.skip);
    this.setMarker(this.time_marker);
    //this.renderEvents([]); TODO
};

//следующий дипазаон
TimeSlider.prototype.nextRange = function () {
    var time_all = this.time_end - this.time_begin;
    this.time_begin += time_all;
    this.time_end += time_all;
    this.setRange(this.time_begin, this.time_end);
    this.renderLines(this.range, this.skip);
    this.setMarker(this.time_marker);
    //this.renderEvents([]); TODO
};

/* funcs */

TimeSlider.prototype.frmtDatetime = function (dt, no_sec) {
	function zeroPad(num, places) {
	  var zero = places - num.toString().length + 1;
	  return Array(+(zero > 0 && zero)).join("0") + num;
	}
	var hrs = zeroPad(dt.getHours(), 2),
		min = zeroPad(dt.getMinutes(), 2),
	    sec = (no_sec !== undefined && !no_sec) ? '' : ':' + zeroPad(dt.getSeconds(), 2);
	return hrs + ':' + min + sec;
};

TimeSlider.prototype.format_date = function (d) {
	var my_d = {};
	my_d.dd = d.getDate(); if (my_d.dd < 10) my_d.dd = '0'+my_d.dd;
	my_d.mm = (d.getMonth()+1); if (my_d.mm < 10) my_d.mm = '0'+my_d.mm;
	my_d.hrs = d.getHours(); if (my_d.hrs < 10) my_d.hrs = '0'+my_d.hrs;
	my_d.min = d.getMinutes(); if (my_d.min < 10) my_d.min = '0'+my_d.min;
	my_d.sec = d.getSeconds(); if (my_d.sec < 10) my_d.sec = '0'+my_d.sec;
	my_d.yy = d.getFullYear();
	return my_d;
};
