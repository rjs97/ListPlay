const express = require('express');
const cors = require('cors');
const request = require('request');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const hbs = require('express-handlebars');

var client_id = '128c266cc87942f5bb758c0e3c98830b'; // Your client id
var client_secret = 'xxx'; // Your secret
var tracks = []; // temporary track list

var app = express();

app.engine('hbs', hbs({
	extname: 'hbs',
	defaultLayout: 'main',
	layoutsDir: __dirname + '/views/layouts/',
	partialsDir: __dirname + '/views/partials'
}));

app.set('view engine', 'hbs');

app.use(express.static(__dirname + '/views'))
	.use(cors())
	.use(bodyParser.urlencoded({extended : true}))
	.use(bodyParser.json())
	.use(session({
		secret: 'secret',
		resave: true,
		saveUninitialized: true
	}));

app.get('/', function(req, res) {
	if (req.session.loggedin) {
		res.render('index', {user: req.session.username});
	} else {
		res.render('index');
	}	
})

app.get('/login_page', function(req, res) {
	res.render('login');
})

app.get('/get_token', function(req, res) {
	var authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
		form: {
  			grant_type: 'client_credentials'
		},
		json: true
	};

	request.post(authOptions, function(error, response, body) {
		if (!error && response.statusCode === 200) {
		  var access_token = body.access_token;
		  res.send({
		  	'access_token': access_token
		  });
		}
	});
});

app.get('/connect_db', function(req, res) {
	var connection = connectDb();
	connection.connect();

	var create = "CREATE TABLE IF NOT EXISTS `ListPlay`.`tracks` (`Title` VARCHAR(100) NOT NULL, `Artist` VARCHAR(100) NOT NULL, `Album` VARCHAR(100) NOT NULL,`Duration` VARCHAR(5) NOT NULL, `DJ_Name` VARCHAR(12) NOT NULL);";

	connection.query(create, function(err, rows, fields) {
		if (err) throw err;
		connection.end();
	})
})

app.post('/login', function(req, res) {
	var connection = connectDb();
	console.log(req.body);
	var username = req.body.username;
	var password = req.body.password;
	if (username && password) {
		var checkLogin = `SELECT * FROM listplay.accounts WHERE username="${username}" AND password="${password}"`;
		console.log(checkLogin);
		connection.query(checkLogin, function(err, rows, fields) {
			if (rows.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/');
			} else {
				res.render('login', {error: "Invalid username/password"});
			}
		});
	} else {
		res.render('login', {error: "Please re-enter Username and Password"});
	}
})

app.post('/register', function(req, res) {
	// add error checking for existing DJs
	// hash passwords
	var connection = connectDb();
	connection.connect();
	console.log(req.body);
	var username = req.body.username;
	var password = req.body.password;
	if (username && password) {
		var maxId;
		connection.query("SELECT MAX(id) FROM listplay.accounts", function(err, rows, fields) {
			if (err) throw err;
			maxId = rows[0]['MAX(id)'] + 1;
			var register = `INSERT INTO listplay.accounts (id, username, password) VALUES ("${maxId}", "${username}", "${password}")`;
			console.log(register);
			connection.query(register, function(err, rows, fields) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/');
			});
		});
	} else {
		res.render('login', {error: "Please re-enter Username and Password"});
	}
})

app.post('/get_playlist', function(req, res) {
	tracks = req.body.tracks;
	console.log("get_playlist: ", tracks);
	res.render('playlisttable', {trackList: tracks});
})

app.post('/submit_playlist', function(req, res) {
	var connection = connectDb();
	connection.connect();

	var djName = "anonymous dj";
	if (req.session.loggedin) {
		djName = req.session.username;
	}

	var trackList = req.body;
	console.log("submit_playlist: ", trackList);
	for (i = 0; i < trackList.length; i++) {
		var insert = `INSERT INTO listplay.tracks (Title, Artist, Album, Duration, DJ_Name) VALUES ("${trackList[i]['songTitle']}", "${trackList[i]['artist']}", "${trackList[i]['album']}", 
		"${trackList[i]['duration']}", "${djName}")`;
		connection.query(insert, function(err, rows, fields) {
			if (err) throw err;
		});
	}
	res.redirect('/get_top_artists');
})

app.get('/get_top_artists', function(req, res) {
	var connection = connectDb();
	connection.connect();
	connection.query("SELECT artist FROM listplay.tracks GROUP BY artist ORDER BY COUNT(artist) DESC LIMIT 5;", function(err, rows, fields) {
		if (err) throw err;
		console.log("top artists", rows);
		res.render('topartists', {topArtists: rows})
		connection.end();
	})
})

var connectDb = function() {
	return mysql.createConnection({
		host: 'localhost',
		user: 'dbuser',
		password: 'dbuserdbuser',
		database: 'ListPlay'
	});
}

console.log('listening on port 8888');
app.listen(8888);
