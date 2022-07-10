function AppViewModel(beData) {
    const self = this;
    const LocalDate = JSJoda.LocalDate;
    const DateTimeFormatter = JSJoda.DateTimeFormatter;
    const monthsUk = ['Cіч.', 'Лют.', 'Бер.', 'Квіт.', 'Трав.', 'Черв.', 'Лип.', 'Серп.', 'Вер.', 'Жовт.', 'Лист.', 'Груд.'];
    const monthsNameUk = ['Cічень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

    this.calendarMode = ko.observable(true);
    this.months = getMonths();
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
    }
    this.closeEditHours = function() {
        self.saveInProgress(false);
        self.editMode(false);
        $('html,body').animate({scrollTop: self.scrollPosition}, 10);
    }
    this.updateTrackTime = function() {
        console.log(self.trackHours());
        self.saveInProgress(true);
    }

    // ================================

    this.editorOrders = getBEData().data.orders;
    this.openEditOrders = function(context) {
        self.saveInProgress(false);
        self.scrollPosition = document.documentElement.scrollTop;
        self.editMode(true);
        self.editType('orders');
        self.trackHours("");
        $('#order-select').formSelect();
    }
    this.closeEditOrders = function() {
        self.saveInProgress(false);
        self.editMode(false);
        $('html,body').animate({scrollTop: self.scrollPosition}, 10);
    }
    this.updateOrders = function() {
        console.log(self.trackHours());
        self.saveInProgress(true);
    }

    // ================================

    this.moveToDay = function(context) {
        setTimeout(function() {
            self.calendarMode(false);
            let offset = $('#DAY_' + context.date).offset();
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
                    sum: timeTracksByDay[day]
                });
            }
        }
        return tracks;
    }

    function getMonths() {
        let now = LocalDate.now();
        let prevMonth = now.minusMonths(1);
        const beData = getBEData().data;
        return [{
            month: monthsNameUk[prevMonth.month().value() - 1],
            days: getDays(prevMonth),
            track: ` (${beData.prevMonthSpendTime} / ${beData.prevMonthWorkingHours})`,
            tracks: getTracks(prevMonth)
        }, {
            month: monthsNameUk[now.month().value() - 1] ,
            days: getDays(now),
            track: ` (${beData.currentMonthSpendTime} / ${beData.currentMonthWorkingHours})`,
            tracks: getTracks(now)
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

function initView(data) {
    let appViewModel = new AppViewModel(data);
    console.log(appViewModel);
    ko.applyBindings(appViewModel);
    Telegram.WebApp.ready();
}

const urlParams = new URLSearchParams(window.location.search);
const access_token = urlParams.get('access_token');
$.ajax({
    url: "https://us-central1-silicon-keel-290919.cloudfunctions.net/timetrack?access_token=" + access_token,
}).done(function( data ) {
    console.log(data);
    initView(data)
});

