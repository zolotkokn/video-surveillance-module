

AppVideoV2.prototype.handelBtnScreenDebarkaderIn = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var self = e.data.self;
    $.when(
        self.getDebarkaderScreen('in')
    ).done(function(){
        $('.btn-screen-debarkader-in').attr('disabled', 'disabled');
        $('.btn-screen-debarkader-out').removeAttr('disabled');
    });
};

AppVideoV2.prototype.handelBtnScreenDebarkaderOut = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var self = e.data.self;
    $.when(
        self.getDebarkaderScreen('out')
    ).done(function(){
        $('.btn-screen-debarkader-out').attr('disabled', 'disabled');
        $('.btn-screen-debarkader-in').removeAttr('disabled');
    });
};

AppVideoV2.prototype.getDebarkaderScreen = function (key) {
    var player = this.getActiveArhPlayer();
    if (!player) {
        fcn.renderError('не выбрана активная архивная камера');
        return false;
    }
    var d = $.Deferred(),
        timeF = this.timeline.time_slider.getMarkerF(),
        cam = player.camera_id,
        url = '/auto/saveEventFromVideo?camera_id='+cam+'&time='+timeF+'&key='+key;
    $.ajax({
        url: url
    }).done(function(p){
        fcn.renderInfo('Скрин сохранен: кам-' + cam + ', ' + timeF + ' ' + key);
        d.resolve(p);
    }).fail( function(err) {
        d.reject( 'ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url );
        fcn.renderError('ERR_QUERY ' + fcn.queryTextStatus(err['status']) + ' ' + url);
    });
    return d.promise();
};
