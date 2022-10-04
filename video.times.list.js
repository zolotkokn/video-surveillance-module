/*
 *  Список видео файлов
 */
function Video2TimesList ($parent) {
    this.$parent = $parent;
    this.list_title = 'TimeList';
    this.event_title = 'Video.Times.Load';
    this.url = '/archive/getvideoperiodlist';
    this.data = this.loadLocalStorage();
}

// полный список дней наличия видео
Video2TimesList.prototype.load = function (startTime, endTime, cam_id, stream) {
    var self = this,
        d = $.Deferred(),
        url = this.url + '?&startTime='+startTime+'&endTime='+endTime+'&stream='+stream+'&camera_ids=[' + cam_id+']';
    $.ajax({
        url: url
    }).done(function(p){
        d.resolve(p);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
    });
    return d.promise();
};

//список дней наличия видео за период
Video2TimesList.prototype.get = function (cam, quality, startTime, endTime) {
    var stream = (quality === 'high') ? 0 : 1;
    //если камера не выбрана, то возвращаем пустой массив
    if (cam === 0) {
        this.dispatchEvent([]);
        return false;
    }

    //TODO проверка что день закончился, прежде чем брать его из кеш, т.к. новые данные дня не обновляются в кеш

    var self = this,
        result = [],
        time = dt.yymmddhhmmss2timeobj(startTime),
        yymmdd = '' + time.yy + time.mm + time.dd,

        curr_time = frmt.splitDate(new Date()),
        curr_yymmdd = '' + curr_time.yy + curr_time.mm + curr_time.dd;

    //если есть в кеше, то берем от туда
    var is_curr_period = curr_yymmdd === yymmdd;
    if (!is_curr_period) {
        result = this.getDataCam(cam, stream, yymmdd);
        if (result) {
            self.dispatchEvent(result);
            return false;
        }
    }

    //если нет в кеше, то делаем запрос
    //повторно берем из кеша
    $.when(
        self.load(startTime, endTime, cam, stream)
    ).done(function(data){
        self.processData(data, stream, yymmdd);
        result = self.getDataCam(cam, stream, yymmdd);
        self.dispatchEvent(result);
        self.saveLocalStorage();
    });
};

//возвращает массив наличия видео за день в указаном качестве
Video2TimesList.prototype.getDataCam = function (cam, stream, yymmdd) {
    var arr = this.data[cam],
        is_have = false;
    if (arr !== undefined) {
        arr = arr[stream];
        if (arr !== undefined) {
            arr = arr[yymmdd];
            if (arr !== undefined) is_have = true;
        }
    }
    return (is_have) ? arr : false;
};

//пост-обработка
Video2TimesList.prototype.processData = function (data, stream, yymmdd) {
    var arr = this.data;
    if (data.length === 0) return false;
    for (var cam in data) {
        if (data.hasOwnProperty(cam)) {
            if (!(cam in arr)) {
                arr[cam] = {};
            }
            if (!(stream in arr[cam])) {
                arr[cam][stream] = {};
            }
            if (!(yymmdd in arr[cam][stream])) {
                arr[cam][stream][yymmdd] = [];
            }
            var arr_times_cam = arr[cam][stream][yymmdd];

            if (data[cam].length > 0) {
                this.convertVideoTime( arr_times_cam, data[cam] );
            }
        }
    }
};

//возвращает короткий массив времени видео
Video2TimesList.prototype.convertVideoTime = function (arr_times_cam, data_cam) {
    for (var i = 0, cnt = data_cam.length; i < cnt; i++) {
        var timestamp1 = Number(yymmddhhmmss2timestamp( data_cam[i][0].toString() ))/1000,
            timestamp2 = Number(yymmddhhmmss2timestamp( data_cam[i][1].toString() ))/1000;
        arr_times_cam.push(
            [ timestamp1, timestamp2 ]
        );
    }
};

//возвращает короткий массив времени видео
Video2TimesList.prototype.getShortVideoTime = function ( arr_time_date ) {
    var arr = arr_time_date,
        i = 0;
    if (arr.length > 1) {
        while (i < arr.length - 1) {
            if (arr[i + 1][0] - arr[i][1] < 3) {
                arr[i + 1][0] = arr[i][0];
                arr.splice(i, 1);
            }
            else
                i++;
        }
    }
};


//отправка события о загрузке данных с сервера
Video2TimesList.prototype.dispatchEvent = function (times_cam) {
    var event = new Event(this.event_title);
    event.data = {
        times: times_cam
    };
    this.$parent[0].dispatchEvent(event);
};

//загрузить из LocalStorage
Video2TimesList.prototype.loadLocalStorage = function () {
    //TODO удаление в кеш дни больше текущей даты на N дней
    //clear test LocalStorage
    localStorage.removeItem(this.list_title);
    var ls_video_times = localStorage.getItem(this.list_title),
        result = [];
    if (ls_video_times !== null) {
        result = JSON.parse(ls_video_times);
    }
    return result;
};

//сохранить из LocalStorage
Video2TimesList.prototype.saveLocalStorage = function () {
    localStorage.setItem(this.list_title, JSON.stringify(this.data));
};


/*
 *  наследуемый список "Наличия" видео на таймлайне (синий цвет)
 */

function Video2TimesListAvailability ($parent) {
    this.$parent = $parent;
    this.list_title = 'TimeListAvailability';
    this.event_title = 'Video.Times.Availability.Load';
    this.url = '/archive/getvideoperiodlist';
    this.data = this.loadLocalStorage();
}

fcn.inheritance(Video2TimesListAvailability, Video2TimesList);

/*
 *  наследуемый список "Без движения" видео на таймлайне (серо-синий цвет)
 */

function Video2TimesListNoMoved ($parent) {
    this.$parent = $parent;
    this.list_title = 'TimeListNoMoved';
    this.event_title = 'Video.Times.NoMoved.Load';
    this.url = '/archive/getvideoperiodlist';
    this.data = this.loadLocalStorage();
}

fcn.inheritance(Video2TimesListNoMoved, Video2TimesList);

// полный список дней наличия видео
Video2TimesListNoMoved.prototype.load = function (startTime, endTime, cam_id, stream) {
    var self = this,
        d = $.Deferred(),
        url = this.url + '?&startTime='+startTime+'&endTime='+endTime+'&stream='+stream+'&camera_ids=[' + cam_id+']';
    $.ajax({
        url: url
    }).done(function(p){
        d.resolve(p);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
    });
    return d.promise();
};
