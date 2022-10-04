/*
 *   Панель с камерами
 *      data from:
 *          - Reference.cameras
 *      dispatchEvent:
 *          - Camera.Click
 *          - Camera.All.Click
 */
function VideoCameras (parent) {
    this.parent = parent || '.video-windows';
    this.$parent = $(this.parent);
    this.cameras = (new Reference()).data['cameras']['_data'].filter(function(cam){
        return cam['fields']['captureStream'] === true;
    });
    this.panel_cameras = null;
    this.init();
}

VideoCameras.prototype.init = function () {
    this.processCameras();
    this.panel_cameras = new MoveoutPanel(this.parent, 'panel-list-cameras', 'top');
    this.panel_cameras.setContent(
        fcn.getTmpl('#tmpl-video2-panel-cameras', {cameras: this.cameras})
    );
    this.$parent.on('click', '.camera', {self: this}, this.clickBtnCamera);
    this.$parent.on('click', '.btn-add-all-cameras', {self: this}, this.clickBtnAllCameras);
};

//пост обработка камер
VideoCameras.prototype.processCameras = function () {
    this.cameras.forEach(function(cam){
        var url = '/static/counter/' + cam['pk'] + '/thumbnail.jpg';
        cam.img = (!fcn.isHaveImageURL(url)) ? '/static/images/noimg.png' : url;
    });
};

//клик по камере генерит событие 'Camera.Click' c параметром
VideoCameras.prototype.clickBtnCamera = function (e) {
    var el = $(this),
        self = e.data.self;
    fcn.dispatchEvent('Camera.Click', {
        cam_id: el.data('id'),
        title: el.data('name')
    }, self.$parent[0]);
};

//клик по камере генерит событие 'Camera.All.Click' c параметром
VideoCameras.prototype.clickBtnAllCameras = function (e) {
    var self = e.data.self;
    fcn.dispatchEvent('Camera.All.Click', {
        cameras: self.cameras
    }, self.$parent[0]);
};


