var key;
$(document).ready(function () {
    setTimeout(function () {
        if(window['canRunAds'] === undefined) 
        {
            $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({message: 'Wyłącz adblock\'a i odśwież stronę. Adblock blokuje skrypty niezbędne do identyfikacji użytkownika.', actionHandler: function(event) {location.reload();}, actionText: 'Odśwież', timeout: 60000});
        } else {
            $('#loading-screen').hide();
            $('#main-screen').show();
            if(Cookies.get('session') == 'active') {
                $('#info-card').hide();
                $('#new-card').hide();
                $('#ranking-card').show();
                $('#chart-card').show();
                new Fingerprint2().get(function(result, components) {
                    key = result;
                })
                startChart();
            }
        }
    }, 200);

    $('#agree-button').click(function() {
        $('#info-card').hide();
        $('#new-card').hide();
        $('#ranking-card').show();
        $('#chart-card').show();
        Cookies.set('session','active');
        startChart();
    });

    $('#floating').click(function() {
        $('#info-card').hide();
        $('#new-card').show();
        $('#ranking-card').hide();
    });

    $('#add').click(function() {
        if($("<div>").html($('#title').val()).text().length !=0 && $("<div>").html($('#link').val()).text().length != 0 && $("<div>").html($('#link').val()).text().indexOf('http') != -1 && !$('#link').parent().hasClass('is-invalid'))
        {
            $.post("add",
            {
                title: $('#title').val(),
                link: $('#link').val()
            },
            function(data, status){
                $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({message: data});
                re()
            });
        } else {
            $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({message: 'Tytuł jest pusty lub link nieprawidłowy.'});
        }
    });

    $('#back').click(function() {
        $('#info-card').hide();
        $('#new-card').hide();
        $('#ranking-card').show();
    });

    console.log(`
"Ty pojedziesz w daleką, nieznajomą drogę;
Będziesz w wielkich, bogatych i rozumnych tłumie,
Szukaj męża, co więcej niźli oni umie;
Poznasz, bo cię powita pierwszy w Imię Boże.
Słuchaj, co powie…"
    Adam Mickiewicz "Dziady", część III
    `);
});

function re() {
    $('#loading-screen').show();
    $('#main-screen').hide();
    setTimeout(function() {
        location.reload();
    }, 2500);
}

function startChart() {
    //Draw  top 10 chart
    google.charts.load('current', {'packages':['bar']});
    google.charts.setOnLoadCallback(drawChart);
    function drawChart() {
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Tytuł');
        data.addColumn('number', 'Głosy');
        $.each($("#table > tr"), function(key, value) {
            if (key < 10) data.addRow([$(value).children(':nth-child(1)').text(), parseInt($(value).children(':nth-child(2)').text())]);
        })
        var options = {
            chart: {},
            bars: 'horizontal',
            legend: {position: 'none'},
            colors: ['rgb(233,30,99)']
        };
        var chart = new google.charts.Bar(document.getElementById('chart-div'));
        chart.draw(data, google.charts.Bar.convertOptions(options));
    }
}