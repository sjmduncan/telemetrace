// Two points to define the start-finish line in geographic coordinates
var tracks={
    'ruapuna':{
	'lon1': 172.479,
	'lon2': 172.1784,
	'lat1': -43.5291,
	'lat2': -43.5295,
	'lat': -43.52925,
	'lon': 172.47865,
	'Latitude': -43.530578,
	'Longitude': 172.480927,
	'minLength': 1.9,
	'x': 'Longitude',
	'y': 'Latitude',
	'invy' : -1,
	'invx' : -1,
	'name': 'Ruapuna'
    },
    'levels':{
	'lon1': 171.205,
	'lon2': 171.203,
	'lat1': -44.294,
	'lat2': -44.2936,
	'lat': -44.2938,
	'lon': 171.204,
	'Latitude': -44.296486,
	'Longitude': 171.202669,
	'minLength': 1.2,
	'y': 'Longitude',
	'x': 'Latitude',
	'invy' : 1,
	'invx' : -1,
	'name': 'Levels'
    }
}


function getNearestTrack(pt){
    function dist(track, la, lo){
	return Math.abs(1*track.lat-la)
	    +Math.abs(1*track.lon-lo)
    }
    var mind=dist(tracks.ruapuna, pt.Latitude, pt.Longitude)
    var track=tracks.ruapuna
    for(var tID in tracks){
	if(tracks.hasOwnProperty(tID)){
	    var d=dist(tracks[tID], pt.Latitude, pt.Longitude)
	    if(mind > d){
		mind=d
		track=tracks[tID]
	    }
	}
    }
    return track
}


