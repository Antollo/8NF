var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = process.env.BASE;

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

var codeToVote = new Map();

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

        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db('noc-filmowa');
            var cursor = dbo.collection('films').aggregate([
                {
                    $project: {
                        title: 1,
                        link: 1,
                        votes: 1,
                        votesCount: { $size: '$votes' }
                    }
                },
                { $sort: { votesCount: -1 } },
                { $limit: 500 }
            ]);
            cursor.on("data", function (data) {
                var newFilm = $(lineHTML);
                newFilm.children().eq(0).html('<div class="inner">' + data.title + '</div>');
                newFilm.children().eq(1).text(Object.keys(data.votes).length);
                newFilm.children().eq(2).children().attr('onclick', 'location.href="' + data.link + '";');
                newFilm.children().eq(3).children().attr('onclick', '$.post("vote", {title: "' + data.title + '", mail: mail}, function(data, status){ $(".mdl-js-snackbar")[0].MaterialSnackbar.showSnackbar({message: data});});');
                $('#table').append(newFilm);
            });
            cursor.on("end", function () {
                db.close();
                data = '<html>' + $('html').html() + '</html>'
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(data);
                res.end();
            });
        });
    });
});

app.get('/base', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db('noc-filmowa');
        var cursor = dbo.collection('films').aggregate([
            {
                $project: {
                    title: 1,
                    link: 1,
                    votes: 1,
                    votesCount: { $size: '$votes' }
                }
            },
            { $sort: { votesCount: -1 } },
            { $limit: 500 }
        ]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        var first = true;
        cursor.on("data", function (data) {
            if (first) res.write('[' + JSON.stringify(data));
            else res.write(',\n' + JSON.stringify(data));
        });
        cursor.on("end", function () {
            db.close();
            res.write(']');
            res.end();
        });
    });
});


app.post('/add', urlencodedParser, function (req, res) {
    var film = {
        title: $("<div>").html(req.body.title).text(),
        link: $("<div>").html(req.body.link).text().replace('"', '').replace(';', ''),
        votes: []
    };
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db('noc-filmowa');
        dbo.collection('films').findOne({ title: film.title }, function (err, result) {
            if (err) throw err;
            if (result) {
                db.close();
                res.send('Już dodano ten film');
            } else {
                dbo.collection('films').insertOne(film);
                db.close();
                res.send('Dodawanie udało się');
            }
        });
    });
});

app.get('/validate/:key', function (req, res) {
    var filmTitle = codeToVote.get(req.params.key);

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db('noc-filmowa');
        dbo.collection('films').findOne({ title: filmTitle }, function (err, result) {
            if (err) throw err;
            if (result) {
                if (result.votes.indexOf(req.params.key) == -1) {
                    dbo.collection('films').updateOne(
                        { title: filmTitle },
                        { $push: { votes: req.params.key } }
                    );
                    db.close();
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie udało się.'));
                    res.end();
                } else {
                    db.close();
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(responseHTML.replace('Wystąpił błąd.', 'Już na to głosowałaś/głosowałeś!'));
                    res.end();
                }
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie nie udało się - nie odnaleziono filmu.'));
                res.end();
            }
        });
    });
});

app.post('/vote', urlencodedParser, function (req, res) {
    var filmTitle = $("<div>").html(req.body.title).text();
    var userMail = req.body.mail;
    if (userMail.match(/^[a-zA-Z0-9.!#$%&'*/=?^_`{|}~-]+@(hotmail.com|gmail.com)$/)) {
        var hashed = hash(filmTitle + userMail);
        transporter.sendMail(
            {
                from: botMailAddress,
                to: userMail,
                subject: 'Potwierdzenie głosu na film',
                html: 'Hej!<br>Jestem botem odpowiedzialnym za głosowanko na filmy, które będą na nocce. Żeby potwierdzić swój głos kliknij tutaj: '
                    + '<a href="' + appAddress + 'validate/' + hashed.toString() + '">' + appAddress + 'validate/'
                    + hashed.toString() + '</a><br>Link jest ważny przez pół godziny więc lepiej się pospiesz.<br>Do zobaczenia na nocy!'
            }, function (err, info) {
                if (err) throw err;
                else console.log('Email sent: ' + info.response);
            });
        res.send('Wysłano mail z linkiem do potwierdzenia');
        codeToVote.set(hashed.toString(), filmTitle);
        setTimeout(function () {
            codeToVote.delete(hashed);
        }, 1000 * 60 * 30);
    } else {
        res.send('Twój adres mailowy jest niepoprawny');
    }
});

var server = app.listen(port, function () {
});

function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return h;
}