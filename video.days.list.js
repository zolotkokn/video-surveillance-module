/*
 *  Список видео файлов
 */
function Video2DaysList ($parent) {
    //TODO удаление в кеш дни больше текущей даты на N дней

    this.$parent = $parent;
    this.data = this.loadLocalStorage();
}

// полный список дней наличия видео
Video2DaysList.prototype.load = function (cam, startTime, endTime) {
    var d = $.Deferred(),
        url = '/archive/getvideodayslistformatted?startTime='+startTime+'&endTime='+endTime+'&camera_id='+cam;
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
Video2DaysList.prototype.get = function (cam, startTime, endTime) {
    //если камера не выбрана, то возвращаем пустой массив
    if (cam === 0) {
        this.dispatchEvent([]);
        return false;
    }

    var self = this,
        result = [],
        time = dt.yymmddhhmmss2timeobj(startTime),
        yy = time.yy,
        mm = time.mm,
        yymm = '' + yy + mm,

        curr_time = frmt.splitDate(new Date()),
        curr_mm = curr_time.mm,
        curr_yy = curr_time.yy;

    //проверка что месяц закончился, прежде чем брать его из кеш, т.к. новые дни месяца не обновляются в кеш

    var is_curr_period = Number(mm) === Number(curr_mm) && Number(yy) === Number(curr_yy);
    if (!is_curr_period) {
        //если есть в кеше, то берем от туда
        result = this.getDataCam(cam, yymm);
        if (result) {
            self.dispatchEvent(result);
            return false;
        }
    }


    //если нет в кеше, то делаем запрос
    //повторно берем из кеша
    $.when(
        self.load(cam, startTime, endTime)
    ).done(function(data){
        self.processData(data, yymm);
        result = self.getDataCam(cam, yymm);
        self.dispatchEvent(result);
        self.saveLocalStorage();
    });
};

Video2DaysList.prototype.getDataCam = function (cam, yymm) {
    var arr = this.data[cam],
        is_have = false;
    if (arr !== undefined) {
        arr = arr[yymm];
        if (arr !== undefined) is_have = true;
    }
    return (is_have) ? arr : false;
};

//пост-обработка
Video2DaysList.prototype.processData = function (data, yymm) {
    var arr = this.data;
    if (data.length === 0) return false;
    for (var cam in data) {
        if (data.hasOwnProperty(cam)) {
            if (!(cam in arr)) {
                arr[cam] = {};
            }
            var arr_cam = arr[cam];
            if (!(yymm in arr_cam)) {
                arr_cam[yymm] = [];
            }
            arr_cam[yymm] = [];//
            for (var dateF in data[cam]) {
                if (data[cam].hasOwnProperty(dateF)) {
                    var d = data[cam][dateF].toString(),
                        day = d.substr(6,2);
                        arr_cam[yymm].push(day);
                }
            }
        }
    }
};

//отправка события о загрузке данных с сервера
Video2DaysList.prototype.dispatchEvent = function (days_cam) {
    var event = new Event('Video.Days.Load');
    event.data = {
        days: days_cam
    };
    this.$parent[0].dispatchEvent(event);
};

//загрузить из LocalStorage
Video2DaysList.prototype.loadLocalStorage = function () {
    //TODO обязательно убрать, т.к. это убивает кеширование
    localStorage.removeItem('video_day_list');
    var ls_video_days = localStorage.getItem('video_day_list'),
        result = [];
    if (ls_video_days !== null) {
        result = JSON.parse(ls_video_days);
    }
    return result;
};

//сохранить из LocalStorage
Video2DaysList.prototype.saveLocalStorage = function () {
    localStorage.setItem('video_day_list', JSON.stringify(this.data));
};
