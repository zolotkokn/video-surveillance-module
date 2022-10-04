

AppVideoV2.prototype.handelBtnCounterIn = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var self = e.data.self;
    self.getCounterProcess('in')
};

AppVideoV2.prototype.handelBtnCounterOut = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var self = e.data.self;
    self.getCounterProcess('out')
};

AppVideoV2.prototype.handelBtnCounterInside = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var self = e.data.self;
    self.getCounterProcess('inside')
};

AppVideoV2.prototype.getCounterProcess = function (key) {
    var player = this.getActiveArhPlayer();
    if (!player) {
        fcn.renderError('не выбрана активная архивная камера');
        return false;
    }
    if (this._counterData === undefined) {
        this._counterData = {
            in: [],
            out: [],
            inside: []
        };
    }

    var hrs = dt.yymmddhhmmss2timeobj(this.timeline.time_slider.getMarkerF()).hrs;
    var arr = (key === 'in')
        ? this._counterData.in
        : (key === 'out')
            ? this._counterData.out
            : this._counterData.inside;

    var el = fcn.findArrData(arr, 'hrs', hrs);
    if (el) {
        el.count += 1;
    }
    else {
        arr.push({
            hrs: hrs,
            count: 1
        });
    }
};

AppVideoV2.prototype.handelBtnCounterRep = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var self = e.data.self;
    if (self._counterData === undefined) {
        fcn.renderError('разметки еще не было');
        return false;
    }

    self._counterData.in.sort(function (a,b) {
        return Number(a.hrs) - Number(b.hrs);
    });

    self._counterData.out.sort(function (a,b) {
        return Number(a.hrs) - Number(b.hrs);
    });

    self._counterData.inside.sort(function (a,b) {
        return Number(a.hrs) - Number(b.hrs);
    });

    var str_in = 'Вход:\n';
    self._counterData.in.map(function (item) {
        str_in += '' +item.hrs + 'ч = ' + item.count + '\n';
    });

    var str_out = '\nВыход:\n';
    self._counterData.out.map(function (item) {
        str_out += '' +item.hrs + 'ч = ' + item.count + '\n';
    });

    var str_inside = '\nВнутри:\n';
    self._counterData.inside.map(function (item) {
        str_inside += '' +item.hrs + 'ч = ' + item.count + '\n';
    });

    alert(str_in + str_out + str_inside);
};