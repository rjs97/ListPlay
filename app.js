const express = require('express');
const cors = require('cors');
const request = require('request');
const mysql = require('mysql');
const bodyParser = require('body-parser');

var client_id = '128c266cc87942f5bb758c0e3c98830b'; // Your client id
var client_secret = 'xxx'; // Your secret

const app = express();

app.use(express.static(__dirname + '/public'))
	.use(cors())
	.use(bodyParser.json());

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

	var existsStatement = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'listplay' AND table_name = 'tracks';";

	connection.query(existsStatement, function(err, rows, fields) {
		if (err) throw err;
		var exists = rows[0]['COUNT(*)'];
		if (!exists) {
			var create = "CREATE TABLE `ListPlay`.`tracks` (`Title` VARCHAR(100) NOT NULL, `Artist` VARCHAR(100) NOT NULL, `Album` VARCHAR(100) NOT NULL,`Duration` VARCHAR(5) NOT NULL);"
			connection.query(create, function(err, rows, fields) {
				if (err) throw err;
				connection.end();
			})
		}
	})
})

app.post('/submit_playlist', function(req, res) {
	var connection = connectDb();
	connection.connect();

	console.log(req.body.insert);
	var insert = req.body.insert;
	for (i = 0; i < insert.length; i++) {
		connection.query(insert[i], function(err, rows, fields) {
			if (err) throw err;
		});
	}
	getTopArtists(connection, res);

})

app.get('/get_top_artists', function(req, res) {
	var connection = connectDb();
	connection.connect();
	getTopArtists(connection, res);
})

var connectDb = function() {
	return mysql.createConnection({
		host: 'localhost',
		user: 'dbuser',
		password: 'dbuserdbuser',
		database: 'ListPlay'
	});
}

var getTopArtists = function(connection, res) {
	connection.query("SELECT artist FROM listplay.tracks GROUP BY artist ORDER BY COUNT(artist) DESC LIMIT 5;", function(err, rows, fields) {
		if (err) throw err;
		console.log(rows);
		res.send({'gimme_data': rows})
		connection.end();
	})
}

console.log('listening on port 8888');
app.listen(8888);
