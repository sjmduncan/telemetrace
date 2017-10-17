function LapToText(lap){
//FIXME: This one uglay LapToText
    function Zeropad(n, w, z) {
	z = z || '0'; n = n + '';
	return n.length >= w
	    ? n
	    : new Array(w - n.length + 1).join(z) + n;
    }

    var begin=lap[0]
    var finish=lap[lap.length-1]

    var lapTimeSec=(1*finish.Time-1*begin.Time)
    var lapDate=new Date(1*begin.Utc)

    var dateString
	=(lapDate.getFullYear()-2000)+"-"
	+Zeropad(lapDate.getMonth(), 2)+'-'+
	Zeropad(lapDate.getDate(),2)+"  "+
	Zeropad(lapDate.getHours(),2)+":"+
	Zeropad(lapDate.getMinutes(),2)
    
    var timeString
	=Zeropad(Math.floor(lapTimeSec/60), 2)+":" /// Minutes
	+(lapTimeSec%60).toFixed(3)    /// Seconds (3dp)
    return [dateString,timeString]
}

function MakeLapSelector(numActive,SelectCallback,UnselectCallback){
    var lapList=d3.select("#laps")

    var traces = new Array(numActive).fill(null)
    

    function LapClickHandler(){
	if(traces.indexOf(this.id) >= 0){
	    // Unselect if the lap is currently selected
	    Unselect(this.id)
	}else if(traces.indexOf(null) >= 0 ){
	    // Select the lap, lowest indices (starting with the
	    // 'datum' lap at 0) are filled first
	    var ind=traces.indexOf(null)
	    Select(ind, this.id)
	}else{
	    // If all possible traces are selected, then move the one
	    // with the highest index
	    var ind=traces.length-1
	    Unselect(traces[ind])
	    Select(ind, this.id)
	}
    }

    function RemoveClickedLap(){
	Unselect(this.id)
	lapList.select('#'+this.id).remove()
    }
    
    function AddLap(lap, id){
	var descriptor=LapToText(lap,id)
	var entry=lapList.append('div')
	    .attr('id',id)
	    .attr('class', 'lapentry')
	    .on('click', LapClickHandler)
	    .on('contextmenu', RemoveClickedLap)
	entry.append('div').attr('class', 'lapentry lapleft')
	    .text(descriptor[0])
	entry.append('div').attr('class', 'lapentry lapright')
	    .text(descriptor[1])
    }

    function RemoveAllLaps(){
	UnselectAll()
	traces.fill(null)
	lapList.selectAll('.lapentry').remove();
    }
    function UnselectAll()
    {
	traces.forEach(function(t){
	    Unselect(t)
	})
    }
    function Select(ind, id){
	lapList.select('#'+id)
	    .attr('class', 'lapentry trace'+ind)
	traces[ind]=id
	SelectCallback(id, ind)
    }
    function Unselect(id){
	lapList.select('#'+id)
	    .attr('class', 'lapentry')
	var i =traces.indexOf(id) 
	d3.select(".tipitem#trace"+i).text('')
	traces[i]=null
	UnselectCallback(id)
    }
    return {
	'Add':AddLap,
	'RemoveAll':RemoveAllLaps,
	'Unselect': Unselect,
	'UnselectAll':UnselectAll,
	'Traces':traces}
}
