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
</tr>`
var mail
$(document).ready(function () {
    function startTable() {
        $('#info-card').hide()
        $('#new-card').hide()
        $('#ranking-card').show()
        $('#chart-card').show()
        $('#floating').show()
        reloadData()
    }

    function reloadData() {
        if ($('#ranking-card').css('display') == 'none') return
        $('#spinner').show()
        $('#spinner > *').show()
        $('#darken').show()
        $.getJSON('base', function (data) {
            $("#table").empty()
            data.forEach(function (film) {
                var newFilm = $(lineHTML)
                newFilm.children().eq(0).html('<div class="inner">' + film.title + '</div>')
                newFilm.children().eq(1).text(film.votesCount)
                $.post('rating', { url: film.link }, function (data) {
                    newFilm.children().eq(2).text(data)
                })
                // newFilm.children().eq(2).children().attr('onclick', 'location.href="' + film.link + '";')
                newFilm.children().eq(3).children().click(function () {
                    location.href = film.link
                })
                //newFilm.children().eq(3).children().attr('onclick', '$.post("vote", {title: "' + film.title + '", mail: mail}, function(data, status){ $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({message: data});});')
                newFilm.children().eq(4).children().click(function () {
                    $.post('vote',
                        { title: film.title, mail: mail },
                        function (res, status) {
                            $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({ message: res })
                        })
                })
                $('#table').append(newFilm)
            })
            drawChart(data)
        })
    }

    function drawChart(input) {
        google.charts.load('current', { 'packages': ['bar'] })
        google.charts.setOnLoadCallback(function () {
            var data = new google.visualization.DataTable()
            data.addColumn('string', 'Tytuł')
            data.addColumn('number', 'Głosy')
            for (var i = 0; i < Math.min(10, input.length); i++) {
                data.addRow([input[i].title, input[i].votesCount])
            }
            var options = {
                chart: {},
                bars: 'horizontal',
                legend: { position: 'none' },
                colors: ['rgb(233, 30, 99)']
            }
            var chart = new google.charts.Bar(document.getElementById('chart-div'))
            chart.draw(data, google.charts.Bar.convertOptions(options))
            $('#spinner').hide()
            $('#spinner > *').hide()
            $('#darken').hide()
        })
    }

    if (Cookies.get('mail') !== undefined) {
        startTable()
        mail = Cookies.get('mail')
    }

    $.getJSON('captcha', function (data) {
        $('#captcha-img').html(data.svg)
        $('#captcha-img').attr('hash', data.hash)
    })

    setInterval(reloadData, 20000)

    $('#agree-button').click(function () {
        if ($('#mail').val().length > 0 && !$('#mail').parent().hasClass('is-invalid')) {
            startTable()
            Cookies.set('mail', $('#mail').val())
            mail = $('#mail').val()
            $('#main-screen').scrollTop(0)
        } else {
            $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({ message: 'Nie podałeś adresu mailowego lub jest nieprawidłowy' })
        }
    })

    $('#floating').click(function () {
        $('#info-card').hide()
        $('#new-card').show()
        $('#ranking-card').hide()
        $('#chart-card').hide()
        $('#main-screen').scrollTop(0)
    })

    $('#add').click(function () {
        if ($("<div>").html($('#title').val()).text().length != 0 && $("<div>").html($('#link').val()).text().length != 0 && $("<div>").html($('#link').val()).text().indexOf('http') != -1 && !$('#link').parent().hasClass('is-invalid')) {
            $.post("add",
                {
                    title: $('#title').val(),
                    link: $('#link').val(),
                    hash: $('#captcha-img').attr('hash'),
                    value: $('#captcha').val()
                },
                function (data, status) {
                    $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({ message: data })
                    if (data == 'Dodawanie udało się') {
                        $('#back').click()
                    }
                    $.getJSON('captcha', function (data) {
                        $('#captcha-img').html(data.svg)
                        $('#captcha-img').attr('hash', data.hash)
                    })
                })
        } else {
            $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({ message: 'Tytuł jest pusty lub link nieprawidłowy' })
        }
    })

    $('#back').click(function () {
        $('#info-card').hide()
        $('#new-card').hide()
        $('#ranking-card').show()
        $('#chart-card').show()
        $('#title').val('')
        $('#title').parent().removeClass('is-dirty')
        $('#link').val('')
        $('#link').parent().removeClass('is-dirty')
        $('#link').parent().removeClass('is-invalid')
        $('#captcha').val('')
        $('#captcha').parent().removeClass('is-dirty')
        reloadData()
    })

    $('.reload').click(function () {
        reloadData()
    })

    /*$('#easter-egg').click(function () {

        const rules = document.styleSheets[0].cssRules
        for (let i = 0; i<rules.length; i++) {
            if ('style' in rules[i]) for (let property in rules[i].style) {
                if (rules[i].style[property] == 'rgb(19, 79, 92)')
                rules[i].style[property] = 'rgb(233, 30, 99)'
            }
        }
        document.styleSheets[0].insertRule('path { fill: rgb(233, 30, 99) !important; }', 0)
        $('img[src="logo8NF.png"]').css({'filter': 'none'})
    })*/

    $('#easter-egg').click(function () {
        var heart = $(this)
        var fontSize = parseFloat(heart.css('font-size'))


        fontSize = Math.min(fontSize * 1.2, 300)

        if(fontSize == 300)
        {
            $(this).stop().animate({
                fontSize: 14
            }, {
                duration: 800,
                specialEasing: { width: 'linear' }, complete: function () {
                    heart.show()
                }
            })
        } else {


        $(this).stop().animate({
            fontSize: fontSize
        }, {
            duration: 400,
            specialEasing: { width: 'linear' }, complete: function () {
                heart.show()
            }
        })
    }


    })
})