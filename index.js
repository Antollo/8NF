var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = process.env.BASE;
console.log();

var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var cheerio = require('cheerio')
var $ = cheerio.load('');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: true });
var port = process.env.PORT || 3000;

var nodemailer = require('nodemailer');
var botMailAddress = 'lenezjastankoska@gmail.com';
var appAddress = 'https://noc-filmowa.herokuapp.com/';
//var appAddress = 'http://localhost:3000/';

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: botMailAddress,
        pass: process.env.BASE.substring(19, 31)
    }
});

var films = [];
var codeToVote = new Map();
read();

var lineHTML, responseHTML;
fs.readFile(__dirname + '/line.html', 'utf8', function (err, data) {
    if (err) throw err;
    lineHTML = data;
    console.log('row.html loaded');
});
fs.readFile(__dirname + '/res.html', 'utf8', function (err, data) {
    if (err) throw err;
    responseHTML = data;
    console.log('res.html loaded');
});

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    fs.readFile(__dirname + '/public/main.html', 'utf8', function (err, data) {
        if (err) throw err;
        $ = cheerio.load(data);
        films.sort(function (b, a) { return Object.keys(a.votes).length - Object.keys(b.votes).length });
        films.forEach(function (film) {
            var newFilm = $(lineHTML);
            newFilm.children().eq(0).html('<div class="inner">' + film.title + '</div>');
            newFilm.children().eq(1).text(Object.keys(film.votes).length);
            newFilm.children().eq(2).children().attr('onclick', 'location.href="' + film.link + '";');
            newFilm.children().eq(3).children().attr('onclick', '$.post("vote", {title: "' + film.title + '", mail: mail}, function(data, status){ $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({message: data});});');
            $('#table').append(newFilm);
        });
        data = '<html>' + $('html').html() + '</html>'
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        res.end();
    });
});

app.get('/base', function (req, res) {
    res.send(films);
});


app.post('/add', urlencodedParser, function (req, res) {
    var film = {
        title: $("<div>").html(req.body.title).text(),
        link: $("<div>").html(req.body.link).text().replace('"', '').replace(';', ''),
        votes: {}
    };
    films.push(film);
    res.send('Dodawanie udało się');
    save();
});

app.get('/validate/:key', function (req, res) {
    var filmTitle = codeToVote.get(req.params.key);
    console.log(filmTitle);
    var result = films.filter(function (film) {
        return film.title === filmTitle;
    });
    result.forEach(function (film) {
        if (film.votes[req.params.key] === undefined) {
            film.votes[req.params.key] = 1;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie udało się.'));
            res.end();
            save();
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(responseHTML.replace('Wystąpił błąd.', 'Już na to głosowałaś/głosowałeś!'));
            res.end();
        }
    });
    if(result.length == 0) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie nie udało się.'));
            res.end();
    }
});

app.post('/vote', urlencodedParser, function (req, res) {
    var filmTitle = $("<div>").html(req.body.title).text();
    var userMail = req.body.mail;
    if (userMail.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(hotmail.com|gmail.com)$/)) {
        var hashed = hash(filmTitle+userMail);
        transporter.sendMail(
        {
            from: botMailAddress,
            to: userMail,
            subject: 'Potwierdzenie głosu na film',
            html: 'Hej!<br>Jestem botem odpowiedzialnym za głosowanko na filmy, które będą na nocce. Żeby potwierdzić swój głos kliknij tutaj: '
            + '<a href="' + appAddress + 'validate/' + hashed.toString() + '">' + appAddress + 'validate/'
            + hashed.toString() + '</a><br>Link jest ważny przez pół godziny więc lepiej się pospiesz.<br>Do zobaczenia na nocy!'
        }, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        res.send('Wysłano mail z linkiem do potwierdzenia');
        codeToVote.set(hashed.toString(), filmTitle);
        setTimeout(function () {
            codeToVote.delete(hashed);
        }, 1000*60*30);
    } else {
        res.send('Twój adres mailowy jest niepoprawny');
    }
});

var server = app.listen(port, function () {
});

function save() {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("noc-filmowa");
        dbo.collection("table").updateOne({}, { $set: { table: films } }, function (err, res) {
            if (err) throw err;
            console.log("1 document updated");
            db.close();
        });
    });
    //fs.writeFile('base.txt', JSON.stringify(films), function (err) {
    //    if (err) throw err;
    //    console.log('Done');
    //});
}

function read() {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("noc-filmowa");
        dbo.collection("table").findOne({}, function (err, result) {
            if (err) throw err;
            films = result.table;
            db.close();
        });
    });
    //fs.readFile('base.txt', function (err, data) {
    //    if (err) throw err;
    //    films = JSON.parse(data);
    //    console.log('Done');
    //});
}

function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return h;
};