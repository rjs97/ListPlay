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
var cnx = null;

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
	cnx = connectDb();
	cnx.query("SELECT artist FROM listplay.tracks GROUP BY artist ORDER BY COUNT(artist) DESC LIMIT 5;", function(err, rows, fields) {
		if (err) throw err;
		console.log("top artists", rows);
		if (req.session.loggedin) {
			res.render('topartists', {user: req.session.username, topArtists: rows});
		} else {
			res.render('topartists', {topArtists: rows});
		}
	});
})

app.get('/test', function(req, res) {
	cnx = connectDb();
	var map = new Object();
	var q = `SELECT Title, Artist, Album, Duration, Name from listplay.tracks where DJ_Name='djaya'`;
	cnx.query(q, function(err, rows, fields) {
		// console.log(rows);
		for (i = 0; i < rows.length; i++) {
			var name = rows[i].Name;
			if (map.hasOwnProperty(name)) {
				var songs = map[name];
				songs.push(rows[i]);
			} else {
				map[name] = new Array(rows[i]);
			}
		}
		res.render('profile', {user: 'DJAYA', object: map});
	})
});

app.get('/login_page', function(req, res) {
	res.render('login');
})

app.get('/prompt_login', function(req, res) {
	res.render('prompt_login');
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

app.post('/login', function(req, res) {
	console.log(req.body);
	var username = req.body.username;
	var password = req.body.password;
	if (username && password) {
		var checkLogin = `SELECT * FROM listplay.accounts WHERE username="${username}" AND password="${password}"`;
		console.log(checkLogin);
		cnx.query(checkLogin, function(err, rows, fields) {
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
	console.log(req.body);
	var username = req.body.username;
	var password = req.body.password;
	if (username && password) {
		var register = `INSERT INTO listplay.accounts (username, password) VALUES ("${username}", "${password}")`;
		console.log(register);
		cnx.query(register, function(err, rows, fields) {
			req.session.loggedin = true;
			req.session.username = username;
			res.redirect('/');
		});
	} else {
		res.render('login', {error: "Please re-enter Username and Password"});
	}
})

app.get('/profile', function(req, res) {
	var username = req.session.username;
	cnx = connectDb();
	var map = new Object();
	var q = `SELECT Title, Artist, Album, Duration, Name from listplay.tracks where DJ_Name='${username}'`;
	cnx.query(q, function(err, rows, fields) {
		// console.log(rows);
		for (i = 0; i < rows.length; i++) {
			var name = rows[i].Name;
			if (map.hasOwnProperty(name)) {
				var songs = map[name];
				songs.push(rows[i]);
			} else {
				map[name] = new Array(rows[i]);
			}
		}
		res.render('profile', {user: username, object: map});
	})
})

app.post('/get_playlist', function(req, res) {
	tracks = req.body.tracks;
	console.log("get_playlist: ", tracks);
	if (req.session.loggedin) {
		res.render('playlisttable', {user: req.session.username, trackList: tracks});
	} else {
		res.render('playlisttable', {trackList: tracks});
	}
})

app.post('/submit_playlist', function(req, res) {
	var cnx = connectDb();
	if (req.session.loggedin) {
		var djName = req.session.username;
		var trackList = JSON.parse(req.body.trackList);
		var name = req.body.date;
		console.log("submit_playlist: ", trackList);
		for (i = 0; i < trackList.length; i++) {
			var insert = `INSERT INTO listplay.tracks (Title, Artist, Album, Duration, DJ_Name, Name) VALUES ("${trackList[i]['songTitle']}", "${trackList[i]['artist']}", "${trackList[i]['album']}", 
			"${trackList[i]['duration']}", "${djName}", "${name}")`;
			cnx.query(insert, function(err, rows, fields) {
				if (err) throw err;
			});
		}
		res.redirect('/profile');
	} else {
		// make this cleaner later
		res.render('login', {error: "Please log in to submit a playlist"});
	}
})

var connectDb = function() {
	var cnx = mysql.createConnection({
		host: 'localhost',
		user: 'dbuser',
		password: 'dbuserdbuser',
		database: 'ListPlay'
	});
	var create_tracks = "CREATE TABLE IF NOT EXISTS `ListPlay`.`tracks` (`Title` VARCHAR(100) NOT NULL, `Artist` VARCHAR(100) NOT NULL, `Album` VARCHAR(100) NOT NULL,`Duration` VARCHAR(5) NOT NULL, `DJ_Name` VARCHAR(12) NOT NULL, `Name` VARCHAR(34) NOT NULL);";
	var create_accounts = "CREATE TABLE IF NOT EXISTS `ListPlay`.`accounts` (`username` varchar(50) NOT NULL,`password` varchar(255) NOT NULL, PRIMARY KEY (`username`));";

	cnx.query(create_tracks, function(err, rows, fields) {
		if (err) throw err;
	})
	cnx.query(create_accounts, function(err, rows, fields) {
		if (err) throw err;
	})
	return cnx;
}

console.log('listening on port 8888');
app.listen(8888);
