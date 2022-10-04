
//клик по таймлайну для КЕШ продукта
AppVideoV2.prototype.getChecks = function(cam_id, timeF) {
    var self = this;

    self.timeUpdate = 0;
    self.arhiveChecks = [];
    self.players.forEach(function (player) {
        if (player.camera_id > 0 && !player.is_online) {
            player.$info.find('.info-panel').empty();
            player.check = null;
            player.isViewCheck = false;
            self.loadCheck(player, timeF);
        }
    });
};

// апи получить чек
AppVideoV2.prototype.loadCheck = function(player, timeF) {
    var self = this,
        registers = (new Reference())['data']['cameras']['pk' + player.camera_id]['registers'],
        register_id = registers && registers.length ? registers[0]['pk'] : 0;

    if (register_id === 0) {
        return false;
    }
    $.when(
        self.apiLoadDocumentId(register_id, timeF)
    ).then(function(document_id){
        if (document_id.DocumentID) {
            $.when(
                self.apiLoadArhiveCheck(document_id.DocumentID, register_id, timeF)
            ).then(function (data) {
                player.check = data['events'] || [];
                player.check.reverse();
            });
        }
    });
};

//отрисовка чека
AppVideoV2.prototype.renderCheck = function(player) {
    var html = '',
        checks = player.check,
        arrNoEventId = ['2025', '6010', '6011', '6012', '6013', '6014', '6015', '6016', '6017', '6018', '6020', '6021', '6033', '3000', '5000', '6034', '9002'],
        $blockCheck = player.$info.find('.info-panel');

    for (var i=0; i<checks.length ; i++) {
        var rec = checks[i],
            cashEventID = rec['cashEventID'];
        if (arrNoEventId.indexOf(cashEventID) > -1) continue;

        html +=
            '<tr class="video2-rec-check" data-rec="'+rec['idrec']+'">'+
                '<td width="50px">'+ dt.yymmddhhmmss2time('hrs:min:sec', rec['timeF']) +'</td>'+
                '<td width="50%">'+this.setCashEventDescription(cashEventID, rec['item_name'], rec)+'</td>'+
                '<td width="100px" align="right">'+frmt.formatSumm( rec['item_unit_price'] )+'&nbsp;x&nbsp;'+rec['quantity']+'</td>'+
                '<td width="7px" align="right">=</td>'+
                '<td width="70px" align="right">'+frmt.formatSumm( rec['quantity'] * rec['item_unit_price'] )+'</td>'+
            '</tr>';
    }

    $blockCheck.empty().html(
        '<table class="tbl">' + html + '</table>'
    );

    var cnt = this.video_grids.grid.count;
    if (cnt >= 9) {
        $blockCheck.find('.tbl').css({fontSize: '8px'});
    }
    else if (cnt >= 4) {
        $blockCheck.find('.tbl').css({fontSize: '10px'});
    }

    $('.video2-rec-check').click(function (e) {
        e.preventDefault();
    });
};

//описание названий кассовых событий по их коду
AppVideoV2.prototype.setCashEventDescription = function(cashEventID, item_name, rec) {
    var register = rec['register_id'],
        cashier = rec['cashier_name'];
    switch (cashEventID) {
        case 1001: return 'Касса: '+register+'<br/>Кассир: '+cashier+'<br/>Авторизация пользователя';
        case 1003: return 'Касса: '+register+'<br/>Кассир: '+cashier+'<br/>Разрегистрация пользователя';
        case 1007: return 'Касса: '+register+'<br/>Кассир: '+cashier+'<br/>Закрытие смены';
        case 3001: return 'Касса: '+register+'<br/>Кассир: '+cashier+'<br/>Изъятие денег из кассы (инкассация)';
        case 3002: return 'Касса: '+register+'<br/>Кассир: '+cashier+'<br/>Внесение денег в кассу';
        case 2000: return 'Касса: '+register+'<br/>Кассир: '+cashier;
        case 2001: return 'конец документа';
        case 2002: return frmt.addSlashes(frmt.strReplace(item_name));
        case 2006: return 'удаление товара';
        case 2012: return 'скидка на товар';
        case 2027: return 'скидка на чек';
        case 2018: return 'предварит.итог';
        case 2022: return 'итог';
        case 2003: return 'Изменение количества товара';
        case 2009: return 'Изменение цены товара в документе';
        case 2015: return 'Аннулирование документа';
        case 2031: return 'Сдача';
        case 2024: return 'оплата';
        case 6019: return 'Инф:'+frmt.addSlashes(frmt.strReplace(item_name));
        case 6025: return 'Применение скидки, округ.копеек';
        //case 9002: return 'что-то неизвестное';
        default:   return '';
    }
};

AppVideoV2.prototype.updateCheckOfTime = function(e) {
    var self = this,
        timeF = e.data.timeF,
        player_id = e.data.player_id,
        time = parseInt(dt.yymmddhhmmss2timestampUTC(timeF)/1000);

    if (self.timeUpdate === time) {
        return false;
    }
    self.timeUpdate =  time;

    self.players.forEach(function (player) {
        var $blockCheck = player.$info.find('.info-panel');
        if (player.camera_id > 0 && !player.is_online && player.check && player.check.length) {
            if (!player.isViewCheck) {
                var firstTimeCheck = player.check[0].time/1000;
                if (firstTimeCheck <= time) {
                    player.isViewCheck = true;
                    self.renderCheck(player);
                }
            }
            else {
                var lastTimeCheck = player.check[player.check.length-1].time/1000;
                if (lastTimeCheck <= time) {
                    $blockCheck.empty();
                    self.getChecks(player.camera_id, timeF);
                }
                //подстветка
                var $recs = $blockCheck.find('.video2-rec-check');
                player.check.map(function (rec) {
                    if (rec.time/1000 === time && player.rec_active_time !== time) {
                        player.rec_active_time = time;
                        $recs.removeClass('detail-video-active');
                        $blockCheck.find('.video2-rec-check[data-rec=' + rec.idrec + ']').addClass('detail-video-active');
                    }
                });
            }
        }
    });
};

/*** api ***/

AppVideoV2.prototype.apiLoadDocumentId = function(register_id, timeF) {
    var endTimeF = dt.yymmddhhmmss2time('yymmdd235959', timeF),
        d = $.Deferred(),
        url =
            '/cash/getrreceiptidbytime?' +
            '&startTimeF=' + timeF +
            '&endTimeF=' + endTimeF +
            '&register_id=' + register_id;
    $.ajax({
        url:  url
    }).done(function(p){
        d.resolve(p);
    }).fail( function() {
        d.reject();
    });
    return d.promise();
};

AppVideoV2.prototype.apiLoadArhiveCheck = function(document_id, register_id, timeF) {
    var d = $.Deferred(),
        OFFSET_TIME = 3600,
        time = parseInt(dt.yymmddhhmmss2timestampUTC(timeF)/1000),
        startTime = time - OFFSET_TIME,
        endTime =  time + OFFSET_TIME,
        url =
        '/cash/getevents?' +
        '&document_id=' + document_id +
        '&register_id=' + register_id +
        '&startTime=' + startTime +
        '&endTime=' + endTime;
    $.ajax({
        url:  url
    }).done(function(p){
        d.resolve(p);
    }).fail( function() {
        d.reject();
    });
    return d.promise();
};
