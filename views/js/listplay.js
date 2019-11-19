var tracks = [];
var access_token;
$(document).ready(function() {
	$.ajax({
		url: '/get_token',
	}).done(function(data) {
		access_token = data.access_token;
	});
	$.ajax({
		url: '/connect_db',
	});
});

var submitSpotify = function(e) {
	var uri = $("#spotify_url").val().split(':');
	var id = uri[uri.length - 1];
	var getUrl = 'https://api.spotify.com/v1/playlists/' + id;
	
	$.ajax({
		url: getUrl,
		headers: {
			'Authorization': 'Bearer ' + access_token
		},
		success: function(response) {
			var trackInfo = response['tracks']['items'];
			for (i = 0; i < trackInfo.length; i++) {
			  var track = trackInfo[i]['track'];
			  tracks.push({songTitle: track['name'], artist: track['artists'][0]['name'], album: track['album']['name'], duration: roundMs(track['duration_ms'])});
			}

			$.ajax({
				type: 'POST',
				url: '/get_playlist',
				dataType: "html",
				contentType: "application/json; charset=utf-8",
				data: JSON.stringify({'tracks': tracks})
			}).done(function(data) {
				$('html').html(data)
			})
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
		$('html').html(data);
	});
}

var submitPlaylist = function() {
	var trackList = tableToJson();
	$.ajax({
		type: "POST",
		url: "/submit_playlist",
		dataType: "html",
		contentType: "application/json; charset=utf-8",
		data: trackList,
	}).done(function(data) {
		$('html').html(data);
	});
};

var tableToJson = function() {
	var tracks = [];
	$("#playlisttable tbody tr").each(function (i, n) {
		var $row = $(n);
		if ($row.find('td input').length) {
			if ($row.find('td input:placeholder-shown').length) {
				// input row is not filled out, skip this row
				return false;
			} 
			// input row IS filled out - add it!
			tracks.push({
				songTitle: $row.find('td:eq(0) input').val(),
				artist: $row.find('td:eq(1) input').val(),
				album: $row.find('td:eq(2) input').val(),
				duration: $row.find('td:eq(3) input').val(),
			});
		} else {
			// normal row
			tracks.push({
				songTitle: $row.find('td:eq(0)').text(),
				artist: $row.find('td:eq(1)').text(),
				album: $row.find('td:eq(2)').text(),
				duration: $row.find('td:eq(3)').text(),
			});
		}
	});
	console.log(tracks);
	return JSON.stringify(tracks);
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