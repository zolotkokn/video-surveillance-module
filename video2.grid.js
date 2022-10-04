/*
 *  управление сеткой в видео v2
 */
function Video2Grids (parent) {
    this.parent = parent || '.video-windows';
    this.$parent = $(this.parent);
    this.grids = [
        { tmpl: 'tmpl-video2-grid-1', title: '1-кам', img: 'videogrid1.png', count: 1},
        { tmpl: 'tmpl-video2-grid-2', title: '4-кам', img: 'videogrid2.png', count: 4},
        { tmpl: 'tmpl-video2-grid-4', title: '4-кам', img: 'videogrid4.png', count: 4},
        { tmpl: 'tmpl-video2-grid-3', title: '6-кам', img: 'videogrid3.png', count: 6},
        //{ tmpl: 'tmpl-video2-grid-5', title: '6-кам', img: 'videogrid5.png', count: 6},
        { tmpl: 'tmpl-video2-grid-6', title: '9-кам', img: 'videogrid6.png', count: 9},
        //{ tmpl: 'tmpl-video2-grid-7', title: '9-кам', img: 'videogrid7.png', count: 9},
        { tmpl: 'tmpl-video2-grid-8', title: '12-кам', img: 'videogrid8.png', count: 12},
        { tmpl: 'tmpl-video2-grid-9', title: '16-кам', img: 'videogrid9.png', count: 16},
        { tmpl: 'tmpl-video2-grid-10', title: '24-кам', img: 'videogrid9.png', count: 24}
        //{ tmpl: 'tmpl-video2-grid-11', title: '30-кам', img: 'videogrid9.png', count: 30}
    ];
    this.panel_grids = null;
    this.grid = null;
    this.init();
}

Video2Grids.prototype.init = function () {
    this.panel_grids = new MoveoutPanel(this.parent, 'panel-list-grids', 'top');
    this.panel_grids.setContent(
        fcn.getTmpl('#tmpl-video2-panel-grids', {grids: this.grids})
    );
    this.$parent.on('click', '.grid', {self: this}, this.clickBtnGrid);
};

//клик по сетке генерит событие 'Grid.Click' c параметром
Video2Grids.prototype.clickBtnGrid = function (e) {
    var el = $(this),
        self = e.data.self;
    self.grid = self.find(el.data('grid-tmpl'));
    fcn.dispatchEvent('Grid.Click', {
        tmpl: el.data('grid-tmpl'),
        count: el.data('grid-count')
    }, self.$parent[0]);
};

//возвращает массив сеток
Video2Grids.prototype.grids = function () {
    return this.grids;
};

//возвращает текущую сетку
Video2Grids.prototype.grid = function () {
    return this.grid;
};

//возвращает первую сетку в списке
Video2Grids.prototype.first = function () {
    this.grid = this.grids[0];
    return {
        tmpl: this.grids[0]['tmpl'],
        count: this.grids[0]['count']
    }
};

//поиск сетки по названию шаблона
Video2Grids.prototype.find = function (tmpl_name) {
    var result = false;
    for (var i=0; i< this.grids.length; i++) {
        if (this.grids[i]['tmpl'] === tmpl_name) {
            result = this.grids[i];
            break;
        }
    }
    return result;
};

//загрузить из LocalStorage
Video2Grids.prototype.loadLocalStorage = function () {
    var ls_tmpl = localStorage.getItem('videoall_tmpl'),
        result = this.first();
    if (ls_tmpl == undefined) {
        this.saveLocalStorage(result.tmpl);
    }
    else {
        var ls_grid = this.find( ls_tmpl );
        if (ls_grid) {
            result = {
                tmpl: ls_grid['tmpl'],
                count: ls_grid['count']
            }
        }
    }
    this.grid = result;
    return result;
};

//сохранить из LocalStorage
Video2Grids.prototype.saveLocalStorage = function (tmpl_name) {
    localStorage.setItem('videoall_tmpl', tmpl_name);
};

