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

    function getMonths() {
        let now = LocalDate.now();
        let prevMonth = now.minusMonths(1);
        const beData = getBEData().data;
        return [{
            month: monthsNameUk[prevMonth.month().value() - 1],
            days: getDays(prevMonth),
            track: ` (${beData.prevMonthSpendTime} / ${beData.prevMonthWorkingHours})`
        }, {
            month: monthsNameUk[now.month().value() - 1] ,
            days: getDays(now),
            track: ` (${beData.currentMonthSpendTime} / ${beData.currentMonthWorkingHours})`
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
                trackedTime: tracks && tracks[dateString] ? tracks[dateString] : (isWeekend ? '' : 0),
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
    ko.applyBindings(appViewModel);
    Telegram.WebApp.ready();
}

const urlParams = new URLSearchParams(window.location.search);
const access_token = urlParams.get('access_token');
$.ajax({
    url: "hhttps://us-central1-silicon-keel-290919.cloudfunctions.net/timetrack?access_token=" + access_token,
}).done(function( data ) {
    console.log(data);
    initView(data)
});

