
const urlParams = new URLSearchParams(window.location.search);
const access_token = urlParams.get('access_token');
const baseUrl = 'https://us-central1-silicon-keel-290919.cloudfunctions.net';

// ==================================================

function AppViewModel(beData) {
    const self = this;
    const LocalDate = JSJoda.LocalDate;
    const DateTimeFormatter = JSJoda.DateTimeFormatter;
    const monthsUk = ['Cіч.', 'Лют.', 'Бер.', 'Квіт.', 'Трав.', 'Черв.', 'Лип.', 'Серп.', 'Вер.', 'Жовт.', 'Лист.', 'Груд.'];
    const monthsNameUk = ['Cічень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

    this.context = {};

    this.calendarMode = ko.observable(true);
    this.monthReference = getMonths();
    this.months = ko.observableArray(this.monthReference);
    this.changeMode = function() {
        self.calendarMode(!self.calendarMode());
    }

    this.editMode = ko.observable(false);
    this.editType = ko.observable("");
    this.saveInProgress = ko.observable(false);

    Telegram.WebApp.onEvent('backButtonClicked', function () {
        if (self.editMode()) {
            self.closeEditHours();
        }
    });

    // ================================

    this.editHours = ko.observable(0);
    this.editorTaskName = ko.observable("");
    this.hasTaskName =  ko.observable(false);
    this.editorTaskDate = ko.observable("");
    this.trackHours = ko.observable("");
    this.openEditHours = function(context) {
        self.saveInProgress(false);
        self.scrollPosition = document.documentElement.scrollTop;
        self.editMode(true);
        self.editHours(context.hours);
        self.editorTaskName(context.subject);
        self.editorTaskDate(context.spent_on);
        self.trackHours("");
        self.editType('hours');
        $('#editHoursInput').focus();
        self.context = context;
    }
    this.closeEditHours = function() {
        self.saveInProgress(false);
        self.editMode(false);
        $('html,body').animate({scrollTop: self.scrollPosition}, 10);
        self.context = null;
    }
    this.updateTrackTime = function() {
        const context = self.context;
        self.saveInProgress(true);
        let trackHours = self.trackHours();
        trackHours = trackHours || trackHours === 0 ? trackHours : context.hours
        update({
            orderId: self.context.order_id,
            hours: trackHours,
            taskId: self.context.issue_id,
            date: self.context.spent_on,
            id: self.context.id
        }, function() {
            self.context = null;
            context.hours = trackHours;
            self.months(getMonths());
            self.closeEditHours();
        }, function() {
            self.saveInProgress(false);
        });
    }

    // ================================

    this.editorOrders = getBEData().data.orders;
    this.editorOrder = ko.observable("");
    this.openEditOrders = function(context) {
        self.context = context;
        self.saveInProgress(false);
        self.scrollPosition = document.documentElement.scrollTop;
        self.editMode(true);
        self.editType('orders');
        self.editorTaskName(context.subject);
        self.editorTaskDate(context.spent_on);
        self.editorOrder(context.order_id || getBEData().data.recommendedOrder[context.project_id])
        self.trackHours("");
        $('#order-select').formSelect();
    }
    this.closeEditOrders = function() {
        self.saveInProgress(false);
        self.editMode(false);
        $('html,body').animate({scrollTop: self.scrollPosition}, 10);
        self.context = null;
    }
    this.updateOrders = function() {
        console.log(self.editorOrder());
        const context = self.context;
        self.saveInProgress(true);
        update({
            orderId: self.editorOrder(),
            hours: self.context.hours,
            taskId: self.context.issue_id,
            date: self.context.spent_on,
            id: self.context.id
        }, function() {
            self.context = null;
            context.order_id = self.editorOrder()
            let order = getBEData().data.orders.find(it => it.id === context.order_id * 1);
            context.orderName = order.name;
            self.months(getMonths());
            self.closeEditHours();
        }, function() {
            self.saveInProgress(false);
        });
    }

    // ================================

    this.addTrackContext = {};
    this.editorTaskName = ko.observable("");
    this.invalid = ko.observable(true);
    self.addTaskEditorOrder = ko.observable("");
    this.openAddTimeTrack = function() {
        self.addTrackContext = {};
        self.saveInProgress(false);
        self.scrollPosition = document.documentElement.scrollTop;
        self.editType('add_track_time');
        self.trackHours("");
        self.saveInProgress(false);
        self.addTaskEditorOrder("");
        self.editorTaskName("");
        self.editMode(true);
        self.invalid(true);

        $('#add-time-track-order-select').formSelect();

        const elems = document.querySelectorAll('.datepicker');
        const instances = M.Datepicker.init(elems, {
            format: 'yyyy-mm-dd', firstDay: 1
        });

        if (self.editorTaskDate()) {
            const date = new Date(self.editorTaskDate());
            $('.datepicker').datepicker('setDate', date);
        } else {
            self.editorTaskDate(LocalDate.now().toString())
            const date = new Date(LocalDate.now().toString());
            $('.datepicker').datepicker('setDate', date);
        }
        initTasksSearch();
        $('#addTimeTaskInput').focus();

        self.trackHours.subscribe(function (hours) {
            self.addTrackContext.hours = hours;
            self.updateValidate();
        });
        self.editorTaskName.subscribe(function (taskName) {
            if (taskName) {
                self.hasTaskName(true);
            } else {
                self.hasTaskName(false);
            }
        });
    }

    this.closeAddTimeTrack = function() {
        self.saveInProgress(false);
        self.editMode(false);
        $('html,body').animate({scrollTop: self.scrollPosition}, 10);
    }
    this.addTimeTrack = function() {
        self.saveInProgress(true);
        update({
            orderId: self.addTaskEditorOrder(),
            hours: self.trackHours(),
            taskId: self.addTrackContext.data.taskId,
            date: self.editorTaskDate()
        }, function() {
            location.reload();
        }, function() {
            self.saveInProgress(false);
        });
    }
    this.setRecommendedOrder = function(orderId) {
        self.addTaskEditorOrder(orderId);
    }
    this.updateValidate = function() {
        if (self.addTrackContext.data && self.addTrackContext.data.issueId && self.addTrackContext.hours) {
            self.invalid(false);
        } else {
            self.invalid(true);
        }
    }
    this.cleanTaskInput = function () {
        self.addTrackContext.data = {};
        self.addTaskEditorOrder("");
        self.updateValidate();
        self.editorTaskName("")
    }

    function initTasksSearch() {
        $('#addTimeTaskInput').devbridgeAutocomplete({
            serviceUrl: baseUrl + '/tasks?access_token=' + access_token,
            onSelect: function (suggestion) {
                self.editorTaskName(suggestion.value);
                self.addTrackContext.data = suggestion.data;
                let projectId = suggestion.data.projectId;
                let recommendedOrder = getBEData().data.recommendedOrder[projectId];
                self.setRecommendedOrder(recommendedOrder);
                $('#add-time-track-order-select').formSelect();
                self.updateValidate();
            },
            onSearchStart: function(params) {
                self.addTrackContext.data = {};
                self.updateValidate();
            },
            noCache: true,
            minChars: 0
        });
    }


    // ================================

    this.moveToDay = function(incontext) {
        self.calendarMode(false);
        const context = incontext;
        setTimeout(function() {
            let date = context.date;
            self.editorTaskDate(date);
            let offset = $('#DAY_' + date).offset();
            while(!offset && date) {
                date = LocalDate.parse(date).minusDays(1).toString();
                offset = $('#DAY_' + date).offset();
                if (LocalDate.parse(date).isBefore(LocalDate.parse(context.date).minusMonths(2))) {
                    break;
                }
            }
            if (offset) {
                $('html,body').animate({scrollTop: offset.top}, 200);
            }
        }, 200);
    }

    function getTracks(now) {
        const month = now.month();
        const dataTracks = getBEData().data.tracks;
        const timeTracksByDay = getBEData().data.timeTracksByDay
        const days = Object.keys(dataTracks).sort();
        const tracks = [];
        for (let i = 0; i < days.length; i++) {
            let day = days[i];
            if (LocalDate.parse(day).month() === month) {
                tracks.push({
                    day: day,
                    tracks: dataTracks[day],
                    sum: (dataTracks[day] || []).reduce((a, b) => a * 1 + (b.hours || 0) * 1, 0)
                });
            }
        }
        return tracks;
    }

    function getMonths() {
        let now = LocalDate.now();
        let prevMonth = now.minusMonths(1);
        const beData = getBEData().data;
        const prevMonthTracks = getTracks(prevMonth);
        const currentMonthTracks = getTracks(now);
        const prevMonthSpendTime = (prevMonthTracks || []).reduce((a, b) => a * 1 + (b.sum || 0) * 1, 0)
        const currentMonthSpendTime = (currentMonthTracks || []).reduce((a, b) => a * 1 + (b.sum || 0) * 1, 0)
        return [{
            month: monthsNameUk[prevMonth.month().value() - 1],
            days: getDays(prevMonth),
            track: ` (${prevMonthSpendTime} / ${beData.prevMonthWorkingHours})`,
            tracks: prevMonthTracks
        }, {
            month: monthsNameUk[now.month().value() - 1] ,
            days: getDays(now),
            track: ` (${currentMonthSpendTime} / ${beData.currentMonthWorkingHours})`,
            tracks: currentMonthTracks
        }];
    }

    function getDays(now) {
        const format = DateTimeFormatter.ofPattern('d').withLocale(JSJodaLocale.Locale.ENGLISH);
        const startDayOfWeek = LocalDate.of(now.year(), now.month(), 1).dayOfWeek().value();
        const endDayOfWeek = LocalDate.of(now.year(), now.month(), now.lengthOfMonth()).dayOfWeek().value();
        const days = [[]];
        let row = 0
        for (let i = 1; i < startDayOfWeek; i++) {
            days[row].push({
                weekday: i,
                empty: true
            });
        }

        const beData = getBEData();
        const tracks = beData.data['timeTracksByDay'];
        const weekends = beData.data['weekends'];
        this.debugData = "";// JSON.stringify(weekends);
        for (let i = 1; i <= now.lengthOfMonth(); i++) {

            const date = LocalDate.of(now.year(), now.month(), i);
            const dateString = date.toString();
            const shortDate = date.format(format) + ' ' + monthsUk[date.month().value() - 1];
            const weekday = date.dayOfWeek().value()
            if (weekday === 1) {
                row = row + 1;
                days[row] = [];
            }
            const isWeekend = weekends ? weekends[dateString] : false;
            days[row].push({
                weekday: date.dayOfWeek().value(),
                date: dateString,
                shortDate: shortDate,
                empty: false,
                trackedTime: tracks && tracks[dateString] ? tracks[dateString] : (isWeekend ? '\xa0' : 0),
                isWeekend: isWeekend
            });
        }
        for (let i = endDayOfWeek + 1; i <= 7; i++) {
            days[row].push({
                weekday: i,
                empty: true
            });
        }
        return days;
    }

    function getBEData() {
        return {data: beData};
    }
}

// ==================================


function update(json, success, errorCallback) {
    $.ajax({
        url: baseUrl + "/update?access_token=" + access_token,
        method: "POST",
        data: json,
        success: function(response) {
            success();
        },
        error: function(error){
            console.log(error);
            errorCallback();
        }
    });

}


function initView(data) {
    let appViewModel = new AppViewModel(data);
    console.log(appViewModel);
    ko.applyBindings(appViewModel);
    Telegram.WebApp.ready();
    return appViewModel;
}

function init() {
    $.ajax({
        url: baseUrl + "/timetrack?access_token=" + access_token,
    }).done(function (data) {
        console.log(data);
        initView(data)
    });
}

init();
