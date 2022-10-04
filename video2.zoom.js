/**
 * Created by Kirill on 17.07.2018.
 */

function Video2Zoom (object) {

    this.selected_arhive = null;
    this.selected_online = null;
    this.x_pos = 0; this.y_pos = 0;
    this.x_elem = 0; this.y_elem = 0;
    this.x_click = 0; this.y_click = 0;

    object.$container.on('mousedown', {self: this, object: object}, this.mousedown);
    object.$container.on('mousemove', {self: this, object: object}, this.mousemove);
    object.$container.on('mouseup', {self: this}, this.mouseup);
}

Video2Zoom.prototype.mousedown = function (e) {
    var self = e.data.self,
        object = e.data.object;
    self.selected_arhive = object.$arhive;
    self.selected_online = object.$online[0];
    self.x_click = e.clientX;
    self.y_click = e.clientY;
    self.x_elem = self.selected_arhive[0].offsetLeft;
    self.y_elem = self.selected_arhive[0].offsetTop;
    return false;
};

Video2Zoom.prototype.mousemove = function (e) {
    var self = e.data.self;
    if (self.selected_arhive !== null) {
        var sel = self.selected_arhive[0];

        self.x_pos = e.clientX;
        self.y_pos = e.clientY;

        var sx_map = (sel.offsetWidth - $(this).innerWidth()),
            sy_map = (sel.offsetHeight - $(this).innerHeight());
        var left = self.x_elem + (self.x_pos - self.x_click),
            top = self.y_elem + (self.y_pos - self.y_click);

        if (left >= 0) left = 0;
        if (top >= 0) top = 0;
        if (left < 0 && left <= -sx_map) left = -sx_map;
        if (top < 0 && top <= -sy_map) top = -sy_map;

        sel.style.left = Math.ceil(left) + 'px';
        sel.style.top = Math.ceil(top) + 'px';

        self.selected_online.style.left = Math.ceil(left) + 'px';
        self.selected_online.style.top = Math.ceil(top) + 'px';
    }
};

Video2Zoom.prototype.mouseup = function (e) {
    var self = e.data.self;
    self.selected_arhive = null;
    self.selected_online = null;
};
