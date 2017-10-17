function getNearestTrack(pt, oldTrack){
    function dist(track, la, lo){
	return Math.abs(1*track.Latitude-la)
	    +Math.abs(1*track.Longitude-lo)
    }
    var tracks=JSON.parse(fs.readFileSync('tracks.json', 'utf-8'))
    var mind=dist(tracks[0], pt.Latitude, pt.Longitude)
    var track=tracks[0]
    for(var t in tracks){
	var d=dist(tracks[t], pt.Latitude, pt.Longitude)
	if(mind > d){
	    mind=d
	    track=tracks[t]
	}
    }

    if(mind > 1/60){
	alert('No known tracks nearby. Approx location for data:\n'
	      + pt.Latitude + ',' + pt.Longitude)
	return undefined
    }else if(oldTrack == undefined){
	    return track
    }else if(oldTrack.name != track.name){
	alert('Session started for ' + oldTrack.name
	      + '.\nSelected file was recorded at '  + track.name
	      + '.\nClear the session before loading data from a different track')
	return undefined
    }else{
	return track
    }
}


