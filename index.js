var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = process.env.BASE;

var express = require('express');
var app = express();
var https = require('https');
var http = require('http').Server(app);
var fs = require('fs');
var cheerio = require('cheerio')
var $ = cheerio.load('');
var svgCaptcha = require('svg-captcha');
svgCaptcha.options.width = 240;
svgCaptcha.options.height = 60;
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
        pass: process.env.BASE.substring(20, 32)
    }
});

var codeToVote = new Map();
var captchaToValue = new Map();
var ratingCache = new Map();

var responseHTML;
fs.readFile(__dirname + '/res.html', 'utf8', function (err, data) {
    if (err) throw err;
    responseHTML = data;
    console.log('res.html loaded');
});

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/main.html');
});

app.get('/captcha', function (req, res) {
    var captcha = svgCaptcha.create({ size: 8, ignoreChars: 'O0o1il', noise: 0 });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ svg: captcha.data, hash: hash(captcha.data).toString() }));
    captchaToValue.set(hash(captcha.data).toString(), captcha.text);
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
                    votesCount: { $size: '$votes' }
                }
            },
            { $sort: { votesCount: -1 } },
            { $limit: 100 }
        ]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        var first = true;
        res.write('[');
        cursor.on("data", function (data) {
            if (first) {
                res.write(JSON.stringify(data));
                first = false;
            }
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
    if (film.title.length > 64) {
        film.title = film.title.substring(0, 64) + '...';
    }
    if (typeof req.body.title == 'string' && typeof req.body.link == 'string'
        && typeof req.body.hash == 'string' && typeof req.body.value == 'string'
        && req.body.hash.length && req.body.value.length) {

        if (captchaToValue.get(req.body.hash) != req.body.value.replace(/\s/g, '')) {
            res.send('Błąd w przepisanych znakach');
            console.log('rejected');
        }
        else MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db('noc-filmowa');
            dbo.collection('films').findOne({ title: film.title }, function (err, result) {
                if (err) throw err;
                if (result) {
                    db.close();
                    res.send('Już dodano ten film');
                    console.log('rejected');
                } else {
                    dbo.collection('films').insertOne(film);
                    db.close();
                    res.send('Dodawanie udało się');
                    console.log('added');
                }
            });
        });
    } else {
        res.send('Błędne zapytanie');
        console.log('rejected');
        /*console.log(typeof req.body.title == 'string');
        console.log(typeof req.body.link == 'string');
        console.log(typeof req.body.hash == 'string');
        console.log(typeof req.body.value == 'string');
        console.log(req.body.hash.length);
        console.log(req.body.value.length);*/
    }
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

app.post('/rating', urlencodedParser, function (req, res) {
    var str = '';
    if (ratingCache.get(req.body.url)) res.send(ratingCache.get(req.body.url));
    else https.get(req.body.url, function (response) {
        response.on('data', function (chunk) { str += chunk; });
        response.on('end', function () {
            $ = cheerio.load(str);
            var rating = $('[itemprop="ratingValue"]').text().trim().replace('.', ',');
            ratingCache.set(req.body.url, rating);
            res.send(rating);
        });
    })

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