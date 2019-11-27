var mongodb = require('mongodb')
var MongoClient = mongodb.MongoClient
var url = process.env.BASE

var express = require('express')
var app = express()
var https = require('https')
var fs = require('fs')
var cheerio = require('cheerio')
var $ = cheerio.load('')
var svgCaptcha = require('svg-captcha')
var crypto = require('crypto')
svgCaptcha.options.width = 240
svgCaptcha.options.height = 60
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: true })
var port = process.env.PORT || 3000

var collectionName = 'films2019'

var nodemailer = require('nodemailer')
var botMailAddress = 'lenezjastankoska@gmail.com'

var appAddress
if (process.env.PORT)
    appAddress = 'https://noc-filmowa.herokuapp.com/'
else
    appAddress = 'http://localhost:3000/'

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: botMailAddress,
        pass: process.env.BASE.substring(20, 32)
    }
})

var codeToVote = new Map()
var captchaToValue = new Map()
var ratingCache = new Map()

var responseHTML
fs.readFile(__dirname + '/res.html', 'utf8', function (err, data) {
    if (err) throw err
    responseHTML = data
    console.log('res.html loaded')
})

app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/main.html')
})

app.get('/captcha', function (req, res) {
    var captcha = svgCaptcha.create({ size: 6, ignoreChars: 'O0o1il', noise: 0 })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    var h = hash(captcha.data)
    res.end(JSON.stringify({ svg: captcha.data, hash: h }))
    captchaToValue.set(h, captcha.text)
})

app.get('/base', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err
        var dbo = db.db('noc-filmowa')
        var cursor = dbo.collection(collectionName).aggregate([
            {
                $project: {
                    title: 1,
                    link: 1,
                    votesCount: { $size: '$votes' }
                }
            },
            { $sort: { votesCount: -1 } },
            { $limit: 100 }
        ])
        res.writeHead(200, { 'Content-Type': 'application/json' })
        var first = true
        res.write('[')
        cursor.on("data", function (data) {
            if (first) {
                res.write(JSON.stringify(data))
                first = false
            }
            else res.write(',\n' + JSON.stringify(data))
        })
        cursor.on("end", function () {
            db.close()
            res.write(']')
            res.end()
        })
    })
})


app.post('/add', urlencodedParser, function (req, res) {
    if (typeof req.body.title == 'string' && typeof req.body.link == 'string'
        && typeof req.body.hash == 'string' && typeof req.body.value == 'string'
        && req.body.hash.length && req.body.value.length) {
        var film = {
            title: $("<div>").html(req.body.title).text(),
            link: $("<div>").html(req.body.link).text().replace('"', '').replace(';', ''),
            votes: []
        }
        if (film.title.length > 64) {
            film.title = film.title.substring(0, 64) + '...'
        }


        if (captchaToValue.get(req.body.hash) != req.body.value.replace(/\s/g, '')) {
            res.send('Błąd w przepisanych znakach')
            console.log('rejected')
        }
        else MongoClient.connect(url, function (err, db) {
            if (err) throw err
            var dbo = db.db('noc-filmowa')
            dbo.collection(collectionName).findOne({ title: film.title }, function (err, result) {
                if (err) throw err
                if (result) {
                    db.close()
                    res.send('Już dodano ten film')
                    console.log('rejected')
                } else {
                    dbo.collection(collectionName).insertOne(film)
                    db.close()
                    res.send('Dodawanie udało się')
                    captchaToValue.delete(req.body.hash)
                    console.log('added')
                }
            })
        })
    } else {
        res.send('Błąd w zapytaniu')
        console.log('rejected')
    }
})

app.get('/validate/:key', function (req, res) {
    //if (typeof req.params.key == 'number') {
    if(!codeToVote.has(req.params.key)) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie nie udało się - link jest nieaktywny.'))
        res.end()
        return
    }
    var filmTitle = codeToVote.get(req.params.key).title
    var email = codeToVote.get(req.params.key).email

    console.log('Email adress (voted): ' + email + '\nTitle: ' + filmTitle)

    MongoClient.connect(url, function (err, db) {
        if (err) throw err
        var dbo = db.db('noc-filmowa')
        dbo.collection(collectionName).findOne({ title: filmTitle }, function (err, result) {
            if (err) throw err
            if (result) {
                if (result.votes.indexOf(req.params.key) == -1 & result.votes.indexOf(email) == -1) {
                    dbo.collection(collectionName).updateOne(
                        { title: filmTitle },
                        { $push: { votes: email } }
                    )
                    db.close()
                    res.writeHead(200, { 'Content-Type': 'text/html' })
                    res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie udało się.'))
                    res.end()
                } else {
                    db.close()
                    res.writeHead(200, { 'Content-Type': 'text/html' })
                    res.write(responseHTML.replace('Wystąpił błąd.', 'Już na to głosowałaś/głosowałeś!'))
                    res.end()
                }
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.write(responseHTML.replace('Wystąpił błąd.', 'Głosowanie nie udało się - nie odnaleziono filmu.'))
                res.end()
            }
        })
    })
    //} else {
    //    res.write(responseHTML)
    //}
})

app.post('/rating', urlencodedParser, function (req, res) {
    var str = ''
    if (typeof req.body.url === 'string' && req.body.url.match(/^https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/)) {
        if (ratingCache.get(req.body.url)) res.send(ratingCache.get(req.body.url))
        else {
            var request = https.get(req.body.url, function (response) {
                response.on('data', function (chunk) { str += chunk; })
                response.on('end', function () {
                    $ = cheerio.load(str)
                    var rating = $('[itemprop="ratingValue"]').text().trim().replace('.', ',')
                    ratingCache.set(req.body.url, rating)
                    res.send(rating)
                })
            })
            request.on('error', function (e) {
                ratingCache.set(req.body.url, '')
                res.send('')
            })
        }
    } else {
        ratingCache.set(req.body.url, '')
        res.send('')
    }

})

app.post('/vote', urlencodedParser, function (req, res) {
    if (typeof req.body.title == 'string' && typeof req.body.mail == 'string') {
        var filmTitle = $("<div>").html(req.body.title).text()
        var userMail = req.body.mail
        userMail = userMail.replace('+', '')
        if (userMail.match(/^[a-zA-Z0-9.!#$%&'*/=?^_`{|}~-]+@(wp.pl|poczta.onet.pl|o2.pl|interia.pl|tlen.pl|gmail.com|poczta.fm|gazeta.pl|go2.pl|yahoo.com|hotmail.com|vp.pl|student.put.poznan.pl)$/)) {
            var hashed = hash(filmTitle + userMail)
            transporter.sendMail(
                {
                    from: botMailAddress,
                    to: userMail,
                    subject: 'Potwierdzenie głosu na film',
                    html: 'Hej!<br>Jestem botem odpowiedzialnym za głosowanko na filmy, które będą na nocce. Żeby potwierdzić swój głos kliknij tutaj: '
                        + '<a href="' + appAddress + 'validate/' + hashed + '">' + appAddress + 'validate/'
                        + hashed + '</a><br>Link już jest aktywny będzie ważny przez pół godziny więc lepiej się pospiesz.<br>Do zobaczenia na nocy!'
                }, function (err, info) {
                    if (err) throw err
                    console.log('Email adress (sent): ' + userMail + '\nBody: ' + info.response)
                })
            setTimeout(function () {
                codeToVote.set(hashed, { title: filmTitle, email: userMail })
                res.send('Wysłano mail z linkiem do potwierdzenia')
            }, 1000 * 2)
            setTimeout(function () {
                codeToVote.delete(hashed)
            }, 1000 * 60 * 30)
        } else {
            res.send('Twój adres mailowy jest niepoprawny')
        }
    } else {
        res.send('Błąd w zapytaniu')
    }
})

var server = app.listen(port, function () {
})

function hash(str) {
    return crypto.createHash('md5').update(str).digest('hex') + Math.random().toString(36).substring(2, 15);
}