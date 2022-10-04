
//клик по таймлайну для ENTERS продукта
AppVideoV2.prototype.getEntersData = function(cam_id, timeF) {
    var self = this;

    self.timeUpdate = 0;
    self.players.forEach(function (player) {
        if (player.camera_id > 0 && !player.is_online) {
            player.$info.find('.info-panel').find('.data').empty();
            player.enters = null;
            player.isViewEnters = false;
            self.loadEntersData(player, timeF);
        }
    });
};

// апи получить чек
AppVideoV2.prototype.loadEntersData = function(player, timeF) {
    var self = this;
    if (player.camera_id === 0) {
        return false;
    }

    if (!player.$entersGroups.length) {
        return false;
    }

    var object_id = player.$entersGroups.find('option:selected').val();

    $.when(
        self.apiLoadEntersData(player.camera_id, object_id, timeF)
    ).then(function(data){
        player.enters = {};

        if (data.results) {
            data.results.reverse().map(function (item) {
                var action = item.action === 'enter' ? '+' : '-';
                if (player.enters[item.time + action]) {
                    player.enters[item.time + action].count++;
                } else {
                    player.enters[item.time + action] = {
                        action: item.action,
                        count: 1
                    }
                }
            });
        }
    });
};

AppVideoV2.prototype.clickEntersRec = function (e) {
    var self = e.data.self,
        player = e.data.player,
        markerF = $(this).data('datetime').toString();

    self.setResetTimeline();
    self.getAllArhive(markerF);
};

//отрисовка чека
AppVideoV2.prototype.renderEnters = function(player) {
    var html = '',
        $blockEnter = player.$info.find('.info-panel').find('.data');

    $blockEnter.on('click', '.video2-rec-enters', {self: this, player: player}, this.clickEntersRec);

    for (var key in player.enters) {
        if (player.enters.hasOwnProperty(key)) {
            var isIn = player.enters[key].action === 'enter',
                classColor = isIn ? 'enter-color-in' : 'enter-color-out',
                text = isIn ? 'вход' : 'выход',
                count = player.enters[key].count > 1 ? ' (' + player.enters[key].count + ')' : '';

            html +=
                '<div class="video2-rec-enters ' + classColor + '" data-datetime="' + key.slice(0, -1) + '">' +
                    dt.yymmddhhmmss2time('hrs:min:sec', key.toString()) + ': ' + text + count +
                '</div>';
        }
    }

    $blockEnter.empty().html(html);
};

// функция обновления времени таймлайна
AppVideoV2.prototype.updateEntersOfTime = function(e) {
    var self = this,
        timeF = e.data.timeF;

    if (self.timeUpdate === timeF) {
        return false;
    }
    self.timeUpdate =  timeF;

    self.players.forEach(function (player) {
        var $blockEnters = player.$info.find('.info-panel');
        if (player.camera_id > 0 && !player.is_online && player.enters && Object.keys(player.enters).length) {
            if (!player.isViewEnters) {
                player.isViewEnters = true;
                self.renderEnters(player);
            }
            else {
                //подстветка
                var $recs = $blockEnters.find('.video2-rec-enters'),
                    $time = $blockEnters.find('#video2-enters-time'),
                    $countIn = $blockEnters.find('#video2-enters-all-in'),
                    $countOut = $blockEnters.find('#video2-enters-all-out'),
                    countIn = 0,
                    countOut = 0,
                    isCurr = false;

                for (var key in player.enters) {
                    var _key = key.slice(0, -1);
                    if (player.enters.hasOwnProperty(key)) {
                        if (!isCurr && _key > timeF) {
                            isCurr = true;
                        } else {
                            player.last_time = key;
                        }

                        if (!isCurr) {
                            player.enters[player.last_time].action === 'enter'
                                ? countIn += player.enters[key].count
                                : countOut += player.enters[key].count;
                        }

                        if (_key === timeF) {
                            $recs.removeClass('detail-video-active');
                            $blockEnters.find('.video2-rec-enters[data-datetime=' + timeF + ']').addClass('detail-video-active').get(0).scrollIntoView();
                        }
                    }
                }

                $time.text(dt.yymmddhhmmss2time('hrs:min:sec', timeF));
                if (isCurr || timeF > Object.keys(player.enters)[Object.keys(player.enters).length - 1]) {
                    $countIn.text(countIn);
                    $countOut.text(countOut);
                }
            }
        }
    });
};

/*** api ***/

AppVideoV2.prototype.apiLoadEntersData = function(camera_id, object_id, timeF) {
    var startTimeF = dt.yymmddhhmmss2time('yymmdd000000', timeF),
        endTimeF = dt.yymmddhhmmss2time('yymmdd235959', timeF),
        d = $.Deferred(),
        url =
            '/enters/get-enters-list?' +
            '&startTimeF=' + startTimeF +
            '&endTimeF=' + endTimeF +
            '&camera_id=' + camera_id +
            '&object_id=' + object_id;
    $.ajax({
        url:  url
    }).done(function(p){
        d.resolve(p);
    }).fail( function() {
        d.reject();
    });
    return d.promise();
};

AppVideoV2.prototype.apiLoadEntersGroups = function() {
    var d = $.Deferred(),
        url = '/counter/regiongroups';
    $.ajax({
        url:  url
    }).done(function(p){
        d.resolve(p);
    }).fail( function() {
        d.reject();
    });
    return d.promise();
};
