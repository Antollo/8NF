var lineHTML = `<tr>
<td class="mdl-data-table__cell--non-numeric"></td>
<td></td>
<td></td>
<td class="mdl-data-table__cell--non-numeric">
    <button class="mdl-button mdl-js-button mdl-button--icon">
        <i class="material-icons">language</i>
    </button>
</td>
<td class="mdl-data-table__cell--non-numeric">
    <button class="mdl-button mdl-js-button mdl-button--icon mdl-button--colored">
        <i class="material-icons">thumb_up</i>
    </button>
</td>
</tr>`;
var mail;
$(document).ready(function () {
    function startTable() {
        $('#info-card').hide();
        $('#new-card').hide();
        $('#ranking-card').show();
        $('#chart-card').show();
        $('#floating').show();
        reloadData();
    }

    function reloadData() {
        if ($('#ranking-card').css('display') == 'none') return;
        $('#spinner').show();
        $('#spinner > *').show();
        $('#darken').show();
        $.getJSON('base', function (data) {
            $("#table").empty();
            data.forEach(function (film) {
                var newFilm = $(lineHTML);
                newFilm.children().eq(0).html('<div class="inner">' + film.title + '</div>');
                newFilm.children().eq(1).text(film.votesCount);
                $.post('rating', { url: film.link }, function (data) {
                    newFilm.children().eq(2).text(data);
                });
                // newFilm.children().eq(2).children().attr('onclick', 'location.href="' + film.link + '";');
                newFilm.children().eq(3).children().click(function () {
                    location.href = film.link;
                })
                //newFilm.children().eq(3).children().attr('onclick', '$.post("vote", {title: "' + film.title + '", mail: mail}, function(data, status){ $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({message: data});});');
                newFilm.children().eq(4).children().click(function () {
                    $.post('vote',
                        { title: film.title, mail: mail },
                        function (res, status) {
                            $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({ message: res });
                        });
                });
                $('#table').append(newFilm);
            });
            drawChart(data);
        });
    }

    function drawChart(input) {
        google.charts.load('current', { 'packages': ['bar'] });
        google.charts.setOnLoadCallback(function () {
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'Tytuł');
            data.addColumn('number', 'Głosy');
            for (var i = 0; i < Math.min(10, input.length); i++) {
                data.addRow([input[i].title, input[i].votesCount]);
            }
            var options = {
                chart: {},
                bars: 'horizontal',
                legend: { position: 'none' },
                colors: ['rgb(233,30,99)']
            };
            var chart = new google.charts.Bar(document.getElementById('chart-div'));
            chart.draw(data, google.charts.Bar.convertOptions(options));
            $('#spinner').hide();
            $('#spinner > *').hide();
            $('#darken').hide();
        });
    }

    if (Cookies.get('mail') !== undefined) {
        startTable();
        mail = Cookies.get('mail');
    }

    $.getJSON('captcha', function (data) {
        $('#captcha-img').attr('src', data.img);
    });

    setInterval(reloadData, 20000);

    $('#agree-button').click(function () {
        if ($('#mail').val().length > 0 && !$('#mail').parent().hasClass('is-invalid')) {
            startTable();
            Cookies.set('mail', $('#mail').val());
            mail = $('#mail').val();
            $('#main-screen').scrollTop(0);
        }
    });

    $('#floating').click(function () {
        $('#info-card').hide();
        $('#new-card').show();
        $('#ranking-card').hide();
        $('#chart-card').hide();
        $('#main-screen').scrollTop(0);
    });

    $('#add').click(function () {
        if ($("<div>").html($('#title').val()).text().length != 0 && $("<div>").html($('#link').val()).text().length != 0 && $("<div>").html($('#link').val()).text().indexOf('http') != -1 && !$('#link').parent().hasClass('is-invalid')) {
            $.post("add",
                {
                    title: $('#title').val(),
                    link: $('#link').val(),
                    captcha: $('#captcha-img').attr('src'),
                    value: $('#captcha').val()
                },
                function (data, status) {
                    $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({ message: data });
                    if (data == 'Dodawanie udało się') reloadData();
                    else $.getJSON('captcha', function (data) {
                        $('#captcha-img').attr('src', data.img);
                    });
                });
        } else {
            $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({ message: 'Tytuł jest pusty lub link nieprawidłowy' });
        }
    });

    $('#back').click(function () {
        $('#info-card').hide();
        $('#new-card').hide();
        $('#ranking-card').show();
        $('#chart-card').show();
        reloadData();
    });

    $('.reload').click(function () {
        reloadData();
    })
});