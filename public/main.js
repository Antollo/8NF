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
                new Fingerprint2().get(function(result, components) {
                    key = result;
                })
            }
        }
    }, 200);

    $('#agree-button').click(function() {
        $('#info-card').hide();
        $('#new-card').hide();
        $('#ranking-card').show();
        Cookies.set('session','active');
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
});

function re() {
    $('#loading-screen').show();
    $('#main-screen').hide();
    setTimeout(function() {
        location.reload();
    }, 2500);
}