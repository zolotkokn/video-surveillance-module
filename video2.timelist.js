/**
 * Created by Kirill on 23.12.2015.
 */
/*
 *  Список видео файлов
 */
function Video2TimeList () {
    this.video_list = [];
}

//получение списка видео файлов
Video2TimeList.prototype.getVideoTimeList = function (cam_id, startTimeF, endTimeF) {
    var self = this;
    $.ajax({
        url: '/archive/getvideotimelistformatted?camera_id='+cam_id+'&startTime='+startTimeF+'&endTime='+endTimeF,
        async: false,
        dataType : 'json',
        beforeSend: function() { $('#loader_indicator').show(); console.info('start getVideoTimeList'); },
        complete: function() {  $('#loader_indicator').hide(); console.info('end getVideoTimeList'); },
        success: function(data){
            this.video_list = [];

            if (data.length == 0){
                console.log("Видео не найдено для всех камер!");
            }
            else {

                //упаковываем нужную камеру
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        if (key == cam_id) {
                            self.video_list[key] = []; //new Array();
                            if (data[key].length > 0) {
                                for (var i = 0, cnt = data[key].length; i < cnt; i++) {
                                    //console.log(data[key][i]);
                                    self.video_list[key].push(
                                        yymmddhhmmss2timestamp(data[key][i].toString())
                                    );
                                }
                            }
                            console.warn("end key: " + key);
                        }
                    }
                }

            }
        },
        error: function(e1,e2,e3){
            console.log("Ошибка при загрузке списка видеофайлов: " + e3);
        }
    });
};

//выбрать файлы по диапазону шкалы
Video2TimeList.prototype.getVideoTimeline = function ( camera_id , time_start, time_end ) {
    var i,
        videoTimeline = [];
    if (this.video_list.length === 0) return videoTimeline;

    for (i=0; i<this.video_list[camera_id].length; i++){
        if (time_start >= (this.video_list[camera_id][i]+this.video_length) || (this.video_list[camera_id][i]) <= time_end){
            videoTimeline.push(
                [ this.video_list[camera_id][i], this.video_list[camera_id][i]+this.video_length ]
            );
        }
    }

    if (videoTimeline.length > 1) {
        for (i=0; i<videoTimeline.length-1; i++){
            if (videoTimeline[i][1] === videoTimeline[i+1][0]) {
                videoTimeline[i+1][0] = videoTimeline[i][1];
                videoTimeline[i][3] = false;
            }
        }
        i = 0;
        while (i < videoTimeline.length-1) {
            if (videoTimeline[i][1] === videoTimeline[i+1][0]) {
                videoTimeline[i+1][0] = videoTimeline[i][0];
                videoTimeline.splice(i,1);
            }
            else
                i++;
        }
    }
    else {
        //TODO если один или нет элементов
    }

    return videoTimeline;
};
