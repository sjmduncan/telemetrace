// A bunch of data mangling things

function ParseFile(rawText, fileExt){
    var parsers={
	'.log':AutoSportLabsParser,
	'.vbo':RaceLogicParser,
	'.csv':TelemetraceParser
    }
    return parsers[fileExt](rawText)
    
}

function TelemetraceParser(raw){
	var dsv=d3.dsvFormat(',')

    raw=raw.replace("KMH", "Speed")
    raw=raw.replace("Lat", "Latitude")
    raw=raw.replace("Lon", "Longitude")
    raw=raw.replace("a1", "BrakePress")
    raw=raw.replace("a2", "TPS")
    raw=raw.replace("Seconds","Time")
    function makeDist(data, i){
	if(i==0){
	    return 0
	}
	var dt=(data[i].Time-data[i-1].Time) // in seconds
	var v =0.2777778*(data[i].Speed+data[i-1].Speed)/2 // in meters/sec

	return data[i-1].Distance + dt * v
    }


    var data=dsv.parse(raw)

    Numberify(data)
    
    for(var i = 0; i< data.length; i++){
	data[i]['Distance'] = makeDist(data, i)
    }

    return data
}

function RaceLogicParser(raw){
	// The data is space-delimited
	var dsv=d3.dsvFormat(' ')
	
	// The trace data is located in the [data] section with abritray headers in the lines
	// before it
	var cleanSplit=raw.split('[data]')
	// THe first line of the file is the date/time of the session.
    var datime=cleanSplit[0].split('\n')[0].split(' ')
    datime.splice(0,3)
    datime.splice(1,1)
    var startTime=Date.parse(datime[0] + ' '+ datime[1])
	var hdr = cleanSplit[0].split('[column names]')[1].split('\n')[1]
	
    // Rename some of the columns to make the JSON keys consistent with RaceCapture
    
    hdr=hdr.replace('velocity', 'Speed')
	hdr=hdr.replace('time', 'Interval')


	// Mangle the header+data together and parse it!
    var clean=hdr+cleanSplit[1]
	var data=dsv.parse(clean)
	
    // For some reason the first row is always empty. Remove it.
	data.splice(0,1)
	
	// Convert string to number
    Numberify(data)

    // Logging is 10Hz, but sometimes there are jumps. This corrects
    // that and doesn't seem to introduce errors
    var tOffset=0
    function TimeTravel(data, i){
		var dt = data[i].Interval - data[i-1].Interval - tOffset
		if(dt > 0.15)
		{
			tOffset += dt - 0.1
		}
		return data[i].Interval - tOffset
    }

    // There is no distance data, so we gotta ham it up by using speed
    // and time. FIXME: Use GPS coords instead
    function makeDist(data, i){
		var dt=(data[i].Interval-data[i-1].Interval) // in seconds
		var v =0.2777778*(data[i].Speed+data[i-1].Speed)/2 // in meters/sec
		if(dt == 0)
			return data[i-1].Distance
		else
			return data[i-1].Distance + dt * v
    }
    data.forEach(function(d){
		var di=data.indexOf(d)

		// The old datalogger gives lat/lon in minutes, need to convert back to degrees
		d.Latitude = d['lat']/60
		d.Longitude = -d['long']/60 // Also longitude is flipped

		if(di > 0)
			d.Interval = TimeTravel(data, di)
		d.Utc = d.Interval*1000
		d.BrakePress=0


		if(di == 0)
			d.Distance = 0
		else
			d.Distance=makeDist(data, di)

	})
	
    OffsetSeries(data, 'Utc', startTime) // Unix offset time

    ScaleSeries(data, 'RPM', 1/100)      // tens of RPM to thousands of RPM
    OffsetSeries(data, 'TPS', -0.525)	 // Throttle position was badly calibrated FIXME: Detect offest 
	ScaleSeries(data, 'TPS', 100/4.5)	 // Throttle position was badly calibrated FIXME: Detect range
	 
    return data
}

function AutoSportLabsParser(raw){
    // Strip the units & max/min/incr values from the header so that D3 can understand the file
    var header=""
    var h=raw.substring(0,raw.indexOf('\n'))
    var ha=h.split(',')
    ha.forEach(function(he){
		header+=he.substr(0, he.indexOf('|')) + ',' })
	header=header.replace(' ', '')
    var clean=header+raw.substring(raw.indexOf('\n'))

    // Parse the data, remove the first row because it's pretty much always just a bunch
    // of empty entries
    var data=d3.csvParse(clean)
    data.splice(0,1)
	Numberify(data)	
    // GPS data is undersampled, remove rows without GPS data
    // FIXME: Sensor Fusion!
    for(var i=data.length-1; i>=0; i--){
	    if(data[i].Longitude == 0)
	        data.splice(i,1)
	}
	
    CleanDiscontinuities(data)
    FakeUpsample(data, ['TPS', 'BrakePress', 'RPM'])
    ScaleSeries(data, 'RPM', 1/1000) // RPM to kRPM
    ScaleSeries(data, 'Speed', 1.609344) // MPH to KMH
    ScaleSeries(data, 'Interval', 1/1000) // Miliseconds to seconds
    ScaleSeries(data, 'Distance', (1000/1.609344)) // Miles to meters
    //SmoothDistance(data)
    return data
}

// Distance data sometimes resets part of the way through a
// session. This corrects that.
function CleanDiscontinuities(rawData){
    var offset=0;
    var i=0;
    var lastD=1*rawData[0].Distance
    for(i=0;i<rawData.length;i++){
	var dif=1*rawData[i].Distance-lastD
	if(dif<-0.01)
	{
	    offset=offset+lastD
	}
	lastD=rawData[i].Distance*1
	rawData[i].Distance=1*rawData[i].Distance + offset
    }
}

function splitLapsPerp(data, track, startLaps){
        function dist(pt){
	return Math.abs(1*pt.Latitude-track.Latitude)
	    +Math.abs(1*pt.Longitude - track.Longitude)
    }
    function dot(p1, p2){
	return p1[0]*p2[0]+p1[1]*p2[1]
    }
    function vec(p, o){
	return [p[0]-o[0],p[1]-o[1]]
    }
    function newo(old){
	return JSON.parse(JSON.stringify(old))
    }
    var i,thresh=0.00045,near=false
    var numLaps=startLaps,intervalStart=1*data[0].Time,distanceStart=1*data[0].Distance
    var laps={},lap=[],n=3,c=0,lastDot
    for(i=0;i<data.length;i++){
	var d=dist(data[i])
	if(d<thresh && c > 200){
	    // Vec from current pt to start-finish
	    var v1 = vec([data[i].Latitude,data[i].Longitude],
			 [track.Latitude,track.Longitude])
	    // Vec along track 
	    var v2 = vec([data[i].Latitude,data[i].Longitude],
			 [data[i-n].Latitude,data[i-n].Longitude])
	    // Proportional to cosine of angle between v1,v2. When this
	    // is minimum then close to 90 deg, and the vehicle is on
	    // the start/finish line
	    var dotP = dot(v1, v2)
	    
	    if(dotP > lastDot){
		    laps['lap'+numLaps]=(lap)
		    numLaps++;

		lap=[]
		lap.push(newo(data[i-1]))
		
		intervalStart=1*data[i].Time
		distanceStart=1*data[i].Distance
		c=0
	    }
	    lastDot=dotP
	}
	c++

	// FIXME: Why does this break everything?
	// data[i].Distance=1*data[i].Distance-1*distanceStart
	lap.push(data[i])
    }

    // If the last lap is long enough then append it to the list. This
    // might be wrong because the data acquisition usually doesn't
    // stop until you're nearly in the pits
    //if(lap[lap.length-1].Distance-lap[0].Distance > sl.minLength
    //   && lap[lap.length-1].Distance-lap[0].Distance < 1.3*sl.minLength){
	laps['lap'+numLaps] = lap
    //}
    return laps        
}

function getNearestLatLon(ref, comp, iref){
    var rlat=ref[iref].Latitude
    var rlon=ref[iref].Longitude

    // Assumes lap is roughly at the same speed var
    icomp=Math.min(Math.round(iref*comp.length/ref.length), comp.length-1)

    var inearest,i2nearest
    var dnearest,d2nearest

    for(var i=0; i < srange; i++){
	var ileft =icomp-i
	var iright=icomp+i
	
	ileft = ileft < 0 ? 0 : ileft
	iright = iright > comp.length-1 ? comp.length-1 : iright
	
	var dleft = Math.abs(rlat-comp[ileft].Latitude)
	    +Math.abs(rlon-comp[ileft].Longitude)
	var dright =
	    Math.abs(rlat-comp[iright].Latitude)
	    +Math.abs(rlon-comp[iright].Longitude)

	if(dleft <= dnearest || dnearest == undefined){
	    dnearest = dleft
	    inearest = ileft
	}
	else if(dleft <= d2nearest || d2nearest == undefined){
	    d2nearest=dleft
	    i2nearest=ileft
	}


	if(dright <= dnearest || dnearest == undefined){
	    dnearest = dright
	    inearest = iright
	}else if(dright <=  d2nearest || d2nearest == undefined){
	    d2nearest=dright
	    i2nearest=iright
	}
    }
    return [[inearest, dnearest], [i2nearest, d2nearest]]    
}

//Calcualte the difference for one key between two laps, find then
//nearest matching geo position instead of going by index
function lapDiffGeo(l1, l2, ke){
    var srange=30;
    function getNearestLatLon(ref, comp, iref){
	var rlat=ref[iref].Latitude
	var rlon=ref[iref].Longitude

	// Assumes lap is roughly at the same speed var
	icomp=Math.min(Math.round(iref*comp.length/ref.length),
		       comp.length-1)

	var inearest,i2nearest
	var dnearest,d2nearest

	for(var i=0; i < srange; i++){
	    var ileft=icomp-i

	    var iright=icomp+i

	    ileft = ileft < 0 ? 0 : ileft
	    iright = iright >
	    comp.length-1 ? comp.length-1 : iright
	    
	    var dleft = Math.abs(rlat-comp[ileft].Latitude)
		+Math.abs(rlon-comp[ileft].Longitude)

	    var dright =
		Math.abs(rlat-comp[iright].Latitude)
		+Math.abs(rlon-comp[iright].Longitude)

	    if(dleft <= dnearest || dnearest == undefined){
		dnearest =
		    dleft
		inearest = ileft
	    }else if(dleft <= d2nearest ||
		     d2nearest == undefined){
		d2nearest=dleft
		i2nearest=ileft }

	    if(dright <= dnearest || dnearest == undefined){
		dnearest
		    = dright
		inearest = iright
	    }else if(dright <=
		     d2nearest || d2nearest == undefined){
		d2nearest=dright
		i2nearest=iright
		
	    } } return [[inearest, dnearest], [i2nearest, d2nearest]]
    }
    
    var i
    var res=[]
    for(i=0;i<l2.length;i++){
	var ind=getNearestLatLon(l2, l1, i)
	var dtotal=ind[0][1]+ind[1][1]
	var d =
	     ((l2[i][ke] - l1[ind[0][0]][ke])*ind[1][1]
	      +(l2[i][ke] - l1[ind[1][0]][ke])*ind[0][1])/dtotal

	l2[i]['Diff']=d
    }
    return res
}


function OffsetSeries(data, ke, offset){
    data.forEach(function(d){
	d[ke] = d[ke] + offset})
}
function ScaleSeries(data, ke, factor){
    data.forEach(function(d){
	d[ke] = factor*d[ke]})
}

function FakeUpsample(data, keys){
    function Upsample(lap, ke){
	var manlim=5
	var minsignal=5
	
	function nextNonZero(lap, i){
	    for(var x=i+1; x<lap.length; x++){
		if(Math.abs(lap[x][ke]) >= minsignal)
		    break;
		if(x-i>=manlim)
		    break;
	    }
	    if(x>=lap.length)
		x=lap.length-1
	    return x;
	}
	
	function lastNonZero(lap, i){
	    for(var x=i-1; x> 0; x--){

		if(Math.abs(lap[x][ke]) >= minsignal)
		    break;
		if(i-x>=manlim)
		    break
	    }
	    return x;
	}
	for(var i=1; i<lap.length; i++){
	    if(lap[i][ke] < minsignal){
		var next=nextNonZero(lap, i)
		var last=lastNonZero(lap, i)
		
		var toNext=next-i
		var toLast=i-last
		var dist=toNext+toLast
		
		if (toLast < manlim && toNext < manlim ){
		    lap[i][ke]=	(lap[last][ke]*toNext
				 + lap[next][ke]*toLast)/dist
		}
	    }
	}
    }
    keys.forEach(function(k){
	Upsample(data, k)})
}

function Numberify(data){
    data.forEach(function(d){
	for(var key in d){
	    if(d.hasOwnProperty(key)){
		d[key] = 1*d[key]
	    }
	}
    })
}

function MangleLapTime(lap){
    var t0=lap[0]['Utc']
    if(t0 == undefined)
	t0=lap[0]['Time']
    for(var i=0; i<lap.length; i++){
	lap[i]['Time'] = (lap[i]['Time']-t0)
    }
}

function MangleLapDist(lap){
    var d0=lap[0].Distance
    lap.forEach(function(p){
	p.Distance -= d0})
}


function SmoothDistance(d){
    function same(d1,d2){
	return d1.Distance==d2.Distance}
    var ia=0
    var ib=0
    
    for(var i=1;i<d.length;i++){
	if(!same(d[i],d[i-1])){
	    ib=i
	    var steps=ib-ia
	    var size=d[ib].Distance-d[ia].Distance
	    var step=size/steps
	    for(var j=ia+1;i<ib;i++){
		d[j].Distance=d[ia].Distance + step * (j-ia)
	    }
	    ia=i
	}
    }
}
    

function TPSBrakeDiff(lap){
    for(var i=0; i<lap.length; i++){
	if(lap[i].TPS > 0)
	    lap[i]['Diff']=lap[i].TPS
	else
	    lap[i]['Diff'] = lap[i].TPS-lap[i].BrakePress
    }
}


function CoastingDistance(lap){
    function isCoasting(p){
	return p.BrakePress < 7 && p.TPS<1}
    var cDist=0
    for(var i=1; i<lap.length; i++){
	if(isCoasting(lap[i]))
	    cDist += lap[i].Distance-lap[i-1].Distance
    }
    return cDist*1000 // Convert to meters
}
