var remote = require('electron').remote;
var fs = remote.require('fs');
var dialog = remote.dialog;

function loadCSV(fileName){
    d3.text(fileName, function(rawData){
	// Clean the CSV header & load the data
	var fileExt=fileName.substr(fileName.lastIndexOf('.'))
	var newdata=ParseFile(rawData, fileExt)
	
	// Find the nearest track to the data. If there isn't one 
	track = getNearestTrack(newdata[0], track)
	if(track == undefined){  return }

	var nLaps = CountProps(laps)
	var newlaps=splitLapsPerp(newdata, track, nLaps)
	
	
	// Process the laps a little bit
	ForProps(newlaps, function(l){
	    // Make lap distances start at zero, the 'Mangle' part
	    // refers to the data not having meaningful units
	    MangleLapDist(l[0])
	    // Fix interval to start at zero for each lap
	    MangleLapTime(l[0])
	    // Add a descriptor for this lap to the UI
	    lapUI.Add(l[0],l[1])
	    // Add it to the list of all laps
	    laps[l[1]]=l[0]
	})
	
    });
}

function browse(){
    dialog.showOpenDialog((fileNames) =>{
	if(fileNames != undefined){
	    loadCSV(fileNames[0])}})
}

function clearTraces(){
    lapUI.UnselectAll();
    MapTrace.Clear()
    SpeedTrace.VertLine(0,'none')
    DiffTrace.VertLine(0,'none')
    zoom([0,1])
    xp=undefined
}

function clearSession(){
    clearTraces()
    laps={}
    track=undefined
    lapUI.RemoveAll()
}


function unselectLap(lapid){
    SpeedTrace.RemoveTrace(lapid)
    diffUI.RemoveTrace(lapid)
    UpdateTips()
}

function selectlaps(lapid, ind){
    SpeedTrace.AddTrace(
	laps[lapid],lapid,
	{'x': 'Distance', 'y': 'Speed'},
	'trace trace'+ind)

    if(ind == 0)
	MapTrace.DrawTrace(laps[lapid], lapid, 'trace trace0',
			   track)
    
    diffUI.AddTrace(laps[lapid],lapid,ind,'trace trace'+ind)
    UpdateTips()
}

function selecttoggle(key){
}


function SignedFixed(s,n){
    if(s>=0)
	return '+'+s.toFixed(n)
    else
	return s.toFixed(n)
}
function GetIndDistPercent(lapid, percentage){
    var l = laps[lapid]
    var d=l[l.length-1].Distance*percentage
    var i
    for(i=0; i< l.length; i++)
	if(l[i].Distance >= d)
	    break
    return i
}

function UpdateTips(){
    if(xp==undefined)
	return
    var tind=0
    var rSpeed,rTime
    lapUI.Traces.forEach(function(f){
	if(f == null){
	    d3.select('.tipitem#trace'+tind).text('')
	}else if(tind==0)
	{
	    var i= GetIndDistPercent(f, xp)
	    d3.select('.tipitem#trace'+tind)
		.text(
		    laps[f][i].Speed.toFixed(1) + 'km/h | ' +
			Math.floor(laps[f][i].Time/60) + ':' +
			(laps[f][i].Time%60).toFixed(3) + " | " +
			(laps[f][i].Distance).toFixed(1) + "m"
		)
	    rSpeed=laps[f][i].Speed
	    rTime=laps[f][i].Time
	}else{
	    var tstr=''
	    if(rSpeed != undefined){
		var i= GetIndDistPercent(f, xp)
		var lSpeed=laps[f][i].Speed-rSpeed
		var lTime=laps[f][i].Time-rTime
		tstr=SignedFixed(lSpeed,1) + 'km/h | ' + 
		    SignedFixed(lTime,3)  +'s'
		
	    }
	    d3.select('.tipitem#trace'+tind)
		.text(tstr)
	}
	tind++
    })
}


function zoom(z){
    // Glue to make all traces zoom appropriately
    SpeedTrace.Zoom(z)
    DiffTrace.Zoom(z)
}
var xp

function traceClicked(x, xpercent){
    var lapid=lapUI.Traces[0]
    var r = GetIndDistPercent(lapid, xpercent)
    xp=xpercent
    UpdateTips()
    MapTrace.Circle(r)
    SpeedTrace.VertLine(x)
    DiffTrace.VertLine(x)
}



var controls=d3.select("#buttons")
controls.append('img')
	.on('click', clearSession)
	.attr('src', 'icons/ic_clear_48px.svg')
	.style('margin-right', 'auto')
controls.append('img')
	.on('click', clearTraces)
	.attr('src', 'icons/ic_undo_48px.svg')
controls.append('img')
	.on("click", browse)
	.attr('src', 'icons/ic_add_box_48px.svg')

var configure=JSON.parse(fs.readFileSync('config.json', 'utf-8'))	

var laps={}
var track

var lapUI = MakeLapSelector(configure.NumTracesToCompare, selectlaps, unselectLap)
var SpeedTrace=MakeTrace('#speedTrace','speed-trace', traceClicked, zoom)
var DiffTrace=MakeTrace('#diffTrace','diff-trace', traceClicked, zoom)
var MapTrace=MakeMapTrace('#mapTrace','map-trace','trace',{'y':false,'x':false},true)
var togUI = MakeToggles(selecttoggle)
var diffUI = MakeDiffer(configure.NumTracesToCompare, DiffTrace, togUI.Selected)
togUI.SetCallback(diffUI.UpdateToggle)

var ind=0
lapUI.Traces.forEach(function(t){
    d3.select("#tips").append('button')
	.attr('class', 'tipitem trace'+ind)
	.attr('id', 'trace'+ind)
	.style('width', (100/lapUI.Traces.length)+'%')
	.text("")
    ind++
})

