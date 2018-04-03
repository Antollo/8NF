//var mongodb = require('mongodb');
//var MongoClient = mongodb.MongoClient;
//var url = process.env.MONGOLAB_URI;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var cheerio = require('cheerio')
var $ = cheerio.load('');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: true });
var port = process.env.PORT || 3000;

var films = [];
read();

var line = `
<tr>
    <td class="mdl-data-table__cell--non-numeric"></td>
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

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    fs.readFile(__dirname + '/public/main.html', 'utf8', function(err, data) {
        if (err) throw err;
        $ = cheerio.load(data);
        films.sort(function(b, a){return Object.keys(a.votes).length - Object.keys(b.votes).length});
        films.forEach(function(film) {
            var newFilm = $(line);
            newFilm.children().eq(0).text(film.title);
            newFilm.children().eq(1).text(Object.keys(film.votes).length);
            newFilm.children().eq(2).children().attr('onclick', 'location.href="' + film.link + '";');
            newFilm.children().eq(3).children().attr('onclick', '$.post("vote", {title: "' + film.title + '", fingerprint: key}, function(data, status){ $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({message: data});});re()');
            $('#table').append(newFilm);
        });
        data = '<html>' + $('html').html() + '</html>'
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        res.end();
    });
});

app.get('/base', function (req, res) {
    fs.readFile('base.txt', function (err, data) {
        if (err) throw err;
        res.send(data)
        console.log('Done');
    });
});

app.post('/add', urlencodedParser, function (req, res) {
    var film = {
        title: $("<div>").html(req.body.title).text(),
        link: $("<div>").html(req.body.link).text(),
        votes: {}
    };
    films.push(film);
    res.send('Dodawanie udało się.');
    console.log(films);
    save();
});

app.post('/vote', urlencodedParser, function (req, res) {
    var result = films.filter(function(film) {
        return film.title == $("<div>").html(req.body.title).text();
    });
    result.forEach(function(film) {
        film.votes[$("<div>").html(req.body.fingerprint).text()] = 1;
    })
    res.send('Głosowanie udało się.');
    console.log(films);
    console.log($("<div>").html(req.body.fingerprint).text());
    save();
});

var server = app.listen(port, function () {
});

function save() {
    fs.writeFile('base.txt', JSON.stringify(films), function (err) {
        if (err) throw err;
        console.log('Done');
    });
}

function read() {
    fs.readFile('base.txt', function (err, data) {
        if (err) throw err;
        films = JSON.parse(data);
        console.log('Done');
    });
}