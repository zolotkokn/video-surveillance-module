
function VideoRegion () {
    this.$parent = '';
    this.points = [];
    this.scale = [];
    this.offset_x = 0;
    this.offset_y = 0;
}

VideoRegion.prototype.init = function ($parent, points, scale) {
    this.$parent = $parent;
    this.points = points;
    this.scale = scale;
    this.calc2();
};

VideoRegion.prototype.calc2 = function() {
    var wo = this.scale[0],
        ho = this.scale[1],
        wc = this.$parent.width(),
        hc = this.$parent.height(),
        ko = wo / ho,
        kc = wc / hc,
        offset_x = 0,
        offset_y = 0,
        kp = 0,
        wo_n = 0,
        ho_n = 0;

    if (kc > ko) {
        ho_n = hc;
        wo_n = ho_n * ko;
        kp =  wo / wo_n;
        offset_x = parseInt((wc - wo_n)/2);
    }
    else {
        wo_n = wc;
        ho_n = wo_n / ko;
        kp =  ho / ho_n;
        offset_y = parseInt((hc - ho_n)/2);
    }


    this.offset_left = offset_x;
    this.offset_top = offset_y;

    var html_blocks = '';
    var x1 = Number(this.points[0]),
        y1 = Number(this.points[1]),
        x2 = Number(this.points[2]),
        y2 = Number(this.points[3]),
        wb = x2 - x1,
        hb = y2 - y1;

    var x = Math.ceil(x1/kp + offset_x),
        y = Math.ceil(y1/kp + offset_y),
        w = Math.ceil(wb/kp),
        h = Math.ceil(hb/kp);
    html_blocks +=
        '<div class="region-block" style="width: '+w+'px; height: '+h+'px; left: '+x+'px; top: '+y+'px;"></div>';


    this.$parent.find('.region-block').remove();
    this.$parent.html(html_blocks);
};

VideoRegion.prototype.calc = function() {
    var wo = this.scale[0],
        ho = this.scale[1],
        wc = this.$parent.width(),
        hc = this.$parent.height(),
        ko = wo / ho,
        kc = wc / hc,
        offset_x = 0,
        offset_y = 0,
        kp = 0,
        wo_n = 0,
        ho_n = 0;

    if (kc > ko) {
        ho_n = hc;
        wo_n = ho_n * ko;
        kp =  wo / wo_n;
        offset_x = parseInt((wc - wo_n)/2);
    }
    else {
        wo_n = wc;
        ho_n = wo_n / ko;
        kp =  ho / ho_n;
        offset_y = parseInt((hc - ho_n)/2);
    }


    this.offset_left = offset_x;
    this.offset_top = offset_y;

    this.draw_points = [];
    for (var k=0; k < this.points.length; k++) {
        var p = this.points[k],
            dp = [];
        for (var i=0; i < p.length-1; i++) {
            dp.push({ x1: p[i][0], y1: p[i][1], x2: p[i+1][0], y2: p[i+1][1] });
        }
        if (p.length > 1) {
            dp.push({x1: p[p.length-1][0], y1: p[p.length-1][1], x2: p[0][0], y2: p[0][1]});
        }
        this.draw_points.push(dp);
    }

    for (k=0; k < this.draw_points.length; k++) {
        dp = this.draw_points[k];
        for (i = 0; i < dp.length; i++) {
            dp[i].new_x1 = dp[i].x1 / kp + offset_x;
            dp[i].new_y1 = dp[i].y1 / kp + offset_y;
            dp[i].new_x2 = dp[i].x2 / kp + offset_x;
            dp[i].new_y2 = dp[i].y2 / kp + offset_y;
        }
    }
    this.render();
};

VideoRegion.prototype.render = function() {
    this.$parent.find('.region-block').remove();
    this.$parent.append(
        '<div class="region-block" style="position: absolute; left: '+this.offset_x+'px; top: '+this.offset_y+'px;"></div>'
    );
    var p = this.draw_points;
    for (var i=0; i<p.length; i++) {
        this.$parent.find('.block-region').append(this.createLine(
            p[i].new_x1, p[i].new_y1,
            p[i].new_x2, p[i].new_y2
        ));
    }
};

VideoRegion.prototype.createLine = function (x1, y1, x2, y2) {
    var a = x1 - x2,
        b = y1 - y2,
        c = Math.sqrt(a * a + b * b);
    var sx = (x1 + x2) / 2,
        sy = (y1 + y2) / 2;
    var x = sx - c / 2,
        y = sy;
    var alpha = Math.PI - Math.atan2(-b, a);
    return this.createLineElement(x, y, c, alpha);
};

VideoRegion.prototype.createLineElement = function (x, y, length, angle) {
    var line = document.createElement("div");
    var styles = 'border: 1px solid #FF8000; '
        + 'width: ' + length + 'px; '
        + 'height: 0px; '
        + '-moz-transform: rotate(' + angle + 'rad); '
        + '-webkit-transform: rotate(' + angle + 'rad); '
        + '-o-transform: rotate(' + angle + 'rad); '
        + '-ms-transform: rotate(' + angle + 'rad); '
        + 'position: absolute; '
        + 'top: ' + y + 'px; '
        + 'left: ' + x + 'px; ';
    line.setAttribute('style', styles);
    return line;
};

