function MakeDiffer(numActive, trace,getSelectedToggle){
    // THis only does diffs. For doing RPM/Brake/Throttle use a
    // different thing
    var traces = new Array(numActive).fill(null)
    var key
    
    function Update(lap, id, ind, lapType){
	key=getSelectedToggle()
	traces[ind]=id
	if(traces[0] == null){

	}//Can't diff against nothing
	else{
	    ReDrawTraces()
	}

    }

    function ReDrawTraces(){
	traces.forEach(function(t){
	    if(t != null){
		var k=key
		if(key == 'Speed' || key == 'Seconds'){
		    lapDiffGeo(laps[traces[0]],
			       laps[t],
			       key)
		    k='Diff'
		}else if(key == 'BrakePressTPS'){
		    TPSBrakeDiff(laps[t])
		    k='Diff'
		}
		trace.AddTrace(
		    laps[t],t,
		    {'x':'Distance','y':k},
		    'trace trace'+traces.indexOf(t))
	    }
	})
    }
    function UpdateToggle(){
	key=getSelectedToggle()
	traces.forEach(function(t){
	    trace.RemoveTrace(t)})
	ReDrawTraces()
    }
    function Clear(id){
	ind=traces.indexOf(id)
	trace.RemoveTrace(id)
	traces[ind]=null
	if(ind == 0){
	    traces.slice(1).forEach(function(t){
		trace.RemoveTrace(t)
	    })
	}
    }
    return {
	'AddTrace'   : Update,
	'UpdateToggle': UpdateToggle,
	'RemoveTrace'    : Clear}
}

