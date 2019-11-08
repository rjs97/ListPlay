var tracks = [];
var access_token;
$(document).ready(function() {
	$("#playlistDisplay").hide();
	$("#topArtist").hide();
	document.getElementById('parse_url').addEventListener('click', submitSpotify);
	$.ajax({
		url: '/get_token',
	}).done(function(data) {
		access_token = data.access_token;
	});
	$.ajax({
		url: '/connect_db',
	});
});

var submitSpotify = function() {
	var uri = $("#spotify_url").val().split(':');
	var id = uri[uri.length - 1];
	var getUrl = 'https://api.spotify.com/v1/playlists/' + id;
	
	$.ajax({
		url: getUrl,
		headers: {
			'Authorization': 'Bearer ' + access_token
		},
		success: function(response) {
			$("#topArtist").hide();
			$("#playlistDisplay").empty();
			$("#playlistDisplay").show();
			var playlistTableSource = $("#playlist-table-template").html();
			var playlistTableTemplate = Handlebars.compile(playlistTableSource);
			
			tracks = [];
			var trackInfo = response['tracks']['items'];
			for (i = 0; i < trackInfo.length; i++) {
			  var track = trackInfo[i]['track'];
			  tracks.push({songTitle: track['name'], artist: track['artists'][0]['name'], album: track['album']['name'], duration: roundMs(track['duration_ms'])});
			}

			var context = {tracks}; // format properly for handlebars
			var playlistTableCompiled = playlistTableTemplate(context);
			$("#playlistDisplay").html(playlistTableCompiled);
		}
	});

	var roundMs = function(ms) {
		var ms = 1000*Math.round(ms/1000); // round to nearest second
		var date = new Date(ms);
		var seconds = date.getUTCSeconds();
		return (date.getUTCMinutes() + ":" + (seconds < 10 ?  "0" + seconds : seconds));
	}
};

var getTopArtists = function() {
	$.ajax({
		type: "GET",
		url: "/get_top_artists",
	}).done(function(data) {
		showTopArtists(data);
	});
}

var submitPlaylist = function() {
	var insertStrings = [];
	for (i = 0; i < tracks.length; i++) {
		var insert = `INSERT INTO Tracks (Title, Artist, Album, Duration) VALUES ("${tracks[i]['songTitle']}", "${tracks[i]['artist']}", "${tracks[i]['album']}", 
		"${tracks[i]['duration']}")`;
		insertStrings.push(insert);
	}

	$.ajax({
		type: "POST",
		url: "/submit_playlist",
		dataType: "json",
		contentType: "application/json; charset=utf-8",
		data: JSON.stringify({'insert': insertStrings}),
	}).done(function(data) {
		showTopArtists(data);
	});
};

var showTopArtists = function(data) {
	$("#playlistDisplay").hide();
	$("#topArtist").empty();
	$("#topArtist").show();
	var topArtistSource = $("#top-artist-template").html();
	var topArtistTemplate = Handlebars.compile(topArtistSource);
	var topArtists = data['gimme_data'];
	var topArtistsCompiled = topArtistTemplate({topArtists: topArtists});
	console.log({artist: topArtists});
	$("#topArtist").html(topArtistsCompiled);
	console.log(topArtists)

}