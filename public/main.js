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
    })
});

function re() {
    setTimeout(function() {
        location.reload();
    }, 2000);
}