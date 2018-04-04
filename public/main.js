var key;
$(document).ready(function () {
    setTimeout(function () {
        if(Cookies.get('session') == 'active') {
            $('#info-card').hide();
            $('#new-card').hide();
            $('#ranking-card').show();
            new Fingerprint2().get(function(result, components) {
                key = result;
            })
        }
    }, 50);

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
        if($("<div>").html($('#title').val()).text().length !=0 && $("<div>").html($('#link').val()).text().length != 0 && $("<div>").html($('#link').val()).text().indexOf('http') != -1)
        {
            $('#info-card').hide();
            $('#new-card').hide();
            $('#ranking-card').show();
            $.post("add",
            {
                title: $('#title').val(),
                link: $('#link').val()
            },
            function(data, status){
                $('.mdl-js-snackbar')[0].MaterialSnackbar.showSnackbar({message: data});
                re()
            });
        }
    });

    $('#back').click(function() {
        $('#info-card').hide();
        $('#new-card').hide();
        $('#ranking-card').show();
    });
});

function re() {
    setTimeout(function() {
        location.reload();
    }, 2000);
}